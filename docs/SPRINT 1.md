# Rencana Aplikasi Web Manajemen Penelitian

## Overview

Aplikasi web personal untuk manajemen paper dan artikel ilmiah, dengan fitur utama manajemen library, kategorisasi, import via DOI, dan PDF viewer dengan highlight.

---

## Stack Teknologi

| Layer | Pilihan |
|---|---|
| Frontend | React + Vite |
| UI | shadcn/ui + Tailwind CSS |
| Backend | FastAPI (Python) |
| Database | SQLite via SQLAlchemy |
| PDF Viewer | PDF.js |
| DOI Import | CrossRef API + Unpaywall API |
| Auth | JWT (single user) |

---

## Arsitektur Aplikasi

```
Frontend (React)  ←→  Backend (FastAPI)  ←→  SQLite
                              ↕
                    CrossRef / Unpaywall API
                    PDF file storage (lokal)
```

---

## Struktur Database

| Tabel | Kolom Utama |
|---|---|
| `users` | id, email, password_hash |
| `papers` | id, title, authors, year, abstract, doi, pdf_path, created_at |
| `categories` | id, name, color, parent_id |
| `paper_categories` | paper_id, category_id *(many-to-many)* |
| `tags` | id, name |
| `paper_tags` | paper_id, tag_id *(many-to-many)* |
| `highlights` | id, paper_id, page, position, color, text, created_at |
| `reading_list` | paper_id, added_at |

> `parent_id` pada tabel `categories` memungkinkan subkategori seperti di sidebar aplikasi referensi.

---

## Fase Pengerjaan

### Fase 1 — Core (Fondasi)

> Harus selesai sebelum fase berikutnya dimulai.

- [ ] Auth — login/logout, JWT token, session management
- [ ] Library view — tampilan grid card (judul, author, tahun, kategori)
- [ ] Add paper manual — input form judul, author, tahun, abstract, tag
- [ ] Import via DOI — fetch metadata otomatis dari CrossRef API
- [ ] Kategori & subkategori — sidebar, bisa tambah/edit/hapus
- [ ] Upload PDF — simpan lokal, terhubung ke data paper

### Fase 2 — Management & Organisasi

- [ ] Filter & sort — by tahun, author, kategori, recently accessed
- [ ] Search — full-text search judul, author, abstract
- [ ] Reading list — tandai paper untuk dibaca nanti
- [ ] Tag sistem — tagging bebas di luar kategori
- [ ] Bulk action — pindah kategori, hapus, export metadata

### Fase 3 — PDF Viewer

> Implementasi highlight persisten butuh effort ekstra, jangan diremehkan.

- [ ] Embedded PDF reader — buka PDF dalam aplikasi (PDF.js)
- [ ] Highlight teks — pilih warna highlight
- [ ] Simpan highlight — tersimpan ke database per paper, muncul kembali saat dibuka ulang

### Fase 4 — Polish & Ekspansi

- [ ] Export — BibTeX, CSV, JSON untuk keperluan sitasi
- [ ] Canvases *(opsional, dikembangkan sesuai kebutuhan)*
- [ ] Notebooks *(opsional, dikembangkan sesuai kebutuhan)*

---

## Urutan Pengerjaan

1. Setup project — React + FastAPI + SQLite
2. Auth — login/logout dengan JWT
3. Database schema + API endpoints dasar
4. Frontend: sidebar kategori + library grid
5. Add paper manual + import via DOI
6. Filter, sort, search
7. PDF viewer + highlight persisten
8. Polish UI + export

---

## Catatan Penting

- **Highlight persisten** (Fase 3) adalah fitur yang paling kompleks secara teknis. Perlu menyimpan koordinat posisi teks di PDF ke database, lalu merender ulang highlight saat dokumen dibuka. Alokasikan waktu lebih untuk ini.
- **DOI import** menggunakan dua API secara berurutan: CrossRef untuk metadata (judul, author, tahun, abstract), lalu Unpaywall untuk mendapatkan link PDF open access jika tersedia.
- **Database lokal** berarti data tidak bisa diakses dari device lain. Jika ke depannya butuh akses multi-device, perlu migrasi ke self-hosted server.
- **Notebooks dan Canvases** sengaja dikeluarkan dari scope awal untuk menjaga fokus pengerjaan.
