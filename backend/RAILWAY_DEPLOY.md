# Railway Deployment Notes

## PostgreSQL

1. Add a PostgreSQL service in Railway.
2. Copy the PostgreSQL connection URL into the backend service variable:

```text
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
```

The app also accepts `postgres://...` and converts it for SQLAlchemy.

## Backend Variables

Set these variables in the Railway backend service:

```text
DATABASE_URL=<Railway PostgreSQL URL>
SECRET_KEY=<long random secret>
CORS_ORIGINS=https://your-frontend-domain.up.railway.app
```

For local development, the app still falls back to SQLite when `DATABASE_URL` is not set.

## Start Command

If the Railway root directory is set to `backend`, use this start command:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

If the Railway root directory is the repository root instead, use:

```bash
cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

## Tables

The app currently creates tables automatically using `Base.metadata.create_all(bind=engine)` when it starts. For production, consider adding Alembic migrations later.

## File Uploads

Uploaded PDFs are currently stored in `backend/uploads`. Railway's filesystem can be ephemeral, so production uploads should move to persistent storage such as S3, Supabase Storage, Cloudinary, or a Railway volume.
