# Job Tracker

A **local-only** personal job-application tracker with AI-tailored resumes and cover letters. Runs entirely on your laptop. No cloud, no auth, no deployment. You paste a job description, the app uses the Anthropic Claude API to tailor your base resume and cover letter to the role, you review the output and download polished `.docx` / `.pdf` files, then you apply yourself on the job site.

Built for a single user (you). All your applications, keywords, tailored markdown, and statuses live in a SQLite file at `backend/data/app.db`.

---

## Features

### AI-powered tailoring
- **One-click tailoring** from a pasted JD: extracts keywords, scores fit, and rewrites your base resume + cover letter to match (parallel API calls, ~15–20s end-to-end).
- **Strict anti-hallucination rules** — the AI is forbidden from inventing jobs, dates, metrics, or skills not in your base resume. It can only reorder, rephrase, and emphasize what already exists.
- **Fit score (0.0–1.0)** before tailoring. If the score is below 0.4, tailoring is automatically skipped to save tokens, and you get a warning.
- **Auto-fill from JD** — paste a JD, click "✨ Auto-fill" and Claude Haiku extracts company / job title / location / salary so you don't have to retype them.
- **Structured changes summary** with three sections: what changed, gaps (skills the JD wants but you don't have), and suggestions for improving your base resume.

### Document generation that matches your real resume
- **Template-aware DOCX rendering** — the app loads your original `resume.docx` and `cover.docx` as templates, preserving fonts, theme, margins, and headers. Your tailored output looks indistinguishable from a hand-edited copy.
- **Embedded profile photo** — drop `profile.png` in `backend/assets/` and it's inserted centered at the top of every resume.
- **Real Word hyperlinks** — email, LinkedIn, GitHub, Portfolio render as clickable, blue-underlined links.
- **Skills section formatting** — each Technical Skills category renders on its own line with the category name in bold.
- **Cover letter polish** — today's date and a bold `RE: {Job Title} at {Company}` subject line auto-inserted above the greeting.
- **2-page resume / 1-page cover letter** — prompts enforce word budgets and the renderer ships tight margins + 10pt body to keep length predictable.
- **PDF rendering** via WeasyPrint (optional — requires GTK on Windows). DOCX always works.
- **Smart filenames** — `Pratibha_Jadhav_{Company}_{JobTitle}_resume.docx` and `Pratibha_Jadhav_Cover_Letter_{Company}.docx`.

### Application tracking
- **Dashboard** with colored stat cards: total applications, this week, average fit score, response rate.
- **Filterable, searchable table** — filter by status, search by company or title.
- **Status workflow** — Draft → Ready → Applied → Interview → Offer / Rejected / Withdrawn. Change the status inline.
- **Per-row download links** — grab the resume (R.docx / R.pdf) or cover letter (C.docx) for any saved application without opening it.
- **Review page** — JD on the left, editable tailored content on the right. Edit, save, download, change status all from one screen.
- **Markdown editing** — tweak the tailored output before downloading. Changes are saved with the application.

### Cost-conscious by design
- Uses **Haiku 4.5** for cheap operations (keyword extraction, fit scoring, auto-fill), **Sonnet 4.6** only for the expensive tailoring step.
- **Downloads cost nothing** — the .docx and .pdf are generated locally from stored markdown. Zero API calls.
- **Fit threshold short-circuit** — bad-fit JDs skip tailoring entirely.
- **Status changes, browsing, deleting** — all local. No API calls.
- Estimate: ~$0.09 per tailored job at current pricing. Set a usage cap in the Anthropic console.

### UI
- Indigo → violet → fuchsia gradient theme.
- Colored stat cards, status badges, fit-score pills.
- Auto-fill and Tailor buttons have generous size + hover-scale feedback.
- Copy-to-clipboard button on the changes summary so you can paste back into your base resume notes.

---

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS |
| Server state | TanStack Query |
| Backend | FastAPI (Python 3.11+) |
| AI | Anthropic Claude API (Sonnet 4.6 + Haiku 4.5) |
| DOCX | python-docx, mistune (markdown → docx) |
| PDF | WeasyPrint (markdown → HTML → PDF) |
| DB | SQLite (file at `backend/data/app.db`) |
| ORM | SQLAlchemy 2.0 (auto-creates schema on startup) |

No Docker. No cloud services. No migrations. The database is just a file you can copy to back up.

---

## Setup (one-time)

### 1. Install Python + Node
- Python 3.11+
- Node 18+

### 2. Backend
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

On Windows, WeasyPrint also needs GTK for PDF rendering — skip if you only want `.docx` downloads.

### 3. Frontend
```powershell
cd ..\frontend
npm install
```

### 4. API key
Copy `.env.example` to `.env` at the repo root and fill in:
```
ANTHROPIC_API_KEY=sk-ant-...
```

### 5. Add your real resume and cover letter
Drop these into `backend/assets/`:
- `resume.docx` — your real resume
- `cover.docx` — your cover letter template
- `profile.png` (optional) — your headshot for the resume header

Then convert to markdown (one-time):
```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python -m scripts.convert_docx
```

This writes `base_resume.md` and `base_cover.md` next to the source files. Open them and clean up anything ugly — the markdown is what gets sent to Claude.

---

## Daily use

From the repo root in PowerShell:
```powershell
.\start.ps1
```

Launches both servers. Open http://localhost:5173 in your browser.

| URL | What it is |
|---|---|
| `http://localhost:5173` | The app |
| `http://localhost:8000/health` | Backend heartbeat |
| `http://localhost:8000/docs` | FastAPI Swagger (test endpoints) |

Workflow:
1. Find a job (LinkedIn, Indeed, company site).
2. Click **+ New application**, paste the JD.
3. Click **✨ Auto-fill** to populate the company/title/location/salary fields.
4. Click **✨ Tailor resume + cover** (~15–20s).
5. Review on the Review page, edit anything that looks off.
6. Click **Save as Ready**.
7. Click the Cover letter tab → **Download cover .docx** if you need one.
8. Click **Download resume .docx**.
9. Apply on the job site.
10. Come back later and change status to APPLIED / INTERVIEW / etc.

---

## Customizing

### Updating your base resume
Edit `backend/assets/base_resume.md` directly. Next tailor call picks it up — no restart needed. Or update `resume.docx` and re-run `python -m scripts.convert_docx` (hyperlinks survive re-conversion).

### Backups
The DB is a file. Copy `backend/data/app.db` somewhere safe occasionally. To reset, delete the file — next backend start recreates an empty schema.

### Tuning the prompts
Both prompts live in `backend/app/prompts/`:
- `tailor_resume.md` — word budget, anti-hallucination rules, output format
- `tailor_cover.md` — date + RE subject + paragraph structure
Edit either to change the AI's behavior. No code changes needed.

### Tightening the layout
Visual rules for the .docx (font sizes, margins, spacing, link color) live in `backend/app/services/template_docx_writer.py` as top-level constants. Tweak there.

---

## Project structure

```
JobTracker/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI entry + CORS
│   │   ├── db.py                    # SQLAlchemy / SQLite
│   │   ├── models.py                # Application table
│   │   ├── schemas.py               # Pydantic request/response shapes
│   │   ├── api/
│   │   │   ├── tailor.py            # /api/tailor + /api/extract-meta
│   │   │   ├── applications.py      # CRUD + /api/stats
│   │   │   └── download.py          # /api/applications/{id}/download
│   │   ├── services/
│   │   │   ├── claude_client.py     # Anthropic SDK wrapper
│   │   │   ├── template_docx_writer.py  # template-aware .docx renderer
│   │   │   ├── docx_writer.py       # fallback .docx renderer
│   │   │   ├── pdf_writer.py        # WeasyPrint .pdf renderer
│   │   │   └── keyword_extractor.py
│   │   └── prompts/
│   │       ├── tailor_resume.md
│   │       └── tailor_cover.md
│   ├── assets/
│   │   ├── resume.docx              # YOUR original (template)
│   │   ├── cover.docx               # YOUR original (template)
│   │   ├── profile.png              # YOUR headshot (optional)
│   │   ├── base_resume.md           # auto-converted, AI input
│   │   └── base_cover.md            # auto-converted, AI input
│   ├── scripts/
│   │   └── convert_docx.py          # .docx → .md converter
│   ├── data/
│   │   └── app.db                   # SQLite (gitignored)
│   └── requirements.txt
│
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
│   │   │   ├── TailoredPreview.tsx
│   │   │   └── ChangesSummary.tsx
│   │   ├── lib/api.ts
│   │   └── types.ts
│   └── package.json
│
├── start.ps1                        # one-command launcher (Windows)
├── start.sh                         # one-command launcher (Mac/Linux)
├── .env                             # ANTHROPIC_API_KEY (gitignored)
└── CLAUDE.md                        # design spec
```

---

## Roadmap

Planned, not yet built:

- **Multiple base resume variants** (Angular-heavy, AI-heavy, full-stack) with auto-selection from JD keywords.
- **ATS keyword coverage score** — deterministic % of JD keywords present in the tailored output.
- **Pre-screen mode** — Haiku-only fit-check on multiple JDs before paying for full Sonnet tailoring.
- **Diff view** — side-by-side base resume vs tailored, with highlighted changes.
- **Kanban board** — drag-and-drop status pipeline view.
- **Follow-up reminders** — surface stale Applied applications.
- **Skip cover letter toggle** for jobs that don't need one.
- **Interview prep notes** field per application.

---

## License

Personal use. No license attached.
