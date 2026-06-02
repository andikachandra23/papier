from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from .database import engine, Base
from .routers import auth, papers, categories, tags, highlights, doi, notes, summarize, admin, ai_usage
import os
import time

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Papier API", version="1.0.0")

# CORS
allowed_origins = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://localhost:3000",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in allowed_origins if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Simple in-memory rate limiter (for production, use Redis-backed slowapi)
class RateLimitMiddleware:
    """Simple rate limiter middleware for production use."""
    def __init__(self, app, requests_per_minute: int = 60):
        self.app = app
        self.requests_per_minute = requests_per_minute
        self.requests: dict[str, list[float]] = {}

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)

        # Get client IP
        client_ip = "unknown"
        if "client" in scope and scope["client"]:
            client_ip = scope["client"][0]
        elif "headers" in scope:
            # Check for forwarded IP behind proxy
            for name, value in scope["headers"]:
                if name == b"x-forwarded-for":
                    client_ip = value.decode().split(",")[0].strip()
                    break

        # Check rate limit
        now = time.time()
        window = 60.0  # 1 minute window

        if client_ip not in self.requests:
            self.requests[client_ip] = []

        # Clean old entries
        self.requests[client_ip] = [
            t for t in self.requests[client_ip] if now - t < window
        ]

        if len(self.requests[client_ip]) >= self.requests_per_minute:
            response = JSONResponse(
                status_code=429,
                content={"detail": "Terlalu banyak request. Coba lagi dalam 1 menit."},
            )
            return await response(scope, receive, send)

        self.requests[client_ip].append(now)

        # Periodically clean up old IPs
        if len(self.requests) > 10000:
            cutoff = now - window
            self.requests = {
                ip: times for ip, times in self.requests.items()
                if any(t > cutoff for t in times)
            }

        return await self.app(scope, receive, send)


# Apply rate limiting in production
if os.getenv("ENVIRONMENT", "development") == "production":
    rate_limit = int(os.getenv("RATE_LIMIT_PER_MINUTE", "60"))
    app.add_middleware(RateLimitMiddleware, requests_per_minute=rate_limit)


# Security headers middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


# Request size limit (100MB for upload endpoints)
MAX_REQUEST_SIZE = 100 * 1024 * 1024  # 100MB


# Routes
app.include_router(auth.router)
app.include_router(papers.router)
app.include_router(categories.router)
app.include_router(tags.router)
app.include_router(highlights.router)
app.include_router(doi.router)
app.include_router(notes.router)
app.include_router(summarize.router)
app.include_router(admin.router)
app.include_router(ai_usage.router)

# Serve uploaded files
uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")


@app.get("/api/health")
def health_check():
    return {"status": "ok"}
