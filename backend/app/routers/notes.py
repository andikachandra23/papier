from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Note, Paper, User
from ..schemas import NoteCreate, NoteUpdate, NoteOut
from ..auth import get_current_user

router = APIRouter(prefix="/api/notes", tags=["notes"])


def _note_to_out(note: Note) -> NoteOut:
    """Convert a Note model instance to NoteOut with paper reference info."""
    return NoteOut(
        id=note.id,
        paper_id=note.paper_id,
        content=note.content,
        page_number=note.page_number,
        user_comment=note.user_comment or "",
        created_at=note.created_at,
        updated_at=note.updated_at,
        paper_title=note.paper.title if note.paper else "",
        paper_authors=note.paper.authors if note.paper else "",
        paper_year=note.paper.year if note.paper else None,
        paper_doi=note.paper.doi if note.paper else "",
    )


@router.get("/all", response_model=List[NoteOut])
def list_all_notes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all notes for the current user across all papers."""
    notes = (
        db.query(Note)
        .join(Paper, Note.paper_id == Paper.id)
        .filter(Paper.user_id == current_user.id)
        .order_by(Note.created_at.desc())
        .all()
    )
    return [_note_to_out(n) for n in notes]


@router.get("/paper/{paper_id}", response_model=List[NoteOut])
def list_notes(
    paper_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all notes for a specific paper."""
    paper = db.query(Paper).filter(
        Paper.id == paper_id,
        Paper.user_id == current_user.id,
    ).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    notes = (
        db.query(Note)
        .filter(Note.paper_id == paper_id)
        .order_by(Note.created_at.desc())
        .all()
    )
    return [_note_to_out(n) for n in notes]


@router.post("/{paper_id}", response_model=NoteOut)
def create_note(
    paper_id: int,
    note_data: NoteCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new note for a paper."""
    paper = db.query(Paper).filter(
        Paper.id == paper_id,
        Paper.user_id == current_user.id,
    ).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    note = Note(
        paper_id=paper_id,
        content=note_data.content,
        page_number=note_data.page_number,
        user_comment=note_data.user_comment or "",
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return _note_to_out(note)


@router.put("/{note_id}", response_model=NoteOut)
def update_note(
    note_id: int,
    note_data: NoteUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update an existing note."""
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    # Verify ownership through paper
    paper = db.query(Paper).filter(
        Paper.id == note.paper_id,
        Paper.user_id == current_user.id,
    ).first()
    if not paper:
        raise HTTPException(status_code=403, detail="Not authorized")

    if note_data.content is not None:
        note.content = note_data.content
    if note_data.user_comment is not None:
        note.user_comment = note_data.user_comment

    db.commit()
    db.refresh(note)
    return _note_to_out(note)


@router.delete("/{note_id}")
def delete_note(
    note_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a note."""
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    paper = db.query(Paper).filter(
        Paper.id == note.paper_id,
        Paper.user_id == current_user.id,
    ).first()
    if not paper:
        raise HTTPException(status_code=403, detail="Not authorized")

    db.delete(note)
    db.commit()
    return {"message": "Note deleted"}