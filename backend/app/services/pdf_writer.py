"""Render tailored markdown into a PDF via WeasyPrint."""
from pathlib import Path

import markdown as md_lib
from weasyprint import HTML, CSS

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
TEMPLATE_DIR = BACKEND_DIR / "assets" / "templates"


def markdown_to_pdf_bytes(markdown_text: str, title: str = "Resume") -> bytes:
    body_html = md_lib.markdown(
        markdown_text,
        extensions=["extra", "sane_lists"],
        output_format="html5",
    )

    template = (TEMPLATE_DIR / "resume.html").read_text(encoding="utf-8")
    css_text = (TEMPLATE_DIR / "resume_style.css").read_text(encoding="utf-8")

    html_doc = (
        template
        .replace("{{title}}", title)
        .replace("{{css}}", css_text)
        .replace("{{content}}", body_html)
    )

    return HTML(string=html_doc, base_url=str(TEMPLATE_DIR)).write_pdf()
