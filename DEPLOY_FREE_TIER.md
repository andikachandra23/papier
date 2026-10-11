# ✅ Checklist Deploy Papier — Free Tier

> Panduan langkah-demi-langkah (manual / klik-demi-klik) untuk meng-online-kan Papier dengan biaya **$0/bulan**.
>
> **Stack:** Frontend di **Vercel** (sudah ada) · Backend FastAPI di **Render Free** · Database di **Neon PostgreSQL Free** · Storage PDF di **Cloudflare R2 Free**.
>
> Ikuti kotak centang `[ ]` secara urut. **Langkah 0 wajib dikerjakan lebih dulu.**

## Arsitektur Target

```text
Browser
   │
   ▼
Vercel (React SPA)  ── VITE_API_URL ──▶  Render (FastAPI + Uvicorn)
                                             │            │
                                             ▼            ▼
                                   Neon PostgreSQL   Cloudflare R2 (PDF)
```

## Prasyarat Akun

- [ ] Akun GitHub (repo: `andikachandra23/papier`)
- [ ] Akun **Neon** — https://neon.tech
- [ ] Akun **Cloudflare** (R2 diaktifkan) — https://dash.cloudflare.com
- [ ] Akun **Render** — https://dashboard.render.com
- [ ] Google Cloud Console (OAuth Client ID sudah ada)
- [ ] API key provider AI (mis. DeepSeek)

---

## LANGKAH 0 — Push ke GitHub ⚠️ (kerjakan pertama)

Repo lokal punya commit yang belum ter-push (termasuk `render.yaml`, `vercel.json`, `DEPLOY_FREE_TIER.md`).
Cek dulu:

```bash
cd /Users/andika/Documents/WORK/PRIBADI/PROJECT/manajemen-riset
git status -sb                                  # harapkan: "## main...origin/main [ahead N]"
git --no-pager log --oneline origin/main..main  # daftar commit yang akan dikirim
```

> Remote memakai **HTTPS** → saat push, git meminta **Username + Password**, dan **password akun GitHub sudah tidak berlaku**. Gunakan **PAT** (Metode A) atau login browser via `gh` (Metode B).

### Metode A — Personal Access Token (paling cepat, tanpa install)

1. Buat token: https://github.com/settings/tokens → **Tokens (classic)** → **Generate new token (classic)** → scope **`repo`** → Generate → salin (`ghp_…`, hanya tampil sekali).
2. Push lalu isi username `andikachandra23` dan tempel token sebagai password:

```bash
cd /Users/andika/Documents/WORK/PRIBADI/PROJECT/manajemen-riset
git push origin main
# Username for 'https://github.com': andikachandra23
# Password for 'https://andikachandra23@github.com': <tempel PAT — tidak terlihat saat dipaste>
```

> Token otomatis tersimpan di macOS Keychain → push berikutnya tidak akan prompt lagi.

### Metode B — GitHub CLI (login via browser)

```bash
brew install gh
gh auth login            # GitHub.com -> HTTPS -> Login with a web browser
gh auth setup-git
cd /Users/andika/Documents/WORK/PRIBADI/PROJECT/manajemen-riset && git push origin main
```

### Metode C — SSH (alternatif, sekali setup)

```bash
ssh-keygen -t ed25519 -C "136653807+andikachandra23@users.noreply.github.com"
pbcopy < ~/.ssh/id_ed25519.pub     # tempel di https://github.com/settings/keys -> New SSH key
ssh -T git@github.com              # uji: "Hi andikachandra23! You've successfully authenticated..."
cd /Users/andika/Documents/WORK/PRIBADI/PROJECT/manajemen-riset
git remote set-url origin git@github.com:andikachandra23/papier.git
git push origin main
```

### Verifikasi berhasil

```bash
git fetch origin
git status -sb      # harapkan: "## main...origin/main" (TANPA "[ahead ...]")
```

- [ ] `git status` bersih (tidak ada "ahead")
- [ ] Di https://github.com/andikachandra23/papier terlihat `render.yaml`, `vercel.json`, `DEPLOY_FREE_TIER.md`

### Jika muncul error

| Error | Solusi |
|---|---|
| `could not read Username ... prompts disabled` | Belum ada kredensial → jalankan Metode A / B / C |
| `Authentication failed` / `password authentication was removed` | Isi **PAT** (bukan password akun) sebagai password |
| `Permission ... denied` | Token kurang scope **`repo`** atau username salah |
| `[rejected] ... (fetch first)` | `git pull --rebase origin main` lalu push lagi |

> Jangan pernah menempelkan token ke dalam chat.

---

## LANGKAH 1 — Database: Neon PostgreSQL (gratis)

- [ ] Buka https://neon.tech → Sign up → **New Project**
- [ ] Region: **Singapore** (terdekat)
- [ ] Setelah dibuat, buka **Connection Details**
- [ ] Pilih **Connection string** tipe **Pooled connection**
- [ ] Salin URL (format `postgresql://…?sslmode=require`) → simpan sebagai `DATABASE_URL`

> Neon free bersifat *scale-to-zero* → request pertama setelah idle ~0,5–1 detik (normal).

---

