"""PDF text extraction and AI summarization."""

from __future__ import annotations

import json
import os
import re
import tempfile
from datetime import datetime, timezone
from typing import Optional

import httpx
import pdfplumber
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..config import env
from ..database import get_db
from ..models import Paper, User, AIUsageLog, Setting
from ..storage import is_r2_path, stream_r2_object

router = APIRouter(prefix="/api/papers", tags=["summarize"])


# ---------------------------------------------------------------------------
# Text extraction helpers
# ---------------------------------------------------------------------------

def _extract_text_from_file(file_path: str) -> str:
    """Extract text from a local PDF file using pdfplumber."""
    pages_text: list[str] = []
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                pages_text.append(text.strip())
    return "\n\n".join(pages_text)


def _extract_text_from_bytes(pdf_bytes: bytes) -> str:
    """Extract text from PDF bytes (for R2 or streamed files)."""
    pages_text: list[str] = []
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        tmp.write(pdf_bytes)
        tmp_path = tmp.name
    try:
        with pdfplumber.open(tmp_path) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    pages_text.append(text.strip())
    finally:
        os.remove(tmp_path)
    return "\n\n".join(pages_text)


def _extract_pages_from_file(file_path: str) -> list[dict]:
    """Extract text per page from a local PDF file."""
    pages: list[dict] = []
    with pdfplumber.open(file_path) as pdf:
        for i, page in enumerate(pdf.pages, 1):
            text = page.extract_text()
            if text and text.strip():
                pages.append({"page": i, "text": text.strip()})
    return pages


def _extract_pages_from_bytes(pdf_bytes: bytes) -> list[dict]:
    """Extract text per page from PDF bytes."""
    pages: list[dict] = []
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        tmp.write(pdf_bytes)
        tmp_path = tmp.name
    try:
        with pdfplumber.open(tmp_path) as pdf:
            for i, page in enumerate(pdf.pages, 1):
                text = page.extract_text()
                if text and text.strip():
                    pages.append({"page": i, "text": text.strip()})
    finally:
        os.remove(tmp_path)
    return pages


# ---------------------------------------------------------------------------
# Helper: get PDF text based on paper storage
# ---------------------------------------------------------------------------

def _get_paper_pages(paper: Paper) -> list[dict]:
    """Get per-page text from a paper's PDF, handling local/R2/URL sources."""
    if paper.pdf_path:
        if is_r2_path(paper.pdf_path):
            chunks = []
            for chunk in stream_r2_object(paper.pdf_path):
                chunks.append(chunk)
            pdf_bytes = b"".join(chunks)
            return _extract_pages_from_bytes(pdf_bytes)
        elif os.path.exists(paper.pdf_path):
            return _extract_pages_from_file(paper.pdf_path)
    elif paper.pdf_url:
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                           "AppleWebKit/537.36 (KHTML, like Gecko) "
                           "Chrome/120.0.0.0 Safari/537.36",
        }
        with httpx.Client(timeout=60, follow_redirects=True) as client:
            resp = client.get(paper.pdf_url, headers=headers)
            resp.raise_for_status()
            return _extract_pages_from_bytes(resp.content)
    return []


# ---------------------------------------------------------------------------
# AI Settings Helper
# ---------------------------------------------------------------------------

def _get_ai_setting(db: Session, key: str, env_key: str, default: str = "") -> str:
    """Read a setting from DB first, fallback to env var."""
    setting = db.query(Setting).filter(Setting.key == key).first()
    if setting and setting.value:
        return setting.value
    return env(env_key, default)


# AI Summarization
# ---------------------------------------------------------------------------

