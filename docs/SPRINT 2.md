# Rencana Fitur Canvases & Notebooks

## Gambaran Umum

Canvases dan Notebooks adalah dua fitur ekspansi yang saling melengkapi.
Canvas untuk berpikir secara visual, Notebook untuk menulis dan menyusun
argumen berbasis kutipan. Keduanya terintegrasi dengan AI menggunakan
MiMo V2.5-Pro via endpoint OpenAI-compatible.

---

## Integrasi AI — Stack

Semua fitur AI di Canvases dan Notebooks menggunakan:

```
Provider  : platform.deepseek.com
Model     : deepseek-v4-pro
Endpoint  : https://api.deepseek.com/v1
Library   : openai (Python), dengan base_url diarahkan ke Deepseek
API Key   : DEEPSEEK_API_KEY (sudah ada di .env, tidak perlu key baru)
```

**Inisialisasi client (reuse dari fitur sebelumnya):**

```python
from openai import OpenAI

client = OpenAI(
    api_key=os.environ["DEEPSEEK_API_KEY"],
    base_url="https://api.deepseek.com/v1"
)
```

---

## Canvases

Canvas hadir dalam tiga mode yang dipilih saat membuat canvas baru.
Setiap canvas menyimpan mode-nya secara permanen — tidak bisa diganti
setelah dibuat.

---

### Mode 1 — Knowledge Graph

Visualisasi hubungan antar paper sebagai node dan edge interaktif.

**Elemen:**
- **Node** — tiap paper dari library muncul sebagai kartu kecil berisi judul, penulis, tahun
- **Edge** — garis koneksi antar node dengan label relasi
- **Label relasi yang tersedia:** Mendukung · Membantah · Metodologi Serupa · Mengutip · Dikembangkan dari · Relevan

**Interaksi manual:**
- Drag node untuk mengatur posisi
- Tarik garis dari satu node ke node lain untuk membuat koneksi
- Klik node → panel samping tampilkan abstrak + highlights tersimpan
- Klik edge → edit atau hapus label relasi
- Zoom in/out dan pan canvas

**Fitur AI — Generate Koneksi Otomatis (Prioritas):**

User klik tombol **"Analisis Koneksi"** → AI membaca abstrak semua paper
di library → return koneksi yang disarankan beserta alasannya.

Prompt ke MiMo:

```
System:
Kamu adalah asisten penelitian ilmiah. Analisis daftar paper berikut
dan identifikasi hubungan yang bermakna antar paper.
Kembalikan JSON saja tanpa teks tambahan.

User:
Daftar paper:
{list_paper: id, judul, abstrak, tags}

Kembalikan JSON:
{
  "connections": [
    {
      "from_id": 1,
      "to_id": 3,
      "relation": "Mendukung",
      "reason": "Alasan singkat dalam Bahasa Indonesia"
    }
  ]
}
```

User bisa terima semua koneksi, pilih sebagian, atau tolak saran AI.

---

### Mode 2 — Infinite Whiteboard

Area tak terbatas untuk brainstorming bebas.

**Elemen yang bisa ditaruh:**
- Sticky note (warna bisa dipilih)
- Kotak teks bebas dengan formatting dasar (bold, italic, bullet)
- Kutipan dari AI Findings — bisa di-drag langsung dari panel Notes ke canvas
- Gambar (upload manual)
- Garis dan panah penghubung antar elemen
- Shape: kotak, lingkaran, diamond (untuk flowchart)

**Navigasi:**
- Zoom in/out via scroll atau pinch
- Pan via drag di area kosong
- Minimap di pojok bawah untuk orientasi

**Fitur AI — Organisasi Otomatis:**

User pilih beberapa sticky note → klik **"Kelompokkan dengan AI"** →
MiMo baca isi note → return pengelompokan berdasarkan tema.

---

### Mode 3 — Reading Board

Layout kolom Kanban untuk mengorganisir paper per status atau topik.

**Struktur:**
- Kolom dibuat dan dinamai bebas oleh user
- Contoh kolom: *Belum Dibaca · Sedang Dibaca · Relevan BAB 2 · Perlu Dikritisi · Selesai*
- Tiap kolom berisi card paper dari library
- Paper bisa di-drag antar kolom
- Klik card → buka detail paper

**Fitur AI — Klasifikasi Otomatis:**

User klik **"Klasifikasi Otomatis"** → MiMo baca abstrak tiap paper
+ nama kolom yang ada → saran penempatan paper ke kolom yang sesuai.

---

## Notebooks

Notebook berbasis blok yang fleksibel — tipe blok berbeda bisa
dicampur dalam satu halaman. Cocok untuk literature review, research
log, dan catatan bebas.

---

### Tipe Blok

| Blok | Fungsi |
|---|---|
| Heading (H1/H2/H3) | Judul section |
| Teks paragraf | Tulisan bebas dengan formatting dasar |
| Bullet list / Numbered list | Daftar poin |
| Kutipan | Teks kutipan dari AI Findings, otomatis dengan referensi |
| Paper card | Embed preview paper dari library (judul, penulis, abstrak singkat) |
| Checklist | Daftar tugas penelitian dengan checkbox |
| Divider | Garis pemisah antar section |
| AI Block | Blok khusus untuk prompt AI inline (lihat di bawah) |

---

### Template Notebook

User bisa pilih template saat membuat notebook baru:

**1. Literature Review**
```
# Judul Topik
## Pertanyaan Penelitian
[teks]
## Paper yang Relevan
[paper card]
## Sintesis Temuan
[kutipan] [teks]
## Kesimpulan
[teks]
```

