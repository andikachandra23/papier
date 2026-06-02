# Railway Deployment Guide — Papier

Papier dirancang sebagai Railway monorepo dengan arsitektur terpisah:

| Service | Root Directory | Runtime |
|---------|---------------|---------|
| **Backend** | `backend/` | FastAPI + Uvicorn |
| **Frontend** | `/` (repo root) | Vite static → `npx serve` |
| **Database** | Railway PostgreSQL Plugin | PostgreSQL 15+ |

---

## Prerequisites

- GitHub repository sudah di-push (https://github.com/andikachandra23/papier)
- Akun Railway (https://railway.app)
- Akun Google Cloud Console (untuk OAuth)
- API key DeepSeek atau provider AI lainnya
- *(Opsional)* Akun Cloudflare untuk R2 storage

---

## 1. Persiapan GitHub

Pastikan semua perubahan sudah ter-commit dan ter-push:

```bash
git add -A
git commit -m "feat: prepare for Railway deployment"
git push origin main
```

---

## 2. Buat Railway Project

1. Buka https://railway.app
2. Login dengan GitHub
3. Klik **"New Project"**
4. Pilih **"Deploy from GitHub Repo"**
5. Pilih repository `andikachandra23/papier`

---

## 3. Tambahkan PostgreSQL

1. Di Railway project dashboard, klik **"+ New"**
2. Pilih **"Database"** → **"PostgreSQL"**
3. Railway otomatis membuat database dan generate `DATABASE_URL`
4. Service yang terhubung ke PostgreSQL akan otomatis mendapat env `DATABASE_URL`

> **Catatan:** Format URL dari Railway bisa `postgres://`. Aplikasi sudah menangani konversi ke `postgresql://` secara otomatis (`database.py` line 10-11).

---

## 4. Deploy Backend Service

> **Konfigurasi via `railway.toml`:** Service ini sudah memiliki config file di `backend/railway.toml` yang mengatur build & deploy behavior secara otomatis. Railway akan membaca config ini saat deploy — tidak perlu set manual via dashboard.

### 4.1 Buat Service

1. Klik **"+ New"** → **"GitHub Repo"** → pilih repo `papier`
2. Setelah service terbuat, masuk ke **Settings**:

| Setting | Value | Sumber |
|---------|-------|--------|
| **Service Name** | `backend` (atau nama bebas) | Dashboard |
| **Root Directory** | `backend` | Dashboard |
| **Start Command** | `python migrate.py && uvicorn app.main:app --host 0.0.0.0 --port $PORT` | `backend/railway.toml` ✅ |

> **Catatan:** Jika Railway mendeteksi `backend/railway.toml`, **Start Command** akan otomatis terisi dari config file. Pastikan Root Directory di-set ke `backend` agar Railway menemukan file-nya.
>
> **Auto Migration:** Script `migrate.py` otomatis berjalan setiap kali deploy. Script ini:
> 1. Membuat semua tabel dari model SQLAlchemy (`create_all`)
> 2. Menambahkan kolom yang belum ada (role, is_active, name, auth_provider)
> 3. Seed default settings (AI_BASE_URL, AI_API_KEY, AI_MODEL)
> 4. Promote user pertama menjadi admin (jika belum ada admin)
>
> Script ini **idempotent** — aman dijalankan berulang kali tanpa efek samping.

3. **Connect ke PostgreSQL:**
   - Di tab **"Variables"** → klik **"New Variable"**
   - Pilih **"Add Reference"** → pilih variable `DATABASE_URL` dari PostgreSQL service

### 4.2 Set Environment Variables

Buka tab **"Variables"** backend service, tambahkan semua variable berikut:

#### Wajib (Required)

```text
SECRET_KEY=jb_CWWhYxILtY5kbuuqkxLd3Wz6WApysu4bQw4OdO4k2IfDbjUWtLxKWILvo9mqaPo8e5PKUkqTcuNS9NhIhCQ
CORS_ORIGINS=https://your-frontend-domain.up.railway.app
ENVIRONMENT=production
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
AI_BASE_URL=https://api.deepseek.com
AI_API_KEY=your-deepseek-api-key
AI_MODEL=deepseek-chat
```

#### Opsional

```text
RATE_LIMIT_PER_MINUTE=60
AI_DEFAULT_MODEL=mimo-v2.5-pro
CONTACT_EMAIL=admin@papier.app

# kirim.email integration
KIRIM_EMAIL_AUTH_ID=your-kirim-email-auth-id
KIRIM_EMAIL_API_KEY=your-kirim-email-api-key
KIRIM_EMAIL_LIST_ID=your-kirim-email-list-id

# Cloudflare R2 (SANGAT DISARANKAN untuk production)
R2_ACCOUNT_ID=your-r2-account-id
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_BUCKET_NAME=research-lib
```

> **Penting:** `CORS_ORIGINS` harus diisi dengan URL frontend Railway. Update setelah frontend domain diketahui (Langkah 6).

> **Penting:** Tanpa Cloudflare R2 (`R2_*`), file PDF yang diupload akan tersimpan di filesystem Railway yang **ephemeral** — hilang saat redeploy. **Sangat disarankan menggunakan R2 untuk production.**

---

## 5. Deploy Frontend Service

> **Konfigurasi via `railway.toml`:** Service ini sudah memiliki config file di `railway.toml` (root repository) yang mengatur build & deploy behavior secara otomatis. Railway akan membaca config ini saat deploy — tidak perlu set manual via dashboard.

### 5.1 Buat Service

1. Klik **"+ New"** → **"GitHub Repo"** → pilih repo yang sama
2. Setelah service terbuat, masuk ke **Settings**:

| Setting | Value | Sumber |
|---------|-------|--------|
| **Service Name** | `frontend` (atau nama bebas) | Dashboard |
| **Root Directory** | `/` (repository root) | Dashboard |
| **Build Command** | `npm install && npm run build` | `railway.toml` ✅ |
| **Start Command** | `npx serve dist -l $PORT -s` | `railway.toml` ✅ |

> **Catatan:** Jika Railway mendeteksi `railway.toml` di root, **Build Command** dan **Start Command** akan otomatis terisi dari config file. Pastikan Root Directory di-set ke `/` agar Railway menemukan file-nya.

### 5.2 Set Environment Variables

```text
VITE_API_URL=https://your-backend-domain.up.railway.app
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

> **Penting:** `VITE_*` variables di-embed saat build time. Jika lupa set sebelum deploy, harus trigger **redeploy** setelah menambahkannya.

---

## 6. Generate Public Domain

Untuk masing-masing service (backend dan frontend):

1. Buka service → tab **"Settings"**
2. Scroll ke bagian **"Networking"** → **"Public Networking"**
3. Klik **"Generate Domain"**
4. Catat URL yang diberikan Railway

Contoh hasil:
- Backend: `https://papier-backend-production.up.railway.app`
- Frontend: `https://papier-frontend-production.up.railway.app`

---

## 7. Final CORS Update

Setelah URL frontend diketahui, update environment variable backend:

1. Buka backend service → **"Variables"**
2. Edit `CORS_ORIGINS`:

```text
CORS_ORIGINS=https://papier-frontend-production.up.railway.app
```

Untuk mendukung multiple origins (production + local dev):

```text
CORS_ORIGINS=https://papier-frontend-production.up.railway.app,http://localhost:5173
```

3. Railway otomatis trigger redeploy

---

## 8. Google OAuth Production Setup

Buka Google Cloud Console → APIs & Credentials → OAuth 2.0 Client:

### Authorized JavaScript Origins
Tambahkan:
```
https://papier-frontend-production.up.railway.app
http://localhost:5173
```

### Authorized Redirect URIs
Tidak wajib untuk Google Identity Services popup flow, tapi aman jika ditambahkan:
```
https://papier-frontend-production.up.railway.app
```

---

## 9. Buat Admin User

Aplikasi tidak memiliki endpoint auto-create admin. Setelah backend running, buat admin user menggunakan salah satu metode berikut:

### Metode A: Railway CLI (Recommended)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login ke Railway
railway login

# Link ke project
railway link
# Pilih project → pilih backend service

# Jalankan create_user.py di environment Railway
railway run --service backend python create_user.py
```

### Metode B: Railway Shell

1. Buka backend service di Railway
2. Klik tab **"Settings"** → cari bagian **"Deploy"**
3. Buka Railway Shell (jika tersedia)
4. Jalankan:

```bash
python create_user.py
```

Default admin credentials:
- Email: `admin@papier.app`
- Password: `admin123`

> **Penting:** Segera ganti password setelah login pertama!

---

## 10. Verifikasi Deployment

Checklist verifikasi:

| # | Test | URL/Action | Expected Result |
|---|------|-----------|-----------------|
| 1 | Health check | `GET /api/health` | `{"status": "ok"}` |
| 2 | Landing page | Buka frontend URL | Halaman landing Papier |
| 3 | Login | Klik "Mulai Gratis" → Login | Form login muncul |
| 4 | Register | Buat akun baru | Berhasil, redirect ke library |
| 5 | Add paper | Tambah paper manual | Paper muncul di grid |
| 6 | Import DOI | Import via DOI: `10.1038/nature12373` | Metadata terisi otomatis |
| 7 | Upload PDF | Upload file PDF | PDF berhasil diupload dan bisa dibaca |
| 8 | AI Summary | Buka PDF → klik ikon summary | Ringkasan AI ter-generate |
| 9 | Admin panel | Login sebagai admin → `/admin` | Dashboard admin muncul |

---

## 11. Troubleshooting

### Backend tidak bisa start
- Cek logs di Railway: backend service → **"Deployments"** → klik deployment terbaru
- Pastikan `DATABASE_URL` ter-inject (Variables tab)
- Pastikan `requirements.txt` lengkap

### CORS error di frontend
- Pastikan `CORS_ORIGINS` di backend sesuai dengan URL frontend Railway
- Pastikan tidak ada trailing slash di URL

### PDF tidak bisa dibaca
- Tanpa R2: file PDF hilang setelah redeploy (filesystem ephemeral)
- Dengan R2: pastikan semua `R2_*` variables terisi dengan benar

### VITE variables tidak terbaca
- `VITE_*` variables di-embed saat build time
- Jika lupa set sebelum deploy: tambahkan variable → trigger **redeploy** manual

### Database connection error
- Pastikan backend service terhubung ke PostgreSQL service
- Cek format `DATABASE_URL` — harus dimulai dengan `postgresql://`

### AI Summarize gagal
- Pastikan `AI_API_KEY` dan `AI_BASE_URL` ter-set di environment variables
- Atau set melalui admin panel: `/admin` → Settings

---

## 12. File Upload & Storage

### Tanpa Cloudflare R2 (Development/Testing)
- PDF disimpan di filesystem Railway
- **Data hilang saat redeploy** karena Railway filesystem bersifat ephemeral
- Hanya cocok untuk testing

### Dengan Cloudflare R2 (Production)
- PDF disimpan di Cloudflare R2 (S3-compatible)
- Data persisten, tidak terpengaruh oleh redeploy
- Setup:
  1. Buat akun Cloudflare → R2 Object Storage
  2. Buat bucket (misal: `research-lib`)
  3. Buat API token dengan permission `Object Read & Write`
  4. Set `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`

---

## 13. Monitoring & Maintenance

### Health Check
```bash
curl https://your-backend.up.railway.app/api/health
# Expected: {"status": "ok"}
```

### View Logs
Railway Dashboard → Service → **"Deployments"** → klik deployment → **"View Logs"**

### Database Backup
Railway PostgreSQL memiliki automatic backup. Untuk manual backup:
```bash
# Via Railway CLI
railway connect postgresql
# Kemudian di psql:
# \q
```

### Update Aplikasi
Push ke GitHub → Railway otomatis trigger redeploy:
```bash
git add -A
git commit -m "fix: your changes"
git push origin main
# Railway auto-deploys dalam ~2-3 menit
```

---

## Arsitektur Akhir

```
┌─────────────────────────────────────────────────────┐
│                      Railway                         │
│                                                     │
│  ┌────────────────┐       ┌───────────────────────┐ │
│  │   Frontend      │──────▶│      Backend          │ │
│  │   Vite + React  │ HTTPS │      FastAPI          │ │
│  │   npx serve     │◀──────│      Uvicorn          │ │
│  └────────────────┘  API   └───────┬───────────────┘ │
│                                     │                 │
│                          ┌──────────▼──────────────┐  │
│                          │     PostgreSQL           │  │
│                          │     (Railway Plugin)     │  │
│                          └─────────────────────────┘  │
└─────────────────────────────────────────────────────┘
         │              │                    │
         ▼              ▼                    ▼
┌──────────────┐ ┌─────────────┐  ┌──────────────────┐
│ Google OAuth │ │ DeepSeek AI │  │ Cloudflare R2    │
│              │ │ API         │  │ (PDF Storage)    │
└──────────────┘ └─────────────┘  └──────────────────┘
```

---

## Perkiraan Biaya

| Komponen | Perkiraan |
|----------|-----------|
| Railway Starter Plan | $5/month (includes $5 usage credit) |
| Backend service | ~$1-3/month |
| Frontend service | ~$1-2/month |
| PostgreSQL | ~$1-2/month |
| **Total estimasi** | **~$5-7/month** |
| Cloudflare R2 (optional) | ~$0.015/GB/month |

> Railway Starter plan memberikan $5 usage credit per bulan. Untuk usage rendah, bisa gratis atau mendekati gratis.