def _summarize_with_ai(text: str, max_sentences: int = 7, paper_title: str = "", lang: str = "id", db: Session = None) -> dict:
    """Use AI API to summarize the extracted PDF text."""
    if db:
        api_key = _get_ai_setting(db, "ai_api_key", "AI_API_KEY")
        base_url = _get_ai_setting(db, "ai_base_url", "AI_BASE_URL")
        model_name = _get_ai_setting(db, "ai_model", "AI_MODEL", "mimo-v2.5-pro")
    else:
        api_key = env("AI_API_KEY")
        base_url = env("AI_BASE_URL")
        model_name = env("AI_MODEL", "mimo-v2.5-pro")

    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="AI_API_KEY not configured. Please set it in environment variables.",
        )

    # Truncate text to avoid exceeding context limits (roughly 12000 words)
    words = text.split()
    if len(words) > 12000:
        text = " ".join(words[:12000]) + "\n\n[...text truncated...]"

    title_context = f'The paper is titled: "{paper_title}".\n\n' if paper_title else ""

    # Determine response language instruction
    if lang == "id":
        lang_instruction = "You MUST respond entirely in Indonesian (Bahasa Indonesia). All summary text and key points must be written in Indonesian."
        system_msg = (
            "Anda adalah asisten penelitian akademik. Ringkas paper penelitian dan harus mengandung 1) latar belakang riset, 2) research gap, 3) metodologi, 4) hasil, 5) temuan, 6) kesimpulan"
            "Selalu berikan respons dalam format JSON yang valid sesuai permintaan. "
            "Seluruh respons HARUS dalam Bahasa Indonesia."
        )
    else:
        lang_instruction = "Respond in English."
        system_msg = (
            "You are an academic research assistant. Summarize research papers and ensure the summary includes 1) research background, 2) research gap, 3) methodology, 4) results, 5) findings, and 6) conclusions."
            "Always provide the response in valid JSON format according to the requested schema. The entire response MUST be in English."
        )

    prompt = f"""{title_context}Please analyze the following academic paper text and provide:

1. A comprehensive summary in approximately {max_sentences} key sentences that captures the research background, gap, methodology, results, findings, and conclusions of the paper.
2. A list of key points (each as a single concise sentence).

{lang_instruction}

Return your response in the following JSON format only, with no additional text:
{{
  "summary": "Your summary paragraph here...",
  "key_points": ["Key point 1", "Key point 2", "Key point 3", ...]
}}

Paper text:
{text}"""

    try:
        from openai import OpenAI

        client = OpenAI(
            api_key=api_key,
            base_url=base_url,
        )

        response = client.chat.completions.create(
            model=model_name,
            messages=[
                {
                    "role": "system",
                    "content": system_msg,
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.3,
            max_tokens=2000,
        )

        content = response.choices[0].message.content.strip()

        # Extract token usage
        prompt_tokens = 0
        completion_tokens = 0
        total_tokens = 0
        if hasattr(response, "usage") and response.usage:
            prompt_tokens = response.usage.prompt_tokens or 0
            completion_tokens = response.usage.completion_tokens or 0
            total_tokens = response.usage.total_tokens or 0

        # Try to parse JSON from response (handle markdown code blocks)
        # Remove markdown code block markers if present
        if content.startswith("```"):
            content = re.sub(r"^```(?:json)?\s*", "", content)
            content = re.sub(r"\s*```$", "", content)

        result = json.loads(content)

        summary = result.get("summary", "")
        key_points = result.get("key_points", [])

        if not summary and key_points:
            summary = " ".join(key_points)

        return {
            "summary": summary,
            "key_points": key_points,
            "word_count_original": len(text.split()),
            "word_count_summary": len(summary.split()),
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": total_tokens,
        }

    except json.JSONDecodeError:
        # If JSON parsing fails, use the raw response as summary
        return {
            "summary": content,
            "key_points": [content],
            "word_count_original": len(text.split()),
            "word_count_summary": len(content.split()),
            "prompt_tokens": prompt_tokens if "prompt_tokens" in dir() else 0,
            "completion_tokens": completion_tokens if "completion_tokens" in dir() else 0,
            "total_tokens": total_tokens if "total_tokens" in dir() else 0,
        }
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"AI API error: {str(e)}",
        )


# ---------------------------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------------------------

class SummarizeRequest(BaseModel):
    max_sentences: int = 7
    lang: str = "id"


class SummarizeResponse(BaseModel):
    summary: str
    key_points: list[str]
    word_count_original: int
    word_count_summary: int
    pages_processed: int
    total_pages: int
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0


class PageTextResponse(BaseModel):
    page: int
    text: str


class ExtractTextResponse(BaseModel):
    pages: list[PageTextResponse]
    total_pages: int


class AutoHighlightSentence(BaseModel):
    text: str
    text_id: str = ""  # Indonesian translation
    page: int
    category: str  # e.g. "metodologi", "temuan", "kontribusi", "latar_belakang", "kesimpulan"


class AutoHighlightResponse(BaseModel):
    sentences: list[AutoHighlightSentence]
    total_found: int
    pages_scanned: int


@router.get("/{paper_id}/summarize", response_model=SummarizeResponse)
def summarize_paper(
    paper_id: int,
    max_sentences: int = 7,
    lang: str = "id",
    force: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Extract and summarize the text content of a paper's PDF using AI.
    Results are cached in the database. Use force=true to regenerate."""
    paper = db.query(Paper).filter(
        Paper.id == paper_id,
        Paper.user_id == current_user.id,
    ).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    # Check for cached summary (same language)
    if not force and paper.summary_text and paper.summary_lang == lang:
        try:
            key_points = json.loads(paper.summary_key_points) if paper.summary_key_points else []
        except json.JSONDecodeError:
            key_points = []

        return {
            "summary": paper.summary_text,
            "key_points": key_points,
            "word_count_original": len(paper.summary_text.split()),
            "word_count_summary": len(paper.summary_text.split()),
            "pages_processed": paper.summary_pages,
            "total_pages": paper.summary_pages,
        }

    # Generate new summary
    pages = _get_paper_pages(paper)

    if not pages:
        raise HTTPException(
            status_code=422,
            detail="Could not extract text from the PDF. The file may be image-based or corrupted.",
        )

    full_text = "\n\n".join(p["text"] for p in pages)
    total_pages = len(pages)

    result = _summarize_with_ai(
        full_text,
        max_sentences=max_sentences,
        paper_title=paper.title,
        lang=lang,
        db=db,
    )
    result["pages_processed"] = total_pages
    result["total_pages"] = total_pages

    # Cache result in database
    paper.summary_text = result["summary"]
    paper.summary_key_points = json.dumps(result["key_points"], ensure_ascii=False)
    paper.summary_lang = lang
    paper.summary_pages = total_pages
    paper.summary_generated_at = datetime.now(timezone.utc)

    # Log token usage
    logged_model = _get_ai_setting(db, "ai_model", "AI_MODEL", "mimo-v2.5-pro")
    usage_log = AIUsageLog(
        user_id=current_user.id,
        paper_id=paper.id,
        feature="summarize",
        model=logged_model,
        prompt_tokens=result.get("prompt_tokens", 0),
        completion_tokens=result.get("completion_tokens", 0),
        total_tokens=result.get("total_tokens", 0),
    )
    db.add(usage_log)
    db.commit()

    return result


@router.delete("/{paper_id}/summary")
def delete_summary(
    paper_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete cached summary for a paper."""
    paper = db.query(Paper).filter(
        Paper.id == paper_id,
        Paper.user_id == current_user.id,
    ).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    paper.summary_text = ""
    paper.summary_key_points = ""
    paper.summary_lang = ""
    paper.summary_pages = 0
    paper.summary_generated_at = None
    db.commit()

    return {"message": "Summary deleted"}


@router.get("/{paper_id}/extract-text", response_model=ExtractTextResponse)
def extract_paper_text(
    paper_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Extract per-page text from a paper's PDF."""
    paper = db.query(Paper).filter(
        Paper.id == paper_id,
        Paper.user_id == current_user.id,
    ).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    pages = _get_paper_pages(paper)
    return {"pages": pages, "total_pages": len(pages)}


# ---------------------------------------------------------------------------
# Auto-highlight with AI
# ---------------------------------------------------------------------------

def _generate_auto_highlights_with_ai(
    pages: list[dict], paper_title: str, lang: str = "id", max_sentences: int = 15, query: str = "", db: Session = None
) -> list[dict]:
    """Use AI to identify key sentences relevant to the research topic.
    
    Args:
        pages: List of page texts from the PDF
        paper_title: The paper's title (used as fallback context)
        lang: Language code ("id" or "en")
        max_sentences: Maximum number of sentences to return
        query: Custom topic/title/reference sentence to search for (optional)
    """
    if db:
        api_key = _get_ai_setting(db, "ai_api_key", "AI_API_KEY")
        base_url = _get_ai_setting(db, "ai_base_url", "AI_BASE_URL")
        model_name = _get_ai_setting(db, "ai_model", "AI_MODEL", "mimo-v2.5-pro")
    else:
        api_key = env("AI_API_KEY")
        base_url = env("AI_BASE_URL")
        model_name = env("AI_MODEL", "mimo-v2.5-pro")

    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="AI_API_KEY not configured. Please set it in environment variables.",
        )

    # Build page-tagged text (limit to avoid context overflow)
    page_texts = []
    word_count = 0
    for p in pages:
        page_words = p["text"].split()
        if word_count + len(page_words) > 12000:
            remaining = 12000 - word_count
            if remaining > 50:
                page_texts.append(f"[PAGE {p['page']}]\n{' '.join(page_words[:remaining])}")
            break
        page_texts.append(f"[PAGE {p['page']}]\n{p['text']}")
        word_count += len(page_words)

    tagged_text = "\n\n".join(page_texts)

    if lang == "id":
        system_msg = (
            "Anda adalah asisten penelitian akademik. Tugas Anda adalah mengidentifikasi "
            "kalimat-kalimat penting dan relevan dari paper penelitian berdasarkan judul dan topiknya. "
            "Fokus pada kalimat yang mengandung: 1) latar belakang/riset gap, 2) kontribusi utama, "
            "3) metodologi kunci, 4) temuan/result utama, 5) kesimpulan penting. "
            "Kalimat harus diambil persis dari teks asli, jangan diubah atau diparafrase. "
            "Selalu berikan respons dalam format JSON yang valid. "
            "Seluruh label kategori HARUS dalam Bahasa Indonesia."
        )
        lang_instruction = "Seluruh respons HARUS dalam Bahasa Indonesia."
        category_labels = "latar_belakang, kontribusi, metodologi, temuan, kesimpulan"
    else:
        system_msg = (
            "You are an academic research assistant. Your task is to identify key and relevant "
            "sentences from a research paper based on its title and topic. Focus on sentences that "
            "contain: 1) background/research gap, 2) main contributions, 3) key methodology, "
            "4) main findings/results, 5) important conclusions. "
            "Sentences must be taken exactly from the original text, do not change or paraphrase them. "
            "Always provide the response in valid JSON format."
        )
        lang_instruction = "Respond in English."
        category_labels = "background, contribution, methodology, finding, conclusion"

    # Build context based on whether custom query is provided
    if query:
        if lang == "id":
            search_context = (
                f'Paper ini berjudul: "{paper_title}"\n\n'
                f'TOPIC/KALIMAT REFERENSI YANG DICARI: "{query}"\n\n'
                f'Analisis paper berikut dan identifikasi maksimal {max_sentences} kalimat yang relevan '
                f'dengan topik/kalimat referensi di atas. Untuk setiap kalimat, sebutkan halaman dan kategorinya.'
            )
        else:
            search_context = (
                f'The paper is titled: "{paper_title}"\n\n'
                f'TOPIC/REFERENCE SENTENCE TO SEARCH FOR: "{query}"\n\n'
                f'Analyze the following paper and identify up to {max_sentences} key sentences that are relevant '
                f'to the topic/reference above. For each sentence, specify which page it is on and categorize it.'
            )
    else:
        search_context = (
            f'The paper is titled: "{paper_title}"\n\n'
            f'Analyze the following paper text and identify up to {max_sentences} key sentences '
            f'that are most relevant to the research topic/title. For each sentence, specify which page it is on and categorize it.'
        )

    prompt = f"""{search_context}

{lang_instruction}

Available categories: {category_labels}

IMPORTANT RULES:
1. Each sentence MUST be an EXACT quote from the paper text (do not modify or paraphrase)
2. Each sentence should be a complete, meaningful sentence (not fragments)
3. Prioritize the most important/relevant sentences
4. Include the page number where each sentence appears (from the [PAGE N] tags)
5. For each sentence, provide an Indonesian translation in the "text_id" field

Return ONLY valid JSON in this format:
{{
  "sentences": [
    {{"text": "exact sentence from paper", "text_id": "terjemahan dalam bahasa Indonesia", "page": 1, "category": "category_name"}},
    {{"text": "another sentence", "text_id": "terjemahan lain dalam bahasa Indonesia", "page": 3, "category": "category_name"}}
  ]
}}

Paper text:
{tagged_text}"""

    try:
        from openai import OpenAI

        client = OpenAI(api_key=api_key, base_url=base_url)

        response = client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": system_msg},
                {"role": "user", "content": prompt},
            ],
            temperature=0.3,
            max_tokens=3000,
        )

        content = response.choices[0].message.content.strip()

        # Remove markdown code block markers if present
        if content.startswith("```"):
            content = re.sub(r"^```(?:json)?\s*", "", content)
            content = re.sub(r"\s*```$", "", content)

        result = json.loads(content)
        sentences = result.get("sentences", [])

        # Validate each sentence
        validated = []
        for s in sentences:
            text = (s.get("text") or "").strip()
            text_id = (s.get("text_id") or "").strip()
            page = s.get("page", 1)
            category = (s.get("category") or "lainnya").strip()
            if text and len(text) > 10:  # minimum reasonable sentence length
                validated.append({"text": text, "text_id": text_id, "page": page, "category": category})

        # Extract token usage
        prompt_tokens = 0
        completion_tokens = 0
        total_tokens = 0
        if hasattr(response, "usage") and response.usage:
            prompt_tokens = response.usage.prompt_tokens or 0
            completion_tokens = response.usage.completion_tokens or 0
            total_tokens = response.usage.total_tokens or 0

        return validated, {"prompt_tokens": prompt_tokens, "completion_tokens": completion_tokens, "total_tokens": total_tokens}

    except json.JSONDecodeError:
        # If JSON parsing fails, return empty
        return [], {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"AI API error: {str(e)}",
        )


