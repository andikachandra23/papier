"""AI Token Usage tracking endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import AIUsageLog, User
from ..schemas import AIUsageLogOut, AIUsageSummary

router = APIRouter(prefix="/api/ai-usage", tags=["ai-usage"])


@router.get("/me", response_model=list[AIUsageLogOut])
def get_my_usage(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    feature: str = Query("", description="Filter by feature: summarize or auto_highlight"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get current user's AI usage logs with pagination."""
    query = db.query(AIUsageLog).filter(AIUsageLog.user_id == current_user.id)
    if feature:
        query = query.filter(AIUsageLog.feature == feature)
    query = query.order_by(AIUsageLog.created_at.desc())
    total = query.count()
    logs = query.offset((page - 1) * per_page).limit(per_page).all()
    return logs


@router.get("/me/summary", response_model=AIUsageSummary)
def get_my_usage_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get summary of current user's total AI token usage."""
    logs = db.query(AIUsageLog).filter(AIUsageLog.user_id == current_user.id)

    total_prompt = db.query(func.sum(AIUsageLog.prompt_tokens)).filter(
        AIUsageLog.user_id == current_user.id
    ).scalar() or 0

    total_completion = db.query(func.sum(AIUsageLog.completion_tokens)).filter(
        AIUsageLog.user_id == current_user.id
    ).scalar() or 0

    total_all = db.query(func.sum(AIUsageLog.total_tokens)).filter(
        AIUsageLog.user_id == current_user.id
    ).scalar() or 0

    total_calls = logs.count()

    summarize_calls = db.query(func.count(AIUsageLog.id)).filter(
        AIUsageLog.user_id == current_user.id,
        AIUsageLog.feature == "summarize",
    ).scalar() or 0

    auto_highlight_calls = db.query(func.count(AIUsageLog.id)).filter(
        AIUsageLog.user_id == current_user.id,
        AIUsageLog.feature == "auto_highlight",
    ).scalar() or 0

    summarize_tokens = db.query(func.sum(AIUsageLog.total_tokens)).filter(
        AIUsageLog.user_id == current_user.id,
        AIUsageLog.feature == "summarize",
    ).scalar() or 0

    auto_highlight_tokens = db.query(func.sum(AIUsageLog.total_tokens)).filter(
        AIUsageLog.user_id == current_user.id,
        AIUsageLog.feature == "auto_highlight",
    ).scalar() or 0

    return AIUsageSummary(
        total_prompt_tokens=total_prompt,
        total_completion_tokens=total_completion,
        total_tokens=total_all,
        total_calls=total_calls,
        summarize_calls=summarize_calls,
        auto_highlight_calls=auto_highlight_calls,
        summarize_tokens=summarize_tokens,
        auto_highlight_tokens=auto_highlight_tokens,
    )