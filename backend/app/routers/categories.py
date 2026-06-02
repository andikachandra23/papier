from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models import Category, Paper, User, paper_categories
from ..schemas import CategoryCreate, CategoryUpdate, CategoryOut
from ..auth import get_current_user

router = APIRouter(prefix="/api/categories", tags=["categories"])


@router.get("/", response_model=List[CategoryOut])
def list_categories(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    categories = db.query(Category).filter(
        Category.user_id == current_user.id,
        Category.parent_id.is_(None),
    ).all()

    result = []
    for cat in categories:
        paper_count = db.query(func.count(paper_categories.c.paper_id)).filter(
            paper_categories.c.category_id == cat.id
        ).scalar()
        children = [
            CategoryOut(
                id=child.id,
                name=child.name,
                description=child.description or "",
                color=child.color,
                parent_id=child.parent_id,
                paper_count=db.query(func.count(paper_categories.c.paper_id)).filter(
                    paper_categories.c.category_id == child.id
                ).scalar(),
            )
            for child in cat.children
        ]
        result.append(CategoryOut(
            id=cat.id,
            name=cat.name,
            description=cat.description or "",
            color=cat.color,
            parent_id=cat.parent_id,
            children=children,
            paper_count=paper_count,
        ))

    return result


@router.post("/", response_model=CategoryOut)
def create_category(
    category_data: CategoryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    category = Category(
        user_id=current_user.id,
        name=category_data.name,
        description=category_data.description or "",
        color=category_data.color or "#D9D6C8",
        parent_id=category_data.parent_id,
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return CategoryOut(
        id=category.id,
        name=category.name,
        description=category.description or "",
        color=category.color,
        parent_id=category.parent_id,
        paper_count=0,
    )


@router.put("/{category_id}", response_model=CategoryOut)
def update_category(
    category_id: int,
    category_data: CategoryUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    category = db.query(Category).filter(
        Category.id == category_id,
        Category.user_id == current_user.id,
    ).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    update_data = category_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(category, key, value)

    db.commit()
    db.refresh(category)

    paper_count = db.query(func.count(paper_categories.c.paper_id)).filter(
        paper_categories.c.category_id == category.id
    ).scalar()

    return CategoryOut(
        id=category.id,
        name=category.name,
        description=category.description or "",
        color=category.color,
        parent_id=category.parent_id,
        paper_count=paper_count,
    )


@router.delete("/{category_id}")
def delete_category(
    category_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    category = db.query(Category).filter(
        Category.id == category_id,
        Category.user_id == current_user.id,
    ).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    db.delete(category)
    db.commit()
    return {"message": "Category deleted"}