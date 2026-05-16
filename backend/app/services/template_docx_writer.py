"""Render tailored markdown into a .docx using the user's original Word file as a template.

We load the user's resume.docx, keep its document defaults (theme fonts, page setup,
headers/footers, named styles), clear the body, and re-emit tailored content with the
same run-level formatting rules: 16pt bold centered for the name, 12pt bold for section
headers, "List Paragraph" style for bullets, justified body, etc.

This produces output visually indistinguishable from hand-edited content in the original
template, without requiring the user to mark up the docx with placeholders.
"""
from io import BytesIO
from pathlib import Path
from typing import Iterable, Optional

import mistune
from docx import Document
from docx.enum.text import WD_PARAGRAPH_ALIGNMENT
from docx.oxml.ns import qn
from docx.shared import Pt


NAME_SIZE_PT = 16        # H1 — the candidate's name
SUBTITLE_SIZE_PT = 12    # the line directly under the name
SECTION_SIZE_PT = 12     # H2 — section headers (Professional Summary, etc.)
SUBSECTION_SIZE_PT = 11  # H3 — role headers within Experience

SECTION_SPACE_BEFORE_PT = 8.0
SECTION_SPACE_AFTER_PT = 2.5
BODY_LINE_SPACING = 1.07
BODY_SPACE_AFTER_PT = 3.0


def _clear_body_keep_sectpr(doc: Document) -> None:
    """Drop everything in the body except the final sectPr (margins/page/headers)."""
    body = doc.element.body
    sectPr = body.find(qn("w:sectPr"))
    for child in list(body):
        if child is not sectPr:
            body.remove(child)


def _collect_text(children: Iterable) -> str:
    out: list[str] = []
    for tok in children:
        if tok.get("type") in {"text", "codespan"}:
            out.append(tok.get("raw", ""))
        elif "children" in tok:
            out.append(_collect_text(tok["children"]))
        elif "raw" in tok:
            out.append(tok["raw"])
    return "".join(out)


def _add_run(paragraph, text: str, *, bold: bool = False, italic: bool = False, size_pt: Optional[float] = None):
    run = paragraph.add_run(text)
    if bold:
        run.bold = True
    if italic:
        run.italic = True
    if size_pt is not None:
        run.font.size = Pt(size_pt)
    return run


def _render_inline(paragraph, children: Iterable, *, base_size_pt: Optional[float] = None) -> None:
    """Walk mistune inline tokens, adding runs while honoring **bold** / *italic*."""
    for tok in children:
        t = tok.get("type")
        if t == "text":
            _add_run(paragraph, tok.get("raw", ""), size_pt=base_size_pt)
        elif t == "strong":
            _add_run(paragraph, _collect_text(tok.get("children", [])), bold=True, size_pt=base_size_pt)
        elif t == "emphasis":
            _add_run(paragraph, _collect_text(tok.get("children", [])), italic=True, size_pt=base_size_pt)
        elif t == "codespan":
            run = _add_run(paragraph, tok.get("raw", ""), size_pt=base_size_pt)
            run.font.name = "Consolas"
        elif t == "link":
            _add_run(paragraph, _collect_text(tok.get("children", [])), size_pt=base_size_pt)
        elif t in ("linebreak", "softbreak"):
            _add_run(paragraph, " ", size_pt=base_size_pt)
        else:
            if "children" in tok:
                _render_inline(paragraph, tok["children"], base_size_pt=base_size_pt)


def _add_name(doc: Document, text: str) -> None:
    p = doc.add_paragraph()
    p.alignment = WD_PARAGRAPH_ALIGNMENT.CENTER
    p.paragraph_format.space_after = Pt(1.5)
    _add_run(p, text, bold=True, size_pt=NAME_SIZE_PT)


def _add_subtitle(doc: Document, text: str, *, is_first_under_name: bool) -> None:
    p = doc.add_paragraph()
    p.alignment = WD_PARAGRAPH_ALIGNMENT.CENTER
    p.paragraph_format.space_after = Pt(3.5 if is_first_under_name else 1.5)
    _add_run(p, text, size_pt=SUBTITLE_SIZE_PT if is_first_under_name else None)


