import json
import os
import re
from pathlib import Path
from typing import Optional

from anthropic import AsyncAnthropic

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
PROMPTS_DIR = BACKEND_DIR / "app" / "prompts"
ASSETS_DIR = BACKEND_DIR / "assets"

SONNET_MODEL = os.getenv("CLAUDE_SONNET_MODEL", "claude-sonnet-4-6")
HAIKU_MODEL = os.getenv("CLAUDE_HAIKU_MODEL", "claude-haiku-4-5-20251001")

_client: Optional[AsyncAnthropic] = None


def get_client() -> AsyncAnthropic:
    global _client
    if _client is None:
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise RuntimeError(
                "ANTHROPIC_API_KEY is not set. Add it to .env at the repo root."
            )
        _client = AsyncAnthropic(api_key=api_key)
    return _client


def read_prompt(name: str) -> str:
    return (PROMPTS_DIR / name).read_text(encoding="utf-8")


def read_asset(name: str) -> str:
    path = ASSETS_DIR / name
    if not path.exists():
        raise FileNotFoundError(
            f"Missing asset: {path}. Create your base resume/cover in backend/assets/."
        )
    return path.read_text(encoding="utf-8")


def _extract_json(text: str) -> dict:
    """Pull the first JSON object out of a model response, tolerating fences/preamble."""
    fence = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if fence:
        return json.loads(fence.group(1))
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        return json.loads(text[start : end + 1])
    raise ValueError(f"No JSON object found in model response: {text[:200]}...")


async def extract_keywords(jd: str) -> list[str]:
    client = get_client()
    msg = await client.messages.create(
        model=HAIKU_MODEL,
        max_tokens=400,
        messages=[
            {
                "role": "user",
                "content": (
                    "Extract the 8-15 most important technical/role keywords from this job description. "
                    "Return a JSON array of lowercase strings, no preamble.\n\n"
                    f"JOB DESCRIPTION:\n{jd}"
                ),
            }
        ],
    )
    text = msg.content[0].text.strip()
    m = re.search(r"\[.*\]", text, re.DOTALL)
    if not m:
        return []
    try:
        arr = json.loads(m.group(0))
        return [str(x).strip().lower() for x in arr if str(x).strip()]
    except json.JSONDecodeError:
        return []


async def score_fit(base_resume: str, jd: str) -> float:
    client = get_client()
    msg = await client.messages.create(
        model=HAIKU_MODEL,
        max_tokens=120,
        messages=[
            {
                "role": "user",
                "content": (
                    "Given a candidate's resume and a job description, output ONLY a JSON object "
                    '{"fit": <float 0-1>} indicating how well the resume matches the JD. '
                    "Consider role match, required skills overlap, seniority. No preamble.\n\n"
                    f"RESUME:\n{base_resume}\n\nJOB DESCRIPTION:\n{jd}"
                ),
            }
        ],
    )
    text = msg.content[0].text.strip()
    try:
        obj = _extract_json(text)
        return float(obj.get("fit", 0.0))
    except (ValueError, json.JSONDecodeError):
        return 0.0


async def tailor_resume(
    base_resume: str, jd: str, keywords: list[str]
) -> tuple[str, str]:
    client = get_client()
    system = read_prompt("tailor_resume.md")
    user = (
        f"BASE RESUME:\n{base_resume}\n\n"
        f"JOB DESCRIPTION:\n{jd}\n\n"
        f"KEYWORDS:\n{', '.join(keywords)}"
    )
    msg = await client.messages.create(
        model=SONNET_MODEL,
        max_tokens=8000,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    raw = msg.content[0].text
    try:
        obj = _extract_json(raw)
    except (ValueError, json.JSONDecodeError) as e:
        raise RuntimeError(
            f"Resume tailoring returned non-JSON or truncated output "
            f"(stop_reason={msg.stop_reason!r}). First 300 chars: {raw[:300]!r}"
        ) from e
    if "tailored_resume_md" not in obj:
        raise RuntimeError(
            f"Resume tailoring JSON missing 'tailored_resume_md'. Keys present: {list(obj.keys())}"
        )
    return obj["tailored_resume_md"], obj.get("changes_summary", "")


async def extract_meta(jd: str) -> dict:
    """Pull company / job_title / location / salary_offered from a JD using Haiku."""
    client = get_client()
    msg = await client.messages.create(
        model=HAIKU_MODEL,
        max_tokens=400,
        messages=[
            {
                "role": "user",
                "content": (
                    "Extract these fields from the job description. Return ONLY a JSON object "
                    "with exactly these keys, using null for any field you can't determine. "
                    "Do not invent values.\n\n"
                    "{\n"
                    '  "company": <string or null>,\n'
                    '  "job_title": <string or null>,\n'
                    '  "location": <string or null>,\n'
                    '  "salary_offered": <string or null>\n'
                    "}\n\n"
                    "Rules:\n"
                    "- company: the hiring company name only (no 'group of', 'subsidiary of' qualifiers unless inseparable).\n"
                    "- job_title: the role title as written.\n"
                    "- location: city/region/remote as stated. If multiple, prefer the primary one.\n"
                    "- salary_offered: only if explicitly stated in the JD. Otherwise null.\n\n"
                    f"JOB DESCRIPTION:\n{jd}"
                ),
            }
        ],
    )
    text = msg.content[0].text.strip()
    try:
        return _extract_json(text)
    except (ValueError, json.JSONDecodeError):
        return {"company": None, "job_title": None, "location": None, "salary_offered": None}


async def tailor_cover(
    base_cover: str, jd: str, company: str, job_title: str
) -> str:
    client = get_client()
    system = read_prompt("tailor_cover.md")
    user = (
        f"BASE COVER LETTER:\n{base_cover}\n\n"
        f"COMPANY: {company}\n"
        f"JOB TITLE: {job_title}\n\n"
        f"JOB DESCRIPTION:\n{jd}"
    )
    msg = await client.messages.create(
        model=SONNET_MODEL,
        max_tokens=2000,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    raw = msg.content[0].text
    try:
        obj = _extract_json(raw)
    except (ValueError, json.JSONDecodeError) as e:
        raise RuntimeError(
            f"Cover letter tailoring returned non-JSON or truncated output "
            f"(stop_reason={msg.stop_reason!r}). First 300 chars: {raw[:300]!r}"
        ) from e
    if "tailored_cover_md" not in obj:
        raise RuntimeError(
            f"Cover letter JSON missing 'tailored_cover_md'. Keys present: {list(obj.keys())}"
        )
    return obj["tailored_cover_md"]
