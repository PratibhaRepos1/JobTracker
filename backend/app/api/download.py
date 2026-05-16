import re
from io import BytesIO
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Application
from ..services.docx_writer import markdown_to_docx_bytes
from ..services.template_docx_writer import markdown_to_docx_with_template

router = APIRouter(prefix="/api", tags=["download"])

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
ASSETS_DIR = BACKEND_DIR / "assets"


def _safe_filename(s: str | None) -> str:
    if not s:
        return ""
    return re.sub(r"[^A-Za-z0-9_-]+", "_", s).strip("_")


def _template_for(kind: str) -> Path | None:
    """Pick a user-supplied .docx template for resume or cover, if present."""
    candidates = [f"{kind}.docx", f"base_{kind}.docx", f"{kind}_template.docx"]
    for name in candidates:
        p = ASSETS_DIR / name
        if p.exists():
            return p
    return None


_NAME_RE = re.compile(r"^\s*#\s+(.+?)\s*$", re.MULTILINE)


def _candidate_name_from_resume() -> str:
    """Pull the candidate's name from the H1 of base_resume.md (falls back to empty)."""
    path = ASSETS_DIR / "base_resume.md"
    if not path.exists():
        return ""
    try:
        text = path.read_text(encoding="utf-8")
    except OSError:
        return ""
    m = _NAME_RE.search(text)
    return (m.group(1).strip() if m else "")


def _build_filename(app: Application, kind: str) -> str:
    name = _safe_filename(_candidate_name_from_resume())
    company = _safe_filename(app.company)
    if kind == "cover":
        # Pratibha_Jadhav_Cover_Letter_CompanyName
        parts = [name, "Cover_Letter", company]
    else:
        # Pratibha_Jadhav_CompanyName_JobTitle_resume
        parts = [name, company, _safe_filename(app.job_title), "resume"]
    return "_".join(p for p in parts if p) or f"application_{app.id}_{kind}"


@router.get("/applications/{app_id}/download")
def download_application(
    app_id: int,
    format: str = Query("docx", pattern="^(docx|pdf)$"),
    kind: str = Query("resume", pattern="^(resume|cover)$"),
    db: Session = Depends(get_db),
) -> StreamingResponse:
    app = db.query(Application).filter(Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    md = app.tailored_resume_md if kind == "resume" else app.tailored_cover_md
    if not md:
        raise HTTPException(status_code=400, detail=f"No tailored {kind} stored for this application.")

    base = _build_filename(app, kind)

    if format == "docx":
        template = _template_for(kind)
        photo = ASSETS_DIR / "profile.png" if kind == "resume" else None
        try:
            if template:
                data = markdown_to_docx_with_template(
                    md,
                    template,
                    photo_path=photo if photo and photo.exists() else None,
                    mode=kind,
                )
            else:
                data = markdown_to_docx_bytes(md)
        except Exception as e:  # noqa: BLE001
            raise HTTPException(status_code=500, detail=f"DOCX generation failed: {type(e).__name__}: {e}")
        return StreamingResponse(
            BytesIO(data),
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f'attachment; filename="{base}.docx"'},
        )

    # PDF — import lazily so the rest of the API works if WeasyPrint isn't installed
    try:
        from ..services.pdf_writer import markdown_to_pdf_bytes
    except Exception as e:  # noqa: BLE001
        raise HTTPException(
            status_code=500,
            detail=(
                "PDF rendering is unavailable. WeasyPrint and its system dependencies "
                f"(Pango/GTK) may be missing. Original error: {e}"
            ),
        )

    try:
        data = markdown_to_pdf_bytes(md, title=f"{app.company} - {app.job_title}")
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {e}")

    return StreamingResponse(
        BytesIO(data),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{base}.pdf"'},
    )
