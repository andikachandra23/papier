# Papier

> Platform manajemen paper penelitian untuk akademisi. Upload, baca, highlight, catat, dan dapatkan ringkasan AI — semua di satu tempat.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## Fitur

- 📄 **Upload & Impor Paper** — Upload PDF atau impor metadata via DOI
- 📖 **PDF Viewer Terintegrasi** — Baca dan anotasi PDF langsung di aplikasi
- 🖍️ **Highlight & Anotasi** — Tandai bagian penting dengan warna berbeda
- 📝 **Catatan Per Paper** — Tulis insight yang tertaut langsung ke paper
- 🤖 **Ringkasan AI** — Dapatkan ringkasan otomatis menggunakan AI
- 🏷️ **Kategori & Tag** — Organisir paper dengan kategori dan tag fleksibel
- 🔐 **Google Auth** — Login dengan akun Google
- 📧 **Mailing List** — Otomatis subscribe ke kirim.email

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
1. Create Railway project
2. Add PostgreSQL plugin
3. Add Backend service (root: `/backend`)
4. Add Frontend service (root: `/`)
5. Set environment variables (see `.env.example` files)
6. Generate public domains

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

## License

[MIT](LICENSE) — Gratis untuk penggunaan akademik.