**2. Research Log**
```
# Tanggal — Sesi Penelitian
## Yang Dibaca Hari Ini
[paper card]
## Temuan Penting
[kutipan]
## Pertanyaan yang Muncul
[checklist]
## Langkah Selanjutnya
[checklist]
```

**3. Catatan Bebas**
```
Halaman kosong — user mulai dari awal.
```

---

### Fitur AI di dalam Notebook

User bisa menambahkan **AI Block** di mana saja dalam notebook.
Ketik prompt, AI kerjakan langsung dalam konteks notebook tersebut.

**Contoh prompt yang didukung:**

| Prompt User | Yang AI Lakukan |
|---|---|
| "Rangkum semua kutipan di notebook ini menjadi satu paragraf" | Baca semua blok kutipan → tulis sintesis |
| "Cari paper di library saya yang relevan dengan topik notebook ini" | Baca judul + isi notebook → cari paper cocok dari database |
| "Tulis paragraf pembuka literature review berdasarkan catatan ini" | Generate teks akademis dari blok yang ada |
| "Identifikasi gap penelitian dari paper-paper yang saya kutip" | Analisis kutipan → temukan celah yang belum diteliti |
| "Ubah catatan ini ke format outline" | Restrukturisasi isi notebook jadi outline terstruktur |

**Prompt ke MiMo (AI Block):**

```
System:
Kamu adalah asisten penelitian ilmiah yang membantu user menyusun
literature review dan catatan penelitian. Konteks notebook saat ini
disertakan. Jawab dalam Bahasa Indonesia yang akademis dan jelas.

User:
Konteks notebook:
{isi_notebook_dalam_teks}

Permintaan user:
{prompt_user}
```

---

### Export Notebook

| Format | Isi |
|---|---|
| PDF | Layout notebook dengan formatting, referensi di akhir |
| Markdown (.md) | Teks plain dengan sitasi inline |
| Word (.docx) | Siap diedit lebih lanjut |
| BibTeX (.bib) | Daftar referensi semua paper yang dikutip |

Format sitasi bisa dipilih sebelum export: APA · IEEE · Chicago · Vancouver

---

## Skema Database Tambahan

```
canvases
  id, title, mode ('knowledge_graph' | 'whiteboard' | 'reading_board'),
  data (JSON — seluruh state canvas), created_at, updated_at

canvas_paper_connections       ← khusus mode knowledge_graph
  id, canvas_id, from_paper_id, to_paper_id, relation, reason, created_at

notebooks
  id, title, template ('literature_review' | 'research_log' | 'free'),
  created_at, updated_at

notebook_blocks
  id, notebook_id, type, content (JSON), position, created_at
```

> State canvas (posisi node, elemen whiteboard, kolom kanban) disimpan
> sebagai JSON di kolom `data` — lebih fleksibel daripada normalisasi penuh.

---

## Endpoint Backend Baru

| Endpoint | Method | Fungsi |
|---|---|---|
| `/api/canvases` | GET, POST | List dan buat canvas |
| `/api/canvases/{id}` | GET, PUT, DELETE | Detail, update state, hapus |
| `/api/canvases/{id}/ai-connections` | POST | Generate koneksi antar paper (Knowledge Graph) |
| `/api/canvases/{id}/ai-group` | POST | Kelompokkan sticky note (Whiteboard) |
| `/api/canvases/{id}/ai-classify` | POST | Klasifikasi paper ke kolom (Reading Board) |
| `/api/notebooks` | GET, POST | List dan buat notebook |
| `/api/notebooks/{id}` | GET, PUT, DELETE | Detail, update blok, hapus |
| `/api/notebooks/{id}/ai` | POST | Prompt AI dalam konteks notebook |
| `/api/notebooks/{id}/export` | POST | Export ke PDF/MD/DOCX/BibTeX |

---

## Fase Pengerjaan

### Fase 4A — Canvases

- [ ] Halaman daftar canvas + buat canvas baru (pilih mode)
- [ ] **Mode Knowledge Graph** — render node dari library, koneksi manual, AI generate koneksi otomatis
- [ ] **Mode Reading Board** — kolom Kanban, drag paper antar kolom, AI klasifikasi
- [ ] **Mode Whiteboard** — sticky note, teks, garis, zoom/pan, drag kutipan dari Notes
- [ ] Simpan state canvas ke database (autosave tiap 30 detik)

### Fase 4B — Notebooks

- [ ] Halaman daftar notebook + buat notebook baru (pilih template)
- [ ] Editor blok: heading, teks, bullet, kutipan, paper card, checklist, divider
- [ ] Sisipkan kutipan dari AI Findings langsung ke notebook
- [ ] AI Block — prompt inline dalam konteks notebook
- [ ] Export: PDF, Markdown, DOCX, BibTeX
- [ ] Pilihan format sitasi saat export

---

## Estimasi Biaya AI Tambahan

Asumsi penggunaan personal aktif per bulan:

| Fitur | Estimasi Token | Estimasi Biaya |
|---|---|---|
| AI generate koneksi (per canvas, 20 paper) | ~15.000 input, ~2.000 output | ~$0.009 |
| AI block di notebook (per sesi, 5 prompt) | ~10.000 input, ~3.000 output | ~$0.008 |
| AI klasifikasi Reading Board (per board) | ~8.000 input, ~1.000 output | ~$0.005 |
| **Total tambahan per bulan** | | **~$0.50–1.00** |

Dikombinasikan dengan fitur sebelumnya (highlight + summarize + TTS),
total biaya AI keseluruhan estimasi **$1.50–2.00/bulan** untuk personal use.