## LANGKAH 2 — Storage: Cloudflare R2 (gratis)

- [ ] Buka https://dash.cloudflare.com → menu **R2**
- [ ] (Jika diminta) aktifkan R2 & tambahkan metode pembayaran — tetap **gratis** dalam batas free tier
- [ ] **Create bucket** → nama: `research-lib` → region: **Automatic**
- [ ] **Manage R2 API Tokens → Create API Token** → permission **Object Read & Write**
- [ ] Catat hasilnya:
  - [ ] **Access Key ID** → `R2_ACCESS_KEY_ID`
  - [ ] **Secret Access Key** → `R2_SECRET_ACCESS_KEY`
- [ ] Catat **Account ID** (halaman utama R2) → `R2_ACCOUNT_ID`
- [ ] `R2_BUCKET_NAME` = `research-lib`

> R2 **WAJIB**: Render free tidak punya persistent disk, jadi tanpa R2 file PDF hilang saat redeploy.
> CORS di R2 **tidak perlu** — PDF disajikan lewat backend (`/api/papers/{id}/pdf`).

---

## LANGKAH 3 — Backend: Render Free (via Blueprint)

Butuh: repo sudah ter-push (Langkah 0), `DATABASE_URL` (Langkah 1), kredensial R2 (Langkah 2), serta Google & AI keys.

### 3.1 Hubungkan GitHub ke Render

- [ ] Buka https://dashboard.render.com → **Sign in with GitHub**
- [ ] Izinkan Render mengakses repo `andikachandra23/papier` (GitHub App); jika perlu **Configure account** → beri akses ke repo tersebut

### 3.2 Buat Blueprint

- [ ] **New +** → pilih **Blueprint**
- [ ] Pilih repository `andikachandra23/papier`
- [ ] Render mendeteksi `render.yaml` → beri nama Blueprint (mis. `papier`)
- [ ] Render menampilkan 1 resource: **Web Service `papier-backend`** (Free · Singapore · rootDir `backend`)

### 3.3 Isi Environment Variables

Saat klik **Apply**, Render meminta nilai untuk variabel `sync: false`:

| Env var | Nilai | Sumber |
|---|---|---|
| `DATABASE_URL` | `postgresql://…?sslmode=require` | Langkah 1 (Neon) |
| `SECRET_KEY` | string acak 64 char | generate (bawah) |
| `CORS_ORIGINS` | `https://placeholder.example` (sementara) | diubah di Langkah 4 |
| `GOOGLE_CLIENT_ID` | `…apps.googleusercontent.com` | Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | `…` | Google Cloud Console |
| `AI_API_KEY` | API key AI | DeepSeek |
| `R2_ACCOUNT_ID` | `…` | Langkah 2 |
| `R2_ACCESS_KEY_ID` | `…` | Langkah 2 |
| `R2_SECRET_ACCESS_KEY` | `…` | Langkah 2 |

Generate `SECRET_KEY`:

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(64))"
```

> Variabel non-rahasia (`ENVIRONMENT=production`, `PYTHON_VERSION=3.11.9`, `AI_BASE_URL`, `AI_MODEL`, `RATE_LIMIT_PER_MINUTE`, `CONTACT_EMAIL`, `R2_BUCKET_NAME`) sudah otomatis dari `render.yaml` — tidak perlu diisi manual.

### 3.4 Deploy & Verifikasi

- [ ] Klik **Create / Apply Blueprint** → tunggu build & deploy (~2–5 menit)
- [ ] Buka tab **Logs** → tunggu sampai muncul `✅ Migration complete!`
- [ ] Catat **URL service**, mis. `https://papier-backend.onrender.com`
- [ ] Tes health: buka `https://papier-backend.onrender.com/api/health` → harus `{"status":"ok"}`

```bash
curl -s https://papier-backend.onrender.com/api/health   # {"status":"ok"}
```

> `migrate.py` berjalan tiap deploy (idempotent): buat tabel, tambah kolom, seed setting AI, dan promote **user pertama** jadi admin.

### 3.5 Troubleshooting LANGKAH 3

| Gejala | Penyebab | Solusi |
|---|---|---|
| Build gagal di `pip install` | wheel / versi Python | `PYTHON_VERSION=3.11.9` sudah diset; cek log build |
| Deploy sukses tapi health check gagal (503) | `migrate.py` error / DB tak connect | cek `DATABASE_URL` (harus `postgresql://`, bukan `postgres://`), cek log |
| `ModuleNotFoundError: No module named 'app'` | rootDir / start command salah | Root Directory = `backend`, start `uvicorn app.main:app` |
| API 500 saat dipakai | env kurang (R2/AI) | lengkapi `R2_*` / `AI_API_KEY`, cek log |
| Service tidur / lambat | Free spin-down (~15 menit idle) | normal; request pertama lambat |
| Perlu ubah env | — | **Environment** → ubah → Render restart otomatis |

---

## LANGKAH 4 — Frontend: Vercel

- [ ] Buka project Papier di Vercel → **Settings → Environment Variables**
- [ ] Tambahkan (untuk Production, Preview, Development):
  - [ ] `VITE_API_URL` = `https://papier-backend.onrender.com` (tanpa `/api`)
  - [ ] `VITE_GOOGLE_CLIENT_ID` = `<google-client-id>`