def _add_section_heading(doc: Document, text: str) -> None:
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(SECTION_SPACE_BEFORE_PT)
    p.paragraph_format.space_after = Pt(SECTION_SPACE_AFTER_PT)
    _add_run(p, text, bold=True, size_pt=SECTION_SIZE_PT)


def _add_subsection_heading(doc: Document, text: str) -> None:
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(4.0)
    p.paragraph_format.space_after = Pt(1.0)
    _add_run(p, text, bold=True, size_pt=SUBSECTION_SIZE_PT)


def _add_body_paragraph(doc: Document, children: Iterable, *, justify: bool = True) -> None:
    p = doc.add_paragraph()
    if justify:
        p.alignment = WD_PARAGRAPH_ALIGNMENT.JUSTIFY
    p.paragraph_format.space_after = Pt(BODY_SPACE_AFTER_PT)
    p.paragraph_format.line_spacing = BODY_LINE_SPACING
    _render_inline(p, children)


def _add_bullet(doc: Document, children: Iterable, *, available_styles: set[str]) -> None:
    style_name = "List Paragraph" if "List Paragraph" in available_styles else "Normal"
    p = doc.add_paragraph(style=style_name)
    p.paragraph_format.space_after = Pt(BODY_SPACE_AFTER_PT)
    p.paragraph_format.line_spacing = BODY_LINE_SPACING
    # Prepend a bullet glyph so it reads as a list even if "List Paragraph" doesn't render numbering
    _add_run(p, "•  ")
    _render_inline(p, children)


def markdown_to_docx_with_template(markdown_text: str, template_path: Path) -> bytes:
    doc = Document(str(template_path))
    available_styles = {s.name for s in doc.styles}
    _clear_body_keep_sectpr(doc)

    md = mistune.create_markdown(renderer=None)
    tokens = md(markdown_text)

    seen_name = False
    contact_block_remaining = 0  # paragraphs immediately under the name treated as header block

    for tok in tokens:
        t = tok.get("type")

        if t == "heading":
            level = tok.get("attrs", {}).get("level", 2)
            text = _collect_text(tok.get("children", []))
            if level == 1 and not seen_name:
                _add_name(doc, text)
                seen_name = True
                contact_block_remaining = 4  # next ~3-4 short paragraphs are subtitle/contact
            elif level <= 2:
                _add_section_heading(doc, text)
                contact_block_remaining = 0
            else:
                _add_subsection_heading(doc, text)
                contact_block_remaining = 0

        elif t == "paragraph":
            children = tok.get("children", [])
            text = _collect_text(children).strip()
            if not text:
                continue
            if contact_block_remaining > 0:
                # Split children by soft/hard linebreaks so each visual line becomes its
                # own centered paragraph (subtitle, then contact lines).
                segments: list[list] = [[]]
                for c in children:
                    if c.get("type") in ("softbreak", "linebreak"):
                        segments.append([])
                    else:
                        segments[-1].append(c)
                for seg in segments:
                    seg_text = _collect_text(seg).strip()
                    if not seg_text or contact_block_remaining <= 0:
                        continue
                    _add_subtitle(
                        doc,
                        seg_text,
                        is_first_under_name=(contact_block_remaining == 4),
                    )
                    contact_block_remaining -= 1
            else:
                _add_body_paragraph(doc, children)

        elif t == "list":
            for item in tok.get("children", []):
                for child in item.get("children", []):
                    if child.get("type") in ("block_text", "paragraph"):
                        _add_bullet(doc, child.get("children", []), available_styles=available_styles)
                    elif child.get("type") == "list":
                        # Nested list — flatten one level
                        for sub_item in child.get("children", []):
                            for sub_child in sub_item.get("children", []):
                                if sub_child.get("type") in ("block_text", "paragraph"):
                                    _add_bullet(doc, sub_child.get("children", []), available_styles=available_styles)

        elif t == "thematic_break":
            doc.add_paragraph()

        elif t == "block_code":
            p = doc.add_paragraph()
            run = _add_run(p, tok.get("raw", ""))
            run.font.name = "Consolas"

        elif t == "blank_line":
            continue

    buf = BytesIO()
    doc.save(buf)
    return buf.getvalue()
