# Papier

> A research paper management platform for academics. Upload, read, highlight, annotate, and get AI summaries — all in one place.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## Features

- 📄 **Upload & Import Papers** — Upload PDFs or import metadata via DOI
- 🖨️ **Integrated PDF Viewer** — Read and annotate PDFs directly in the app
- 🖍️ **Highlights & Annotations** — Mark important sections with different colors
- 📝 **Notes Per Paper** — Write insights linked directly to papers
- 🤖 **AI Summaries** — Get automatic summaries powered by AI
- 🏷️ **Categories & Tags** — Organize papers with flexible categories and tags
- 🔐 **Google Auth** — Sign in with your Google account
- 📧 **Mailing List** — Automatic subscription via kirim.email

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, React Router |
| Backend | FastAPI, SQLAlchemy, PostgreSQL |
| AI | DeepSeek API (configurable) |
| Storage | Cloudflare R2 / Local |
| Email | kirim.email API v3 |
| Auth | JWT + Google OAuth 2.0 |

## Quick Start (Development)

### Prerequisites
- Python 3.10+
- Node.js 18+
- npm

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/papier.git
cd papier

# Backend
cd backend
pip install -r requirements.txt
cp .env.example .env  # Edit .env with your credentials
cd ..

# Frontend
npm install
cp frontend/.env.example frontend/.env  # Edit with your Google Client ID
```

### 2. Run

```bash
# Terminal 1: Backend
cd backend && python3 -m uvicorn app.main:app --reload --port 8000

# Terminal 2: Frontend
npm run dev
```

Open http://localhost:5173

## Deploy to Railway

See [backend/RAILWAY_DEPLOY.md](backend/RAILWAY_DEPLOY.md) for detailed instructions.

### Quick Steps:
1. Create a Railway project
2. Add the PostgreSQL plugin
3. Add Backend service (root: `/backend`)
4. Add Frontend service (root: `/`)
5. Set environment variables (see `.env.example` files)
6. Generate public domains

## Deploy for Free (Vercel + Render + Neon + Cloudflare R2)

Frontend on Vercel, backend on Render (free), PostgreSQL on Neon (free), and PDF storage on Cloudflare R2 (free). The backend runs on Render's native Python runtime — no Docker needed.

### 1. Database — Neon (free PostgreSQL)

1. Create a project at [neon.tech](https://neon.tech) and pick a region close to your users.
2. Copy the **pooled** connection string, e.g. `postgresql://user:pass@host/db?sslmode=require`.
   The app automatically converts `postgres://` to `postgresql://` (`backend/app/database.py`).

### 2. Storage — Cloudflare R2

1. Create a bucket (e.g. `research-lib`).
2. Create an **R2 API token** with `Object Read & Write` permission.
3. Collect `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`.

> R2 is required on Render free: free web services have **no persistent disk**, so uploaded PDFs would otherwise be lost on redeploy.

### 3. Backend — Render (free)

Deploy using the `render.yaml` blueprint at the repo root, or create the service manually:

| Setting | Value |
|---------|-------|
| Root Directory | `backend` |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `python migrate.py && uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Instance Type | Free |
| Health Check Path | `/api/health` |

Set the environment variables listed above (see `backend/.env.example`). `migrate.py` runs automatically on every deploy (idempotent) and promotes the first user to admin.

> **Note:** Render free services spin down after 15 minutes of inactivity, so the first request after idle takes ~30–60s. Fine for academic/low-traffic use.

### 4. Frontend — Vercel

Set these environment variables in the Vercel project, then redeploy (Vite reads `VITE_*` at build time):

```text
VITE_API_URL=https://<your-render-service>.onrender.com
VITE_GOOGLE_CLIENT_ID=<your-google-client-id>
```

### 5. Google OAuth

In Google Cloud Console, add the Vercel domain to **Authorized JavaScript origins** (keep `http://localhost:5173` for local dev).

## Environment Variables

### Backend (`backend/.env.example`)
| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection URL |
| `SECRET_KEY` | JWT signing secret |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret |
| `KIRIM_EMAIL_AUTH_ID` | kirim.email username |
| `KIRIM_EMAIL_API_KEY` | kirim.email API key |
| `KIRIM_EMAIL_LIST_ID` | kirim.email subscriber list ID |
| `AI_BASE_URL` | AI API base URL |
| `AI_API_KEY` | AI API key |
| `R2_*` | Cloudflare R2 credentials (optional) |

### Frontend (`frontend/.env.example`)
| Variable | Description |
|----------|-------------|
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth Client ID (same as backend) |
| `VITE_API_URL` | Backend API URL (e.g. `https://your-backend.up.railway.app`) |

## License

[MIT](LICENSE) — Free for academic use.