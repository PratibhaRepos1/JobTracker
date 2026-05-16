from collections import Counter
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Application
from ..schemas import (
    ApplicationCreate,
    ApplicationOut,
    ApplicationUpdate,
    StatsOut,
)

router = APIRouter(prefix="/api", tags=["applications"])


@router.post("/applications", response_model=ApplicationOut)
def create_application(payload: ApplicationCreate, db: Session = Depends(get_db)) -> Application:
    app = Application(**payload.model_dump())
    if app.status == "APPLIED" and app.applied_at is None:
        app.applied_at = datetime.utcnow()
    db.add(app)
    db.commit()
    db.refresh(app)
    return app


@router.get("/applications", response_model=list[ApplicationOut])
def list_applications(
    status: Optional[str] = Query(None),
    company: Optional[str] = Query(None),
    q: Optional[str] = Query(None, description="search in title/company"),
    db: Session = Depends(get_db),
) -> list[Application]:
    query = db.query(Application)
    if status:
        query = query.filter(Application.status == status)
    if company:
        query = query.filter(Application.company.ilike(f"%{company}%"))
    if q:
        like = f"%{q}%"
        query = query.filter(
            (Application.company.ilike(like)) | (Application.job_title.ilike(like))
        )
    return query.order_by(desc(Application.created_at)).all()


@router.get("/applications/{app_id}", response_model=ApplicationOut)
def get_application(app_id: int, db: Session = Depends(get_db)) -> Application:
    app = db.query(Application).filter(Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    return app


@router.patch("/applications/{app_id}", response_model=ApplicationOut)
def update_application(
    app_id: int, payload: ApplicationUpdate, db: Session = Depends(get_db)
) -> Application:
    app = db.query(Application).filter(Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    data = payload.model_dump(exclude_unset=True)
    if data.get("status") == "APPLIED" and app.applied_at is None and "applied_at" not in data:
        data["applied_at"] = datetime.utcnow()
    for k, v in data.items():
        setattr(app, k, v)
    db.commit()
    db.refresh(app)
    return app


@router.delete("/applications/{app_id}", status_code=204)
def delete_application(app_id: int, db: Session = Depends(get_db)) -> None:
    app = db.query(Application).filter(Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    db.delete(app)
    db.commit()


@router.get("/stats", response_model=StatsOut)
def stats(db: Session = Depends(get_db)) -> StatsOut:
    apps = db.query(Application).all()
    total = len(apps)
    by_status = dict(Counter(a.status or "DRAFT" for a in apps))
    by_company = dict(Counter(a.company for a in apps).most_common(10))

    today = datetime.utcnow().date()
    weeks: Counter[str] = Counter()
    for a in apps:
        if not a.created_at:
            continue
        d = a.created_at.date()
        monday = d - timedelta(days=d.weekday())
        weeks[monday.isoformat()] += 1
    by_week = dict(sorted(weeks.items()))

    scores = [a.fit_score for a in apps if a.fit_score is not None]
    avg = sum(scores) / len(scores) if scores else None

    return StatsOut(
        total=total,
        by_status=by_status,
        by_company=by_company,
        by_week=by_week,
        avg_fit_score=avg,
    )