@router.get("/{paper_id}/auto-highlights", response_model=AutoHighlightResponse)
def auto_highlight_paper(
    paper_id: int,
    lang: str = "id",
    max_sentences: int = 15,
    query: str = "",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Identify key sentences in a paper relevant to its topic using AI.
    Returns sentences with page numbers and categories for auto-highlighting.
    Use `query` to specify a custom topic, research title, or reference sentence to search for."""
    paper = db.query(Paper).filter(
        Paper.id == paper_id,
        Paper.user_id == current_user.id,
    ).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    pages = _get_paper_pages(paper)

    if not pages:
        raise HTTPException(
            status_code=422,
            detail="Could not extract text from the PDF. The file may be image-based or corrupted.",
        )

    sentences, token_info = _generate_auto_highlights_with_ai(
        pages,
        paper_title=paper.title,
        lang=lang,
        max_sentences=max_sentences,
        query=query.strip() if query else "",
        db=db,
    )

    # Log token usage
    logged_model = _get_ai_setting(db, "ai_model", "AI_MODEL", "mimo-v2.5-pro")
    usage_log = AIUsageLog(
        user_id=current_user.id,
        paper_id=paper.id,
        feature="auto_highlight",
        model=logged_model,
        prompt_tokens=token_info.get("prompt_tokens", 0),
        completion_tokens=token_info.get("completion_tokens", 0),
        total_tokens=token_info.get("total_tokens", 0),
    )
    db.add(usage_log)
    db.commit()

    return {
        "sentences": sentences,
        "total_found": len(sentences),
        "pages_scanned": len(pages),
    }