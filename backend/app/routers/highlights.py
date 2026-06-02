from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Highlight, Paper, User
from ..schemas import HighlightCreate, HighlightOut
from ..auth import get_current_user

router = APIRouter(prefix="/api/highlights", tags=["highlights"])


@router.get("/{paper_id}", response_model=List[HighlightOut])
def list_highlights(
    paper_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    paper = db.query(Paper).filter(
        Paper.id == paper_id,
        Paper.user_id == current_user.id,
    ).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    return db.query(Highlight).filter(Highlight.paper_id == paper_id).all()


@router.post("/{paper_id}", response_model=HighlightOut)
def create_highlight(
    paper_id: int,
    highlight_data: HighlightCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    paper = db.query(Paper).filter(
        Paper.id == paper_id,
        Paper.user_id == current_user.id,
    ).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    highlight = Highlight(
        paper_id=paper_id,
        page=highlight_data.page,
        position=highlight_data.position,
        color=highlight_data.color or "#FFEB3B",
        text=highlight_data.text or "",
    )
    db.add(highlight)
    db.commit()
    db.refresh(highlight)
    return highlight


@router.delete("/{highlight_id}")
def delete_highlight(
    highlight_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    highlight = db.query(Highlight).filter(Highlight.id == highlight_id).first()
    if not highlight:
        raise HTTPException(status_code=404, detail="Highlight not found")

    paper = db.query(Paper).filter(
        Paper.id == highlight.paper_id,
        Paper.user_id == current_user.id,
    ).first()
    if not paper:
        raise HTTPException(status_code=403, detail="Not authorized")

    db.delete(highlight)
    db.commit()
    return {"message": "Highlight deleted"}