# CLAUDE.md — Local Job Tracker with AI Resume Tailoring

> Context for Claude Code (and any AI coding assistant) working on this repo. Keep at the repo root.

---

## 1. What This Project Does

A **local-only** personal job-application tracker for an **Angular + AI developer**. Runs entirely on your laptop — no cloud, no deployment, no auth. Workflow:

1. You find a job manually (LinkedIn, Indeed, company site).
2. You paste the JD + metadata (company, title, source, location, salary) into the tracker.
3. AI tailors your base resume and cover letter to the JD's keywords.
4. You review and download tailored **Word (.docx)** and **PDF** versions.
5. You submit the application yourself on the job site.
6. The dashboard shows all applications, stats, and lets you update statuses over time.

Your base resume and base cover letter live in `/backend/assets/` as markdown — never re-uploaded.

---

## 2. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | **React 18 + Vite + TypeScript** | Fast dev, runs at `localhost:5173` |
| UI | **Tailwind CSS + shadcn/ui** | Good-looking defaults, no design work |
| Server state | **TanStack Query** | Caching, refetching, no Redux |
| Backend | **FastAPI (Python 3.11+)** | Async, runs at `localhost:8000` |
| AI | **Anthropic Claude API** (`claude-sonnet-4-5`) | Best for resume/letter writing |
| Word generation | **python-docx** | Standard, works everywhere |
| PDF generation | **WeasyPrint** (HTML→PDF) | Better-looking output than ReportLab |
| DB | **SQLite** (file at `backend/data/app.db`) | Zero-setup, perfect for one user |
| ORM | **SQLAlchemy 2.0** | `Base.metadata.create_all()` on startup — no migrations needed |

**That's it.** No Supabase, no Vercel, no Railway, no Docker required (though optional).

---

## 3. Architecture

```
┌─────────────────────┐         ┌──────────────────────┐
│  React SPA          │ ◄─────► │  FastAPI Backend     │
│  localhost:5173     │  HTTP   │  localhost:8000      │
│                     │         │                      │
│  - Paste JD         │         │  - /api/tailor       │
│  - Review tailored  │         │  - /api/applications │
│  - Dashboard table  │         │  - /api/stats        │
│  - Download btns    │         │  - reads assets/*.md │
└─────────────────────┘         └─────┬──────┬─────────┘
                                      │      │
                              ┌───────▼──┐ ┌─▼─────────────┐
                              │ Claude   │ │ SQLite        │
                              │  API     │ │ data/app.db   │
                              └──────────┘ └───────────────┘
```

---

## 4. Project Structure

```
job-tracker/
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── NewApplication.tsx
│   │   │   └── ReviewApplication.tsx
│   │   ├── components/
│   │   │   ├── ApplicationsTable.tsx
│   │   │   ├── StatsCards.tsx
│   │   │   ├── JobPasteForm.tsx
│   │   │   └── TailoredPreview.tsx
│   │   ├── lib/api.ts
│   │   └── types.ts
│   ├── package.json
│   └── vite.config.ts
│
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry, runs create_all() on startup
│   │   ├── api/
│   │   │   ├── tailor.py
│   │   │   ├── applications.py
│   │   │   └── download.py
│   │   ├── services/
│   │   │   ├── claude_client.py
│   │   │   ├── docx_writer.py
│   │   │   ├── pdf_writer.py
│   │   │   └── keyword_extractor.py
│   │   ├── models.py            # SQLAlchemy models (single file is fine)
│   │   ├── schemas.py           # Pydantic schemas
│   │   ├── prompts/
│   │   │   ├── tailor_resume.md
│   │   │   └── tailor_cover.md
│   │   └── db.py
│   ├── assets/
│   │   ├── base_resume.md       # YOUR resume in markdown
│   │   ├── base_cover.md        # YOUR cover letter template
│   │   └── templates/
│   │       ├── resume.html      # WeasyPrint PDF template
│   │       └── resume_style.css
│   ├── data/                    # SQLite lives here, gitignored
│   │   └── app.db
│   └── requirements.txt
│
├── start.sh                     # one command to launch both
├── .env                         # ANTHROPIC_API_KEY=...
└── README.md
```

---

## 5. Database Schema

Single table, SQLite. SQLAlchemy creates it on startup — no migration tool needed.

