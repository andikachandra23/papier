from __future__ import annotations
import os
import tempfile
import shutil
import httpx
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_
from pydantic import BaseModel
from ..database import get_db
from ..models import Paper, Category, Tag, User
from ..schemas import PaperCreate, PaperUpdate, PaperOut
from ..auth import get_current_user
from ..storage import delete_r2_object, is_r2_path, r2_enabled, stream_r2_object, upload_pdf_to_r2

router = APIRouter(prefix="/api/papers", tags=["papers"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")


@router.get("/", response_model=List[PaperOut])
def list_papers(
    category_id: Optional[int] = None,
    tag_id: Optional[int] = None,
    is_reading: Optional[bool] = None,
    search: Optional[str] = None,
    sort: Optional[str] = "recent",
    min_year: Optional[int] = None,
    max_year: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Paper).filter(Paper.user_id == current_user.id)

    if category_id is not None:
        query = query.filter(Paper.categories.any(Category.id == category_id))
    if tag_id is not None:
        query = query.filter(Paper.tags.any(Tag.id == tag_id))
    if is_reading is not None:
        query = query.filter(Paper.is_reading == is_reading)
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Paper.title.ilike(search_term),
                Paper.authors.ilike(search_term),
                Paper.abstract.ilike(search_term),
            )
        )

    # Year range filter
    if min_year is not None:
        query = query.filter(or_(Paper.year >= min_year, Paper.year.is_(None)))
    if max_year is not None:
        query = query.filter(or_(Paper.year <= max_year, Paper.year.is_(None)))

    if sort == "year-desc":
        query = query.order_by(Paper.year.desc().nullslast())
    elif sort == "year-asc":
        query = query.order_by(Paper.year.asc().nullslast())
    elif sort == "title":
        query = query.order_by(Paper.title.asc())
    else:  # recent
        query = query.order_by(Paper.updated_at.desc())

    return query.all()