- [ ] **Deployments → ⋯ → Redeploy** (WAJIB: `VITE_*` dibaca saat build)
- [ ] Catat domain Vercel (mis. `https://papier.vercel.app`)
- [ ] Balik ke **Render → Environment** → set `CORS_ORIGINS=https://papier.vercel.app` (boleh ditambah `,http://localhost:5173` untuk dev)

---

## LANGKAH 5 — Google OAuth

- [ ] Buka https://console.cloud.google.com → **APIs & Services → Credentials**
- [ ] Pilih **OAuth 2.0 Client ID** (tipe Web)
- [ ] **Authorized JavaScript origins** → tambahkan:
  - [ ] `https://papier.vercel.app`
  - [ ] `http://localhost:5173`
- [ ] Simpan

---

## LANGKAH 6 — Akun Admin

> ⚠️ **Render Free TIDAK mendukung Shell/SSH** — jadi `python create_user.py` **tidak bisa** dijalankan dari dashboard Render. Gunakan salah satu cara di bawah.

### Cara 1 (termudah) — Register lalu redeploy

- [ ] Register user pertama lewat frontend (`/login` → buat akun)
- [ ] Di Render → service → **Manual Deploy → Deploy latest commit** (restart)
- [ ] `migrate.py` mendeteksi belum ada admin → **promote user pertama jadi admin**

### Cara 2 — Jalankan `create_user.py` dari komputer lokal (menuju Neon)

```bash
cd backend
DATABASE_URL='postgresql://…neon…?sslmode=require' python create_user.py
```

Default: `admin@papier.app` / `admin123` → **ganti password setelah login!**

> Jangan gunakan **Render Postgres** untuk produksi: free tier-nya hanya 1 GB & **kedaluwarsa 30 hari**. Tetap pakai **Neon**.

---

## LANGKAH 7 — Validasi End-to-End

- [ ] `GET /api/health` → `{"status":"ok"}`
- [ ] Register + login (email/password) → masuk ke `/app`
- [ ] Login dengan Google → berhasil
- [ ] Upload PDF → file muncul di bucket R2 (cek di dashboard Cloudflare)
- [ ] Buka PDF di viewer → tampil
- [ ] Import via DOI → metadata terisi
- [ ] AI Summarize → berjalan (butuh `AI_API_KEY`)
- [ ] Highlights, notes, tags, categories berfungsi
- [ ] (Admin) halaman admin menampilkan usage

---

## Ringkasan Environment Variables (Backend / Render)

| Variable | Wajib | Sumber / Catatan |
|---|---|---|
| `DATABASE_URL` | ✅ | Neon |
| `SECRET_KEY` | ✅ | generate acak |
| `CORS_ORIGINS` | ✅ | domain Vercel |
| `ENVIRONMENT` | ✅ | `production` (sudah di `render.yaml`) |
| `GOOGLE_CLIENT_ID` | ✅ | Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | ✅ | Google Cloud Console |
| `AI_BASE_URL` / `AI_MODEL` | ✅ | sudah di `render.yaml` |
| `AI_API_KEY` | ✅ | DeepSeek |
| `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET_NAME` | ✅ | Cloudflare R2 |
| `RATE_LIMIT_PER_MINUTE` | opsional | sudah di `render.yaml` (=60) |
| `CONTACT_EMAIL` | opsional | sudah di `render.yaml` |
| `KIRIM_EMAIL_*` | opsional | kirim.email |

---

## Troubleshooting

| Gejala | Penyebab umum | Solusi |
|---|---|---|
| Frontend error 404 saat panggil API | `VITE_API_URL` salah / belum redeploy | Set env & **redeploy** Vercel |
| "API returned HTML instead of JSON" | `VITE_API_URL` menunjuk ke frontend, bukan backend | Perbaiki `VITE_API_URL` |
| Login gagal / CORS error | `CORS_ORIGINS` ≠ domain Vercel | Update di Render → restart service |
| PDF hilang setelah redeploy | R2 belum aktif | Lengkapi semua `R2_*` |
| Google login gagal | Origin belum didaftarkan | Tambah di GCP (Langkah 5) |
| Build Render gagal | versi Python | `PYTHON_VERSION` sudah di-set `3.11.9` di `render.yaml` |
| Cold start lama / lambat | Render free tidur 15 menit | Normal; alternatif: Koyeb / Google Cloud Run |
| DB connection error | format URL | harus `postgresql://` (app auto-convert dari `postgres://`) |

---

## Catatan Penting

- **Render Free** tidur setelah **15 menit idle** → request pertama butuh ~30–60 detik.
- **Render Free tanpa persistent disk** → **Cloudflare R2 wajib**.
- **Vercel Hobby = non-komersial**. Jika dimonetisasi → butuh Vercel Pro ($20/bln).
- Semua langkah di atas **$0/bulan** selama berada dalam batas free tier.
- Setelah setup, deploy berikutnya cukup `git push` → Render auto-deploy (blueprint `autoDeploy: true`).