```python
# backend/app/models.py
class Application(Base):
    __tablename__ = "applications"
    id              = Column(Integer, primary_key=True, autoincrement=True)
    created_at      = Column(DateTime, default=datetime.utcnow)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Pasted by user
    source_site     = Column(String)        # "LinkedIn", "Indeed", "Company Site"
    source_url      = Column(String)
    company         = Column(String, nullable=False)
    job_title       = Column(String, nullable=False)
    location        = Column(String)
    salary_offered  = Column(String)        # free-text: "$120-150k", "Negotiable"
    job_description = Column(Text, nullable=False)

    # AI output
    keywords        = Column(JSON)          # ["angular", "rxjs", "llm", ...]
    fit_score       = Column(Float)         # 0–1
    tailored_resume_md  = Column(Text)
    tailored_cover_md   = Column(Text)
    changes_summary = Column(Text)

    # Tracking
    status          = Column(String, default="DRAFT")
    applied_at      = Column(DateTime, nullable=True)
    comment         = Column(Text)
```

Statuses: `DRAFT`, `READY`, `APPLIED`, `INTERVIEW`, `REJECTED`, `OFFER`, `WITHDRAWN`.

### If you later want to evolve the schema
Either: (a) accept losing data and let `create_all()` rebuild, (b) add Alembic at that point — it's a 20-minute addition. For now, don't bother.

---

## 6. Backend API

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/tailor` | Body: `{ company, title, jd, ... }` → returns tailored resume + cover (markdown) + keywords + fit_score. **Does not save.** |
| POST | `/api/applications` | Save a tailored application after review. |
| GET | `/api/applications` | List, with filters: `?status=APPLIED&company=...` |
| GET | `/api/applications/{id}` | Detail |
| PATCH | `/api/applications/{id}` | Update status, comment, etc. |
| DELETE | `/api/applications/{id}` | Hard delete (it's your machine, no audit needs) |
| GET | `/api/applications/{id}/download?format=docx\|pdf` | Stream the file |
| GET | `/api/stats` | `{ total, by_status, by_company, by_week, avg_fit_score }` |

### `/api/tailor` flow

```python
# pseudocode
async def tailor(jd: str, company: str, title: str):
    base_resume = read_file("assets/base_resume.md")
    base_cover  = read_file("assets/base_cover.md")

    keywords, fit = await asyncio.gather(
        extract_keywords(jd),          # claude-haiku, cheap
        score_fit(base_resume, jd),    # claude-haiku, cheap
    )

    if fit < 0.4:
        return { "warning": "low fit", "fit_score": fit, "keywords": keywords }

    resume_md, cover_md = await asyncio.gather(
        tailor_resume(base_resume, jd, keywords),     # claude-sonnet, ~15s
        tailor_cover(base_cover, jd, company, title), # claude-sonnet, ~10s
    )
    return {
        "tailored_resume_md": resume_md,
        "tailored_cover_md":  cover_md,
        "keywords": keywords,
        "fit_score": fit,
        "changes_summary": ...,
    }
```

Total time: ~15–20s (parallelized). No timeout worries because no serverless.

### CORS
Allow `http://localhost:5173` only. One line in `main.py` with `CORSMiddleware`.

---

## 7. The Critical Anti-Hallucination Rules

The tailoring prompt MUST include:

- Use **only** facts present in the base resume. Never invent jobs, companies, dates, metrics, or technologies.
- You may **reorder, rephrase, and reweight** existing bullets to match the JD's keywords.
- You may **change the summary** to lead with the most relevant existing experience.
- If the JD requires a skill not in the base resume, do **not** add it. Note it in `changes_summary` as "Gap: JD wants X, not in your resume."
- Cover letter: address the company by name, reference 1–2 specific JD requirements, ≤ 250 words.

The review UI shows a diff (base resume vs. tailored) so you catch anything weird before downloading.

---

## 8. Word + PDF Generation

The AI returns **markdown**. We render it two ways:

### Word (.docx) — `python-docx`
- Parse markdown with `mistune`, walk tokens, emit `doc.add_*` calls.
- Clean style: Calibri 11, blue H1, gray H2, bullet lists for experience.

### PDF — `WeasyPrint`
- Convert markdown → HTML with `markdown` library.
- Inject into `assets/templates/resume.html` (clean CSS).
- WeasyPrint produces a designed-looking PDF.

Both generated **on demand** from the stored markdown. The DB never stores binary files.

