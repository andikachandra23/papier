from pydantic import BaseModel, EmailStr, model_validator
from typing import Optional, List
from datetime import datetime


# Auth
class UserCreate(BaseModel):
    email: str
    password: str


class GoogleAuthRequest(BaseModel):
    id_token: str


class UserOut(BaseModel):
    id: int
    email: str
    name: str = ""
    auth_provider: str = "local"
    role: str = "user"
    is_active: bool = True
    created_at: datetime

    class Config:
        from_attributes = True


class AdminUserUpdate(BaseModel):
    role: Optional[str] = None
    is_active: Optional[bool] = None


class AIUsageLogOut(BaseModel):
    id: int
    user_id: int
    paper_id: Optional[int] = None
    feature: str
    model: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    created_at: datetime
    user_email: str = ""
    paper_title: str = ""

    class Config:
        from_attributes = True

    @model_validator(mode="before")
    @classmethod
    def populate_related_fields(cls, data):
        if isinstance(data, dict):
            return data
        if hasattr(data, "user") and data.user is not None:
            try:
                data.user_email = data.user.email
            except Exception:
                pass
        if hasattr(data, "paper") and data.paper is not None:
            try:
                data.paper_title = data.paper.title
            except Exception:
                pass
        return data


class AIUsageSummary(BaseModel):
    total_prompt_tokens: int = 0
    total_completion_tokens: int = 0
    total_tokens: int = 0
    total_calls: int = 0
    summarize_calls: int = 0
    auto_highlight_calls: int = 0
    summarize_tokens: int = 0
    auto_highlight_tokens: int = 0


class AdminDashboardStats(BaseModel):
    total_users: int = 0
    active_users: int = 0
    total_papers: int = 0
    total_ai_calls: int = 0
    total_tokens_used: int = 0
    users_today: int = 0
    papers_today: int = 0


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    user_id: Optional[int] = None


# Category
class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    color: Optional[str] = "#D9D6C8"
    parent_id: Optional[int] = None


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    parent_id: Optional[int] = None


class CategoryOut(BaseModel):
    id: int
    name: str
    description: str
    color: str
    parent_id: Optional[int] = None
    children: List["CategoryOut"] = []
    paper_count: int = 0

    class Config:
        from_attributes = True


# Tag
class TagCreate(BaseModel):
    name: str


class TagOut(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


# Highlight
class HighlightCreate(BaseModel):
    page: int
    position: str
    color: Optional[str] = "#FFEB3B"
    text: Optional[str] = ""


class HighlightOut(BaseModel):
    id: int
    page: int
    position: str
    color: str
    text: str
    created_at: datetime

    class Config:
        from_attributes = True


# Note
class NoteCreate(BaseModel):
    content: str
    page_number: Optional[int] = None
    user_comment: Optional[str] = ""


class NoteUpdate(BaseModel):
    content: Optional[str] = None
    user_comment: Optional[str] = None


class NoteOut(BaseModel):
    id: int
    paper_id: int
    content: str
    page_number: Optional[int]
    user_comment: str
    created_at: datetime
    updated_at: datetime
    paper_title: str = ""
    paper_authors: str = ""
    paper_year: Optional[int] = None
    paper_doi: str = ""

    class Config:
        from_attributes = True

    @model_validator(mode="before")
    @classmethod
    def populate_paper_fields(cls, data):
        if isinstance(data, dict):
            return data
        if hasattr(data, "paper") and data.paper is not None:
            try:
                data.paper_title = data.paper.title
                data.paper_authors = data.paper.authors
                data.paper_year = data.paper.year
                data.paper_doi = data.paper.doi
            except Exception:
                pass
        return data


# Paper
class PaperCreate(BaseModel):
    title: str
    authors: Optional[str] = ""
    year: Optional[int] = None
    abstract: Optional[str] = ""
    keywords: Optional[str] = ""
    doi: Optional[str] = ""
    pdf_url: Optional[str] = ""
    category_ids: Optional[List[int]] = []
    tag_ids: Optional[List[int]] = []


class PaperUpdate(BaseModel):
    title: Optional[str] = None
    authors: Optional[str] = None
    year: Optional[int] = None
    abstract: Optional[str] = None
    keywords: Optional[str] = None
    doi: Optional[str] = None
    pdf_url: Optional[str] = None
    is_reading: Optional[bool] = None
    category_ids: Optional[List[int]] = None
    tag_ids: Optional[List[int]] = None


class PaperOut(BaseModel):
    id: int
    title: str
    authors: str
    year: Optional[int]
    abstract: str
    keywords: str
    doi: str
    pdf_path: str
    pdf_url: str
    is_reading: bool
    summary_text: str = ""
    summary_key_points: str = ""
    summary_lang: str = ""
    summary_pages: int = 0
    summary_generated_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    categories: List[CategoryOut] = []
    tags: List[TagOut] = []
    highlights: List[HighlightOut] = []
    notes: List[NoteOut] = []

    class Config:
        from_attributes = True


# DOI Response
class DOIMetadata(BaseModel):
    title: str
    authors: str
    year: Optional[int]
    abstract: Optional[str]
    keywords: Optional[str] = ""
    doi: str
