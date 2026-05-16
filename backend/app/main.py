from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Load .env from repo root (one level up from backend/)
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
load_dotenv(REPO_ROOT / ".env")

from .db import Base, engine  # noqa: E402
from . import models  # noqa: F401, E402  (register models on Base)
from .api import tailor as tailor_api  # noqa: E402
from .api import applications as applications_api  # noqa: E402
from .api import download as download_api  # noqa: E402

app = FastAPI(title="Job Tracker", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


app.include_router(tailor_api.router)
app.include_router(applications_api.router)
app.include_router(download_api.router)
