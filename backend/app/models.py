from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Float, JSON
from .db import Base


class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, autoincrement=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    source_site = Column(String)
    source_url = Column(String)
    company = Column(String, nullable=False)
    job_title = Column(String, nullable=False)
    location = Column(String)
    salary_offered = Column(String)
    job_description = Column(Text, nullable=False)

    keywords = Column(JSON)
    fit_score = Column(Float)
    tailored_resume_md = Column(Text)
    tailored_cover_md = Column(Text)
    changes_summary = Column(Text)

    status = Column(String, default="DRAFT")
    applied_at = Column(DateTime, nullable=True)
    comment = Column(Text)
