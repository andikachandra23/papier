"""Admin panel endpoints — user management, dashboard stats, AI usage oversight."""

import os
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..auth import get_admin_user
from ..database import get_db
from ..models import AIUsageLog, Paper, User, Setting
from ..schemas import (
    AdminDashboardStats,
    AdminUserUpdate,
    AIUsageLogOut,
    AIUsageSummary,
    PaperOut,
    UserOut,
)

router = APIRouter(prefix="/api/admin", tags=["admin"])


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

@router.get("/stats", response_model=AdminDashboardStats)
def get_dashboard_stats(
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Admin dashboard statistics."""
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    total_users = db.query(func.count(User.id)).scalar() or 0
    active_users = db.query(func.count(User.id)).filter(User.is_active == True).scalar() or 0
    total_papers = db.query(func.count(Paper.id)).scalar() or 0
    total_ai_calls = db.query(func.count(AIUsageLog.id)).scalar() or 0
    total_tokens_used = db.query(func.sum(AIUsageLog.total_tokens)).scalar() or 0
    users_today = db.query(func.count(User.id)).filter(User.created_at >= today_start).scalar() or 0
    papers_today = db.query(func.count(Paper.id)).filter(Paper.created_at >= today_start).scalar() or 0

    return AdminDashboardStats(
        total_users=total_users,
        active_users=active_users,
        total_papers=total_papers,
        total_ai_calls=total_ai_calls,
        total_tokens_used=total_tokens_used,
        users_today=users_today,
        papers_today=papers_today,
    )


# ---------------------------------------------------------------------------
# User Management
# ---------------------------------------------------------------------------

@router.get("/users", response_model=list[UserOut])
def list_users(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: str = Query("", description="Search by email"),
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """List all users with pagination and optional search."""
    query = db.query(User)
    if search:
        query = query.filter(User.email.ilike(f"%{search}%"))
    query = query.order_by(User.created_at.desc())
    users = query.offset((page - 1) * per_page).limit(per_page).all()
    return users


@router.get("/users/count")
def get_users_count(
    search: str = Query(""),
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Get total user count (for pagination)."""
    query = db.query(func.count(User.id))
    if search:
        query = query.filter(User.email.ilike(f"%{search}%"))
    return {"total": query.scalar() or 0}


@router.put("/users/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    data: AdminUserUpdate,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Update user role or active status."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    # Prevent admin from deactivating or downgrading themselves
    if user.id == admin.id:
        if data.is_active is not None and not data.is_active:
            raise HTTPException(status_code=400, detail="Cannot deactivate your own account")
        if data.role is not None and data.role != "admin":
            raise HTTPException(status_code=400, detail="Cannot change your own role")
    if data.role is not None:
        if data.role not in ("user", "admin"):
            raise HTTPException(status_code=400, detail="Invalid role. Must be 'user' or 'admin'")
        user.role = data.role
    if data.is_active is not None:
        user.is_active = data.is_active
    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Delete a user and all their data."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    db.delete(user)
    db.commit()
    return {"message": f"User {user.email} deleted"}


# ---------------------------------------------------------------------------
# User Papers (admin view)
# ---------------------------------------------------------------------------

@router.get("/users/{user_id}/papers", response_model=list[PaperOut])
def get_user_papers(
    user_id: int,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """List papers owned by a specific user."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    papers = (
        db.query(Paper)
        .filter(Paper.user_id == user_id)
        .order_by(Paper.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )
    return papers


# ---------------------------------------------------------------------------
# AI Usage (admin view — all users)
# ---------------------------------------------------------------------------

@router.get("/ai-usage", response_model=list[AIUsageLogOut])
def get_all_ai_usage(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    user_id: int = Query(0, description="Filter by user ID"),
    feature: str = Query("", description="Filter by feature"),
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """List AI usage logs for all users (admin only)."""
    query = db.query(AIUsageLog)
    if user_id:
        query = query.filter(AIUsageLog.user_id == user_id)
    if feature:
        query = query.filter(AIUsageLog.feature == feature)
    query = query.order_by(AIUsageLog.created_at.desc())
    logs = query.offset((page - 1) * per_page).limit(per_page).all()
    return logs


@router.get("/ai-usage/count")
def get_ai_usage_count(
    user_id: int = Query(0),
    feature: str = Query(""),
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Get total AI usage log count (for pagination)."""
    query = db.query(func.count(AIUsageLog.id))
    if user_id:
        query = query.filter(AIUsageLog.user_id == user_id)
    if feature:
        query = query.filter(AIUsageLog.feature == feature)
    return {"total": query.scalar() or 0}


@router.get("/ai-usage/summary", response_model=AIUsageSummary)
def get_all_ai_usage_summary(
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Aggregate AI usage statistics across all users."""
    total_prompt = db.query(func.sum(AIUsageLog.prompt_tokens)).scalar() or 0
    total_completion = db.query(func.sum(AIUsageLog.completion_tokens)).scalar() or 0
    total_all = db.query(func.sum(AIUsageLog.total_tokens)).scalar() or 0
    total_calls = db.query(func.count(AIUsageLog.id)).scalar() or 0

    summarize_calls = db.query(func.count(AIUsageLog.id)).filter(
        AIUsageLog.feature == "summarize",
    ).scalar() or 0
    auto_highlight_calls = db.query(func.count(AIUsageLog.id)).filter(
        AIUsageLog.feature == "auto_highlight",
    ).scalar() or 0
    summarize_tokens = db.query(func.sum(AIUsageLog.total_tokens)).filter(
        AIUsageLog.feature == "summarize",
    ).scalar() or 0
    auto_highlight_tokens = db.query(func.sum(AIUsageLog.total_tokens)).filter(
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


# ---------------------------------------------------------------------------
# AI Settings
# ---------------------------------------------------------------------------

AI_SETTING_KEYS = {
    "ai_base_url": {"label": "AI Base URL", "env_fallback": "AI_BASE_URL"},
    "ai_api_key": {"label": "AI API Key", "env_fallback": "AI_API_KEY"},
    "ai_model": {"label": "AI Model", "env_fallback": "AI_MODEL"},
}


@router.get("/settings")
def get_ai_settings(
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Get current AI settings (from DB, with env fallback)."""
    result = {}
    for key, meta in AI_SETTING_KEYS.items():
        setting = db.query(Setting).filter(Setting.key == key).first()
        if setting and setting.value:
            result[key] = setting.value
        else:
            result[key] = os.getenv(meta["env_fallback"], "")
    # Mask API key for display
    if result.get("ai_api_key"):
        key_val = result["ai_api_key"]
        if len(key_val) > 8:
            result["ai_api_key_masked"] = key_val[:4] + "****" + key_val[-4:]
        else:
            result["ai_api_key_masked"] = "****"
    else:
        result["ai_api_key_masked"] = ""
    return result


@router.put("/settings")
def update_ai_settings(
    data: dict,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Update AI settings. Only known keys are accepted."""
    updated = []
    for key, value in data.items():
        if key not in AI_SETTING_KEYS:
            continue
        setting = db.query(Setting).filter(Setting.key == key).first()
        if setting:
            setting.value = str(value)
        else:
            setting = Setting(key=key, value=str(value))
            db.add(setting)
        updated.append(key)
    db.commit()
    return {"message": "Settings updated", "updated": updated}
