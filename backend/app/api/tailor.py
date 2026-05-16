import asyncio
import logging
import traceback

from fastapi import APIRouter, HTTPException

from ..schemas import (
    ExtractMetaRequest,
    ExtractMetaResponse,
    TailorRequest,
    TailorResponse,
)
from ..services.claude_client import (
    extract_keywords,
    extract_meta,
    read_asset,
    score_fit,
    tailor_cover,
    tailor_resume,
)

router = APIRouter(prefix="/api", tags=["tailor"])
log = logging.getLogger("uvicorn.error")

FIT_THRESHOLD = 0.4


@router.post("/tailor", response_model=TailorResponse)
async def tailor(req: TailorRequest) -> TailorResponse:
    try:
        base_resume = read_asset("base_resume.md")
        base_cover = read_asset("base_cover.md")
    except FileNotFoundError as e:
        raise HTTPException(status_code=400, detail=str(e))

    try:
        keywords, fit = await asyncio.gather(
            extract_keywords(req.job_description),
            score_fit(base_resume, req.job_description),
        )

        if fit < FIT_THRESHOLD:
            return TailorResponse(
                keywords=keywords,
                fit_score=fit,
                warning=(
                    f"Low fit score ({fit:.2f}). Tailoring skipped — review the JD or your base resume "
                    "before continuing."
                ),
            )

        (resume_md, changes_summary), cover_md = await asyncio.gather(
            tailor_resume(base_resume, req.job_description, keywords),
            tailor_cover(base_cover, req.job_description, req.company, req.job_title),
        )
    except HTTPException:
        raise
    except Exception as e:  # noqa: BLE001
        log.error("Tailor failed:\n%s", traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {e}")

    return TailorResponse(
        keywords=keywords,
        fit_score=fit,
        tailored_resume_md=resume_md,
        tailored_cover_md=cover_md,
        changes_summary=changes_summary,
    )


@router.post("/extract-meta", response_model=ExtractMetaResponse)
async def extract_meta_endpoint(req: ExtractMetaRequest) -> ExtractMetaResponse:
    try:
        data = await extract_meta(req.job_description)
    except Exception as e:  # noqa: BLE001
        log.error("extract-meta failed:\n%s", traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {e}")

    return ExtractMetaResponse(
        company=data.get("company"),
        job_title=data.get("job_title"),
        location=data.get("location"),
        salary_offered=data.get("salary_offered"),
    )