@router.post("/", response_model=PaperOut)
def create_paper(
    paper_data: PaperCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    paper = Paper(
        user_id=current_user.id,
        title=paper_data.title,
        authors=paper_data.authors or "",
        year=paper_data.year,
        abstract=paper_data.abstract or "",
        keywords=paper_data.keywords or "",
        doi=paper_data.doi or "",
    )

    if paper_data.category_ids:
        categories = db.query(Category).filter(
            Category.id.in_(paper_data.category_ids),
            Category.user_id == current_user.id,
        ).all()
        paper.categories = categories

    if paper_data.tag_ids:
        tags = db.query(Tag).filter(
            Tag.id.in_(paper_data.tag_ids),
            Tag.user_id == current_user.id,
        ).all()
        paper.tags = tags

    db.add(paper)
    db.commit()
    db.refresh(paper)
    return paper


@router.get("/{paper_id}", response_model=PaperOut)
def get_paper(
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
    return paper


@router.put("/{paper_id}", response_model=PaperOut)
def update_paper(
    paper_id: int,
    paper_data: PaperUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    paper = db.query(Paper).filter(
        Paper.id == paper_id,
        Paper.user_id == current_user.id,
    ).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    update_data = paper_data.model_dump(exclude_unset=True)
    category_ids = update_data.pop("category_ids", None)
    tag_ids = update_data.pop("tag_ids", None)

    for key, value in update_data.items():
        setattr(paper, key, value)

    if category_ids is not None:
        categories = db.query(Category).filter(
            Category.id.in_(category_ids),
            Category.user_id == current_user.id,
        ).all()
        paper.categories = categories

    if tag_ids is not None:
        tags = db.query(Tag).filter(
            Tag.id.in_(tag_ids),
            Tag.user_id == current_user.id,
        ).all()
        paper.tags = tags

    db.commit()
    db.refresh(paper)
    return paper


@router.delete("/{paper_id}")
def delete_paper(
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

    # Delete PDF file if exists
    if is_r2_path(paper.pdf_path):
        delete_r2_object(paper.pdf_path)
    elif paper.pdf_path and os.path.exists(paper.pdf_path):
        os.remove(paper.pdf_path)

    db.delete(paper)
    db.commit()
    return {"message": "Paper deleted"}


class BulkAction(BaseModel):
    paper_ids: List[int]
    action: str
    category_id: Optional[int] = None
    tag_id: Optional[int] = None
    is_reading: Optional[bool] = None


@router.post("/bulk")
def bulk_action(
    data: BulkAction,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    papers = db.query(Paper).filter(
        Paper.id.in_(data.paper_ids),
        Paper.user_id == current_user.id,
    ).all()
    if not papers:
        raise HTTPException(status_code=404, detail="No papers found")

    if data.action == "delete":
        for paper in papers:
            if is_r2_path(paper.pdf_path):
                delete_r2_object(paper.pdf_path)
            elif paper.pdf_path and os.path.exists(paper.pdf_path):
                os.remove(paper.pdf_path)
            db.delete(paper)
    elif data.action == "add_category" and data.category_id:
        cat = db.query(Category).filter(Category.id == data.category_id, Category.user_id == current_user.id).first()
        if cat:
            for paper in papers:
                if cat not in paper.categories:
                    paper.categories.append(cat)
    elif data.action == "remove_category" and data.category_id:
        cat = db.query(Category).filter(Category.id == data.category_id, Category.user_id == current_user.id).first()
        if cat:
            for paper in papers:
                if cat in paper.categories:
                    paper.categories.remove(cat)
    elif data.action == "add_tag" and data.tag_id:
        tag = db.query(Tag).filter(Tag.id == data.tag_id, Tag.user_id == current_user.id).first()
        if tag:
            for paper in papers:
                if tag not in paper.tags:
                    paper.tags.append(tag)
    elif data.action == "remove_tag" and data.tag_id:
        tag = db.query(Tag).filter(Tag.id == data.tag_id, Tag.user_id == current_user.id).first()
        if tag:
            for paper in papers:
                if tag in paper.tags:
                    paper.tags.remove(tag)
    elif data.action == "set_reading":
        for paper in papers:
            paper.is_reading = data.is_reading if data.is_reading is not None else True
    elif data.action == "clear_reading":
        for paper in papers:
            paper.is_reading = False
    else:
        raise HTTPException(status_code=400, detail="Invalid action")

    db.commit()
    return {"message": f"Bulk action '{data.action}' applied to {len(papers)} papers"}


@router.post("/{paper_id}/upload", response_model=PaperOut)
def upload_pdf(
    paper_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    paper = db.query(Paper).filter(
        Paper.id == paper_id,
        Paper.user_id == current_user.id,
    ).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    # Validate file type
    if file.content_type and file.content_type not in [
        "application/pdf",
        "application/octet-stream",  # Some browsers send this for PDF
    ]:
        # Also check by extension
        if not file.filename or not file.filename.lower().endswith(".pdf"):
            raise HTTPException(
                status_code=400,
                detail="Hanya file PDF yang diizinkan. Pastikan file yang diupload berekstensi .pdf",
            )

    # Validate file size (max 50MB)
    MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
    file_size = 0
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    # Sanitize filename
    import re
    safe_name = re.sub(r'[^\w\-.]', '_', file.filename or "paper.pdf")
    if not safe_name.lower().endswith(".pdf"):
        safe_name += ".pdf"
    filename = f"paper_{paper_id}_{safe_name}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    # Write to a temporary file first so we can validate size before sending to storage.
    tmp_path = None
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as buffer:
        tmp_path = buffer.name
        while True:
            chunk = file.file.read(8192)
            if not chunk:
                break
            file_size += len(chunk)
            if file_size > MAX_FILE_SIZE:
                # Clean up the partial file
                buffer.close()
                os.remove(tmp_path)
                raise HTTPException(
                    status_code=400,
                    detail=f"Ukuran file terlalu besar ({file_size // (1024*1024)}MB). Maksimal 50MB.",
                )
            buffer.write(chunk)

    if file_size == 0:
        os.remove(tmp_path)
        raise HTTPException(status_code=400, detail="File PDF kosong atau tidak valid.")

    # Prefer Cloudflare R2 in production; keep local storage as dev fallback.
    if r2_enabled():
        key = f"papers/user_{current_user.id}/paper_{paper_id}/{filename}"
        try:
            with open(tmp_path, "rb") as pdf_file:
                paper.pdf_path = upload_pdf_to_r2(pdf_file, key)
            os.remove(tmp_path)
        except Exception as exc:
            if tmp_path and os.path.exists(tmp_path):
                os.remove(tmp_path)
            raise HTTPException(status_code=502, detail=f"Gagal upload PDF ke Cloudflare R2: {str(exc)}")
    else:
        shutil.move(tmp_path, file_path)
        paper.pdf_path = file_path

    # Uploaded PDF should take priority over any external PDF URL.
    paper.pdf_url = ""
    db.commit()
    db.refresh(paper)
    return paper


def _get_browser_headers(url: str = "") -> dict:
    """Return browser-like headers that are less likely to be blocked by academic servers."""
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/pdf,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Cache-Control": "max-age=0",
    }
    # Add Referer based on the URL's origin
    if url:
        from urllib.parse import urlparse
        parsed = urlparse(url)
        headers["Referer"] = f"{parsed.scheme}://{parsed.netloc}/"
    return headers


def _fetch_pdf_from_url(pdf_url: str) -> tuple:
    """Attempt to fetch a PDF from an external URL with browser-like headers.
    Returns (response, client) on success, raises on failure."""
    headers = _get_browser_headers(pdf_url)

    # First attempt with browser-like headers
    client = httpx.Client(timeout=60, follow_redirects=True)
    try:
        resp = client.stream("GET", pdf_url, headers=headers)
        resp.__enter__()  # manually enter context

        if resp.status_code == 403:
            # Retry with different Accept header (some servers check this)
            resp.__exit__(None, None, None)
            retry_headers = headers.copy()
            retry_headers["Accept"] = "application/pdf,*/*"
            resp = client.stream("GET", pdf_url, headers=retry_headers)
            resp.__enter__()

        if resp.status_code == 403:
            # Try one more time without Sec-Fetch headers (some WAFs block these)
            resp.__exit__(None, None, None)
            simple_headers = {
                "User-Agent": headers["User-Agent"],
                "Accept": "application/pdf,application/octet-stream,*/*",
                "Accept-Language": "en-US,en;q=0.9",
                "Accept-Encoding": "gzip, deflate, br",
                "Connection": "keep-alive",
                "Referer": headers.get("Referer", ""),
            }
            resp = client.stream("GET", pdf_url, headers=simple_headers)
            resp.__enter__()

        return resp, client
    except Exception:
        client.close()
        raise


@router.get("/{paper_id}/pdf")
def serve_paper_pdf(
    paper_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Proxy endpoint: serves PDF from local file or streams from external URL."""
    paper = db.query(Paper).filter(
        Paper.id == paper_id,
        Paper.user_id == current_user.id,
    ).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    # Priority 1: Serve uploaded file from R2 or local filesystem
    if is_r2_path(paper.pdf_path):
        return StreamingResponse(stream_r2_object(paper.pdf_path), media_type="application/pdf")

    if paper.pdf_path and os.path.exists(paper.pdf_path):
        def file_iter():
            with open(paper.pdf_path, "rb") as f:
                while chunk := f.read(8192):
                    yield chunk
        return StreamingResponse(file_iter(), media_type="application/pdf")

    # Priority 2: Proxy from external URL
    if paper.pdf_url:
        client = None
        try:
            resp, client = _fetch_pdf_from_url(paper.pdf_url)

            if resp.status_code != 200:
                resp.__exit__(None, None, None)
                client.close()
                status = resp.status_code
                if status == 403:
                    raise HTTPException(
                        status_code=502,
                        detail=f"HTTP 403: Server eksternal menolak akses. Silakan download PDF secara manual lalu upload.",
                    )
                elif status == 404:
                    raise HTTPException(
                        status_code=502,
                        detail=f"HTTP 404: File PDF tidak ditemukan di server eksternal.",
                    )
                else:
                    raise HTTPException(
                        status_code=502,
                        detail=f"HTTP {status}: Gagal mengambil PDF dari sumber eksternal.",
                    )

            content_type = resp.headers.get("Content-Type", "")

            # Verify we got a PDF-like response
            if "application/pdf" not in content_type and "application/octet-stream" not in content_type:
                if "text/html" in content_type:
                    resp.__exit__(None, None, None)
                    client.close()
                    raise HTTPException(
                        status_code=502,
                        detail="HTML instead of PDF: URL mengembalikan halaman web, bukan file PDF.",
                    )
                if "text/" in content_type:
                    resp.__exit__(None, None, None)
                    client.close()
                    raise HTTPException(
                        status_code=502,
                        detail=f"Non-PDF content ({content_type}): URL tidak mengarah ke file PDF.",
                    )

            def stream_chunks():
                try:
                    for chunk in resp.iter_bytes(chunk_size=8192):
                        yield chunk
                finally:
                    resp.__exit__(None, None, None)
                    client.close()

            return StreamingResponse(
                stream_chunks(),
                media_type="application/pdf",
            )
        except HTTPException:
            raise
        except httpx.TimeoutException:
            if client:
                client.close()
            raise HTTPException(
                status_code=502,
                detail="Timeout: Server eksternal terlalu lambat merespons. Coba lagi atau upload manual.",
            )
        except httpx.ConnectError:
            if client:
                client.close()
            raise HTTPException(
                status_code=502,
                detail="Gagal terhubung ke server eksternal. URL mungkin tidak valid.",
            )
        except httpx.RequestError as e:
            if client:
                client.close()
            raise HTTPException(status_code=502, detail=f"Gagal mengambil PDF: {str(e)}")

    raise HTTPException(status_code=404, detail="No PDF available for this paper")


def validate_pdf_url(url: str) -> bool:
    """Check if URL actually points to a PDF by doing a HEAD request."""
    try:
        with httpx.Client(timeout=10, follow_redirects=True) as client:
            resp = client.head(url, headers={"User-Agent": "Papier/1.0"})
            content_type = resp.headers.get("Content-Type", "").lower()
            if "application/pdf" in content_type or "application/octet-stream" in content_type:
                return True
            # Some servers don't support HEAD, try GET with range
            if resp.status_code == 405 or resp.status_code == 403:
                with client.stream("GET", url, headers={"User-Agent": "Papier/1.0", "Range": "bytes=0-1023"}) as get_resp:
                    ct = get_resp.headers.get("Content-Type", "").lower()
                    return "application/pdf" in ct or "application/octet-stream" in ct
            return False
    except httpx.RequestError:
        return False


class ResolvePDFRequest(BaseModel):
    pdf_url: Optional[str] = None


@router.post("/{paper_id}/resolve-pdf", response_model=PaperOut)
def resolve_pdf_url(
    paper_id: int,
    data: ResolvePDFRequest = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Resolve PDF URL from DOI via OpenAlex/Unpaywall, or accept a manual URL."""
    paper = db.query(Paper).filter(
        Paper.id == paper_id,
        Paper.user_id == current_user.id,
    ).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    # If user provided a manual URL, validate and use it
    if data and data.pdf_url:
        if validate_pdf_url(data.pdf_url):
            paper.pdf_url = data.pdf_url
            db.commit()
            db.refresh(paper)
            return paper
        else:
            # Save anyway but warn user
            paper.pdf_url = data.pdf_url
            db.commit()
            db.refresh(paper)
            return paper

    # Otherwise, try to resolve from DOI
    if not paper.doi:
        raise HTTPException(status_code=400, detail="Paper has no DOI to resolve PDF from")

    try:
        pdf_url = None

        # Priority 1: OpenAlex API (best coverage for OA papers)
        try:
            with httpx.Client(timeout=15, follow_redirects=True) as client:
                resp = client.get(
                    f"https://api.openalex.org/works/doi:{paper.doi}",
                    params={"mailto": "admin@papier.app"},
                    headers={"User-Agent": "Papier/1.0"},
                )
                if resp.status_code == 200:
                    data = resp.json()
                    # Check open_access.oa_url
                    oa_url = data.get("open_access", {}).get("oa_url")
                    if oa_url:
                        pdf_url = oa_url
                    # Check primary_location.pdf_url
                    if not pdf_url:
                        primary = data.get("primary_location", {})
                        if primary and primary.get("pdf_url"):
                            pdf_url = primary["pdf_url"]
                    # Check best_oa_location
                    if not pdf_url:
                        best_oa = data.get("best_oa_location", {})
                        if best_oa and best_oa.get("pdf_url"):
                            pdf_url = best_oa["pdf_url"]
        except httpx.RequestError:
            pass  # Continue to Unpaywall fallback

        # Priority 2: Unpaywall API as fallback
        if not pdf_url:
            try:
                with httpx.Client(timeout=15, follow_redirects=True) as client:
                    resp = client.get(
                        f"https://api.unpaywall.org/v2/{paper.doi}?email=admin@papier.app",
                        headers={"User-Agent": "Papier/1.0"},
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        if data.get("best_oa_location") and data["best_oa_location"].get("url_for_pdf"):
                            pdf_url = data["best_oa_location"]["url_for_pdf"]
                        elif data.get("oa_locations"):
                            for loc in data["oa_locations"]:
                                if loc.get("url_for_pdf"):
                                    pdf_url = loc["url_for_pdf"]
                                    break
            except httpx.RequestError:
                pass

        if pdf_url:
            # Validate that the URL actually points to a PDF
            if validate_pdf_url(pdf_url):
                paper.pdf_url = pdf_url
                db.commit()
                db.refresh(paper)
                return paper
            else:
                # URL found but not a direct PDF - save with warning
                paper.pdf_url = pdf_url
                db.commit()
                db.refresh(paper)
                return paper
        raise HTTPException(status_code=404, detail="No open access PDF found for this DOI")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to resolve PDF: {str(e)}")
