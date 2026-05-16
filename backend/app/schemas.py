from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict


class TailorRequest(BaseModel):
    company: str
    job_title: str
    job_description: str
    source_site: Optional[str] = None
    source_url: Optional[str] = None
    location: Optional[str] = None
    salary_offered: Optional[str] = None


class TailorResponse(BaseModel):
    keywords: List[str]
    fit_score: float
    tailored_resume_md: Optional[str] = None
    tailored_cover_md: Optional[str] = None
    changes_summary: Optional[str] = None
    warning: Optional[str] = None


class ExtractMetaRequest(BaseModel):
    job_description: str


class ExtractMetaResponse(BaseModel):
    company: Optional[str] = None
    job_title: Optional[str] = None
    location: Optional[str] = None
    salary_offered: Optional[str] = None


class ApplicationCreate(BaseModel):
    company: str
    job_title: str
    job_description: str
    source_site: Optional[str] = None
    source_url: Optional[str] = None
    location: Optional[str] = None
    salary_offered: Optional[str] = None

    keywords: Optional[List[str]] = None
    fit_score: Optional[float] = None
    tailored_resume_md: Optional[str] = None
    tailored_cover_md: Optional[str] = None
    changes_summary: Optional[str] = None

    status: str = "DRAFT"
    comment: Optional[str] = None


class ApplicationUpdate(BaseModel):
    status: Optional[str] = None
    comment: Optional[str] = None
    applied_at: Optional[datetime] = None
    salary_offered: Optional[str] = None
    tailored_resume_md: Optional[str] = None
    tailored_cover_md: Optional[str] = None


class ApplicationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
    source_site: Optional[str]
    source_url: Optional[str]
    company: str
    job_title: str
    location: Optional[str]
    salary_offered: Optional[str]
    job_description: str
    keywords: Optional[List[str]]
    fit_score: Optional[float]
    tailored_resume_md: Optional[str]
    tailored_cover_md: Optional[str]
    changes_summary: Optional[str]
    status: str
    applied_at: Optional[datetime]
    comment: Optional[str]


class StatsOut(BaseModel):
    total: int
    by_status: Dict[str, int]
    by_company: Dict[str, int]
    by_week: Dict[str, int]
    avg_fit_score: Optional[float]
