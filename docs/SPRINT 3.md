# Rencana Fitur AI Highlight & Notes

## Gambaran Umum

Fitur ini memungkinkan AI untuk menganalisis teks PDF secara otomatis berdasarkan kata kunci, menemukan kalimat-kalimat relevan, dan memungkinkan user memindahkan kutipan tersebut ke Notes global lengkap dengan referensi ilmiah.

---

## Alur Sistem

```
Buka PDF
  → Ekstrak teks per halaman (PDF.js)
  → Ambil kata kunci: tag kategori paper + input manual user
  → Kirim ke Claude API (per-chunk jika paper panjang)
  → Claude return: kalimat relevan + nomor halaman
  → Tampilkan di panel "AI Findings" di samping PDF
  → User pilih kalimat → klik "+ Notes"
  → Tersimpan di Notes global dengan referensi otomatis
```

---

## Desain Layout PDF Viewer (3 Kolom)

```
┌─────────────────────────────────────────────────────┐
│  ← Kembali   [Judul Paper]          [Kata Kunci]    │
├──────────────┬──────────────────────┬────────────────┤
│              │                      │  AI Findings   │
│  Daftar      │    PDF Viewer        │  ──────────    │
│  Halaman     │    (PDF.js)          │  [kalimat 1] + │
│  (thumbnail) │                      │  [kalimat 2] + │
│              │                      │  [kalimat 3] + │
│              │                      │                │
│              │                      │  Notes Preview │
└──────────────┴──────────────────────┴────────────────┘
```

---

## Komponen Baru

### 1. Panel Kata Kunci

- Tag dari kategori paper muncul otomatis (pre-filled)
- User bisa tambah atau hapus kata kunci secara manual
- Tombol **"Analisis"** untuk trigger Claude API
- Indikator status: idle / loading / selesai

### 2. Panel AI Findings

Tiap temuan ditampilkan sebagai card:

```
┌─────────────────────────────────────┐
│ Hal. 3                    [+ Notes] │
│ "...kalimat relevan yang ditemukan  │
│ oleh AI berdasarkan kata kunci..."  │
│ ░░░░░░░░░░ relevance indicator      │
└─────────────────────────────────────┘
```

- Klik card → PDF scroll ke halaman yang dimaksud
- Klik **+ Notes** → kutipan masuk ke Notes dengan referensi otomatis

### 3. Notes Global

Satu halaman notes yang menampung kutipan dari berbagai paper sekaligus:

```
┌─────────────────────────────────────────────────────┐
│  Notes Penelitian       [Export: APA / IEEE / ...]  │
├─────────────────────────────────────────────────────┤
│  + Tambah catatan bebas                             │
├─────────────────────────────────────────────────────┤
│  [Kutipan dari AI]                                  │
│  "kalimat yang dipilih user..."                     │
│  → Vaswani et al. (2017). Attention Is All You      │
│    Need. hal. 3.                           [Hapus]  │
├─────────────────────────────────────────────────────┤
│  [Kutipan dari AI]                                  │
│  "kalimat lain dari paper berbeda..."               │
│  → Brown et al. (2020). GPT-3. hal. 7.    [Hapus]  │
└─────────────────────────────────────────────────────┘
```

---

## Format Referensi

User memilih format di Notes — semua kutipan berubah sekaligus:

| Format | Contoh Output |
|---|---|
| APA | Vaswani, A., et al. (2017). *Attention Is All You Need*. p. 3. |
| IEEE | A. Vaswani et al., "Attention Is All You Need," 2017, p. 3. |
| Chicago | Vaswani, Ashish, et al. "Attention Is All You Need." 2017, p. 3. |
| Vancouver | Vaswani A, et al. Attention Is All You Need. 2017. p. 3. |
| Bebas | Judul · Penulis · Tahun · Hal. 3 |

---

## Skema Database Tambahan

```
notes
  id, title, created_at, updated_at

note_entries
  id, note_id, type ('ai_quote' | 'manual'),
  content, paper_id, page_number, created_at

papers
  + keywords  (JSON array)  ← kolom baru
```

---

## Batasan Teknis

### Tidak bisa dihindari

- **PDF scan tanpa OCR** — teks tidak bisa diekstrak, AI tidak bisa bekerja. Perlu pesan error yang jelas kepada user.
- **PDF layout 2 kolom** — urutan teks kadang berantakan saat diekstrak dengan PDF.js. Kalimat yang ditemukan AI bisa terpotong tidak wajar.
- **Paper sangat panjang (100+ halaman)** — Claude API memiliki batas token. Teks harus dikirim per-chunk, bukan sekaligus. Perlu logika pembagian chunk yang mempertahankan konteks antar halaman.

### Disederhanakan secara sadar

- **Highlight visual overlay di PDF tidak diimplementasi** di fase ini — terlalu kompleks untuk HTML single file. Gantinya: klik card AI Findings → PDF scroll ke halaman relevan.
- Highlight overlay bisa ditambahkan di fase berikutnya saat migrasi ke React proper.

---

## Fase Pengerjaan (Revisi Fase 3)

### Fase 3A — PDF Viewer & Ekstraksi Teks
- [ ] Embed PDF.js dalam aplikasi
- [ ] Ekstraksi teks per halaman
- [ ] Navigasi halaman dan scroll programatik
- [ ] Deteksi PDF scan (tidak ada teks → tampilkan peringatan)

### Fase 3B — Integrasi AI
- [ ] Panel kata kunci: auto-fill dari tag + input manual
- [ ] Logika chunking teks untuk paper panjang
- [ ] Integrasi Deepseek API — kirim teks + kata kunci, terima findings
- [ ] Tampilkan AI Findings sebagai card di panel samping
- [ ] Klik card → scroll PDF ke halaman relevan

### Fase 3C — Notes Global
- [ ] Halaman Notes tersendiri, dapat diakses dari sidebar
- [ ] Tambah kutipan dari AI Findings (+ nomor halaman otomatis)
- [ ] Tambah catatan manual bebas
- [ ] Pilih format referensi (APA, IEEE, Chicago, Vancouver, Bebas)
- [ ] Semua kutipan update format secara realtime saat format diganti
- [ ] Export: copy ke clipboard, download `.txt`, download `.bib`
