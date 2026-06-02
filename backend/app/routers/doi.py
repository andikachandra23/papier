import re
from typing import Optional
import httpx
from fastapi import APIRouter, HTTPException
from ..config import env
from ..schemas import DOIMetadata

router = APIRouter(prefix="/api/doi", tags=["doi"])

CROSSREF_API = "https://api.crossref.org/works"
OPENALEX_API = "https://api.openalex.org/works"
UNPAYWALL_API = "https://api.unpaywall.org"
CONTACT_EMAIL = env("CONTACT_EMAIL", "admin@papier.app")
BROWSER_USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)
APP_USER_AGENT = "Papier/1.0"


def normalize_keywords(values, limit=8):
    seen = set()
    keywords = []
    for value in values or []:
        if not value:
            continue
        keyword = str(value).strip()
        key = keyword.lower()
        if keyword and key not in seen:
            seen.add(key)
            keywords.append(keyword)
        if len(keywords) >= limit:
            break
    return ", ".join(keywords)


async def fetch_from_openalex(client: httpx.AsyncClient, doi: str) -> Optional[DOIMetadata]:
    """Fetch metadata from OpenAlex API."""
    try:
        resp = await client.get(
            f"{OPENALEX_API}/doi:{doi}",
            params={"mailto": CONTACT_EMAIL},
            timeout=10,
        )
        if resp.status_code != 200:
            return None

        data = resp.json()

        # Extract title
        title = data.get("title", "")

        # Extract authors
        authorships = data.get("authorships", [])
        authors_list = []
        for authorship in authorships:
            author = authorship.get("author", {})
            name = author.get("display_name", "")
            if name:
                # Ambil inisial nama belakang
                parts = name.split()
                if len(parts) > 1:
                    family = parts[-1]
                    given_initial = parts[0][0] + "."
                    authors_list.append(f"{family} {given_initial}")
                else:
                    authors_list.append(name)
        authors = ", ".join(authors_list)

        # Extract year from publication_date
        year = None
        pub_date = data.get("publication_date", "")
        if pub_date:
            try:
                year = int(pub_date[:4])
            except (ValueError, IndexError):
                pass

        # Extract abstract (OpenAlex menyimpan abstract dalam inverted index)
        abstract = ""
        abstract_inverted = data.get("abstract_inverted_index")
        if abstract_inverted:
            # Rekonstruksi abstract dari inverted index
            word_positions = []
            for word, positions in abstract_inverted.items():
                for pos in positions:
                    word_positions.append((pos, word))
            word_positions.sort()
            abstract = " ".join(word for _, word in word_positions)
            abstract = abstract.strip()

        # Extract keywords from OpenAlex concepts/topics.
        concepts = data.get("concepts", [])
        keywords = normalize_keywords(
            concept.get("display_name") for concept in concepts if concept.get("score", 0) >= 0.3
        )

        return DOIMetadata(
            title=title or "",
            authors=authors,
            year=year,
            abstract=abstract,
            keywords=keywords,
            doi=doi,
        )
    except Exception:
        return None


@router.get("/{doi:path}", response_model=DOIMetadata)
async def fetch_doi(doi: str):
    # Coba CrossRef terlebih dahulu
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"{CROSSREF_API}/{doi}",
                headers={"User-Agent": f"{APP_USER_AGENT} (mailto:{CONTACT_EMAIL})"},
            )
            if resp.status_code == 200:
                data = resp.json()["message"]

                # Extract authors
                authors_list = data.get("author", [])
                authors = ", ".join(
                    f"{a.get('family', '')} {a.get('given', '')[0]}." if a.get("given") else a.get("family", "")
                    for a in authors_list
                )

                # Extract year
                year = None
                date_parts = data.get("published-print", data.get("published-online", {})).get("date-parts", [[None]])
                if date_parts and date_parts[0]:
                    year = date_parts[0][0]

                # Extract abstract
                abstract = data.get("abstract", "")
                # Clean up abstract (remove JATS XML tags)
                abstract = re.sub(r"<[^>]+>", "", abstract) if abstract else ""

                # Extract keywords from CrossRef subjects.
                keywords = normalize_keywords(data.get("subject", []))

                # Extract title
                titles = data.get("title", [""])
                title = titles[0] if titles else ""

                # Jika abstract kosong, coba OpenAlex sebagai fallback
                if not abstract:
                    openalex_data = await fetch_from_openalex(client, doi)
                    if openalex_data and openalex_data.abstract:
                        abstract = openalex_data.abstract
                    if openalex_data and openalex_data.keywords and not keywords:
                        keywords = openalex_data.keywords

                return DOIMetadata(
                    title=title,
                    authors=authors,
                    year=year,
                    abstract=abstract,
                    keywords=keywords,
                    doi=doi,
                )
    except httpx.TimeoutException:
        pass  # Lanjut ke OpenAlex
    except Exception:
        pass  # Lanjut ke OpenAlex

    # Fallback ke OpenAlex
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            openalex_data = await fetch_from_openalex(client, doi)
            if openalex_data:
                return openalex_data
    except Exception:
        pass

    raise HTTPException(status_code=404, detail="DOI not found on CrossRef or OpenAlex")
