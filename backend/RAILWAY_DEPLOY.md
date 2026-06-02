# Railway Deployment Guide

Papier is designed as a Railway monorepo with two separate services:

- **Backend service**: FastAPI, root directory `backend`
- **Frontend service**: Vite static app, root directory repository root `/`
- **Database**: Railway PostgreSQL plugin

## 1. Prepare GitHub

Push this repository to GitHub first:

```bash
git remote set-url origin https://github.com/andikachandra23/papier.git
git push -u origin main
```

If Git asks for credentials, use a GitHub Personal Access Token or configure SSH keys.

## 2. Create Railway Project

1. Open https://railway.app
2. Create a new project
3. Select **Deploy from GitHub repo**
4. Choose `andikachandra23/papier`

## 3. Add PostgreSQL

1. In the Railway project, click **New**
2. Choose **Database** -> **PostgreSQL**
3. Railway will create `DATABASE_URL` automatically for services connected to it

## 4. Backend Service

Create a service from the same GitHub repo with:

- **Root Directory**: `backend`
- **Start Command**:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Set these variables in the backend service:

```text
DATABASE_URL=<Railway PostgreSQL URL>
SECRET_KEY=<long random secret>
CORS_ORIGINS=https://your-frontend-domain.up.railway.app
ENVIRONMENT=production
RATE_LIMIT_PER_MINUTE=60

GOOGLE_CLIENT_ID=<Google OAuth Client ID>
GOOGLE_CLIENT_SECRET=<Google OAuth Client Secret>

KIRIM_EMAIL_AUTH_ID=<kirim.email username>
KIRIM_EMAIL_API_KEY=<kirim.email API key>
KIRIM_EMAIL_LIST_ID=<kirim.email list ID>

AI_BASE_URL=https://api.deepseek.com
AI_API_KEY=<AI API key>
AI_MODEL=deepseek-chat

R2_ACCOUNT_ID=<optional>
R2_ACCESS_KEY_ID=<optional>
R2_SECRET_ACCESS_KEY=<optional>
R2_BUCKET_NAME=<optional>
```

## 5. Frontend Service

Create a second service from the same GitHub repo with:

- **Root Directory**: `/` (repository root)
- **Build Command**:

```bash
npm install && npm run build
```

- **Start Command**:

```bash
npx serve dist -l $PORT -s
```

Set these variables in the frontend service:

```text
VITE_GOOGLE_CLIENT_ID=<same Google OAuth Client ID>
VITE_API_URL=https://your-backend-domain.up.railway.app
```

## 6. Google OAuth Production Setup

In Google Cloud Console, update OAuth credentials:

- **Authorized JavaScript origins**:
  - `https://your-frontend-domain.up.railway.app`
  - `http://localhost:5173` for local dev

No redirect URI is required for Google Identity Services popup flow, but adding the frontend URL is safe.

## 7. Final CORS Update

After Railway generates the frontend domain, update backend `CORS_ORIGINS`:

```text
CORS_ORIGINS=https://your-frontend-domain.up.railway.app
```

If using multiple origins:

```text
CORS_ORIGINS=https://your-frontend-domain.up.railway.app,http://localhost:5173
```

## 8. Tables

The app currently creates tables automatically using:

```python
Base.metadata.create_all(bind=engine)
```

For long-term production use, consider adding Alembic migrations.

## 9. File Uploads

Local uploads are stored in `backend/uploads`, but Railway filesystem can be ephemeral. For production, use Cloudflare R2 by setting the `R2_*` variables.

## 10. Health Check

Backend health endpoint:

```text
GET /api/health
```