### WeasyPrint system dependencies
- **macOS:** `brew install pango`
- **Ubuntu:** `sudo apt install libpango-1.0-0 libpangoft2-1.0-0`
- **Windows:** Follow WeasyPrint's Windows install guide (uses GTK). If painful, switch to ReportLab — uglier but pure-Python.

---

## 9. Frontend Pages

### Dashboard (`/`)
- Stats cards: Total applied, This week, Avg fit score, Response rate.
- Filterable/searchable table:
  `Date | Source | Company | Title | Location | Salary | Keywords (chips) | Fit | Status | Actions`
- Row actions: View, Download docx, Download PDF, Mark Applied/Interview/Rejected, Delete.

### New Application (`/new`)
- Big paste-the-JD textarea + fields: Company, Title, Source, URL, Location, Salary.
- "Tailor" button → spinner (~15–20s) → routes to Review.

### Review (`/review/:tempId`)
- Two-column: JD on left, tailored resume + cover (tabs) on right.
- Extracted keywords as chips, fit score meter, "Changes summary" panel.
- Buttons: **Save as Draft**, **Save & Download Docx**, **Save & Download PDF**, **Discard**.

---

## 10. Setup (One-Time)

```bash
git clone <repo> && cd job-tracker

# Backend
cd backend
python3.11 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# (Install WeasyPrint system deps — see §8)

# Drop your real resume + cover into assets/ as markdown:
#   backend/assets/base_resume.md
#   backend/assets/base_cover.md

# Frontend
cd ../frontend
npm install

# API key
cd ..
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env
```

### Running it

```bash
./start.sh
```

`start.sh` does:
```bash
#!/bin/bash
(cd backend && source .venv/bin/activate && uvicorn app.main:app --reload --port 8000) &
(cd frontend && npm run dev) &
wait
```

Open `http://localhost:5173`.

### Daily use
Just `./start.sh`. The SQLite file at `backend/data/app.db` persists everything between runs.

### Updating your base resume/cover
Edit the file in `backend/assets/`. Next tailor call picks it up — no restart needed (files are read on every request, not at startup).

### Backups
The DB is just a file. `cp backend/data/app.db backups/app-$(date +%F).db` once a week is plenty. Add it to a cron job if you're fancy.

---

## 11. Build Order

| Step | Goal | Output |
|---|---|---|
| 1 | FastAPI skeleton + SQLite + Application model + `create_all()` | `GET /health` works |
| 2 | Put your real resume + cover into `assets/` as markdown | Files exist |
| 3 | `/api/tailor` endpoint with Claude calls (no DB save) | `curl` returns tailored markdown |
| 4 | python-docx + WeasyPrint renderers, tested via `test_render.py` | Good-looking .docx and .pdf land on disk |
| 5 | `/api/applications` CRUD + `/api/stats` | All endpoints work in `/docs` (FastAPI Swagger) |
| 6 | React shell + dashboard table (mocked data → wired) | Dashboard renders |
| 7 | New Application page + Review page | End-to-end test with one real JD |
| 8 | Stats cards, filters, status updates | Polish |

**Spend the first 2 days on steps 1–4 with no React at all.** Use `curl` or HTTPie to validate that the tailored output is genuinely usable. Iterate on the prompts in `prompts/tailor_resume.md` with 5–6 real JDs before writing a single line of React. If the AI output isn't good enough to send, no UI fixes that.

---

## 12. Things Claude Code Should Refuse / Push Back On

- "Scrape LinkedIn for me" → no. Manual paste is the design.
- "Add skills/jobs/numbers the resume doesn't have" → no, see §7.
- "Skip the review step" → no, fabrication risk.
- "Store the generated docx/pdf in the DB" → no, regenerate on demand from the stored markdown. Cheaper, simpler, lets you fix formatting bugs retroactively.
- "Make tailoring faster than 15s" → it's Claude API latency. The fix is a good loading state, not a worse prompt.
- "Add login" → no, it's a localhost-only tool. If you ever expose it to the internet, that's the moment to add auth — not now.

---

## 13. Open Questions

- Cover letter as Word too, or plain-text-paste-into-email enough?
- Track interview rounds (phone screen → technical → onsite) as sub-statuses, or keep status flat?
- Should the dashboard surface "best fit" jobs by keyword overlap with your strongest experience?
- Do you want one base resume, or variants (Angular-heavy vs. AI-heavy) that the tailor picks from?
