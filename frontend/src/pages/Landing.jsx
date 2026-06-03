import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

/* ─── Inline SVG Icons ─── */
const Icon = {
  Folder: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  Search: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
    </svg>
  ),
  Clock: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  FileText: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/>
    </svg>
  ),
  Highlight: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/>
    </svg>
  ),
  Pen: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
    </svg>
  ),
  Sparkles: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>
    </svg>
  ),
  Upload: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  ),
  BookOpen: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
    </svg>
  ),
  ArrowRight: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
    </svg>
  ),
  Tag: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><path d="M7 7h.01"/>
    </svg>
  ),
  Layout: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>
    </svg>
  ),
};

/* ─── Intersection Observer Hook ─── */
function useFadeIn() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    const elements = el.querySelectorAll('.fade-in');
    elements.forEach((e) => observer.observe(e));
    return () => observer.disconnect();
  }, []);
  return ref;
}

/* ─── Mockup Component ─── */
function AppMockup() {
  return (
    <div className="mockup-browser">
      <div className="mockup-titlebar">
        <span className="mockup-dot mockup-dot--red" />
        <span className="mockup-dot mockup-dot--yellow" />
        <span className="mockup-dot mockup-dot--green" />
        <span className="mockup-url">papier.app</span>
      </div>
      <div className="mockup-body">
        <div className="mockup-sidebar">
          <div className="mockup-sidebar-brand">Papier</div>
          <div className="mockup-sidebar-item mockup-sidebar-item--active">
            <span className="mockup-sidebar-dot" style={{ background: 'var(--sage-500)' }} />
            Semua Paper
          </div>
          <div className="mockup-sidebar-item">
            <span className="mockup-sidebar-dot" style={{ background: 'var(--steel-400)' }} />
            Deep Learning
          </div>
          <div className="mockup-sidebar-item">
            <span className="mockup-sidebar-dot" style={{ background: 'var(--amber-400)' }} />
            NLP
          </div>
          <div className="mockup-sidebar-item">
            <span className="mockup-sidebar-dot" style={{ background: 'var(--lavender-400)' }} />
            Computer Vision
          </div>
          <div className="mockup-sidebar-item">
            <span className="mockup-sidebar-dot" style={{ background: 'var(--rose-400)' }} />
            Sistem Rekomendasi
          </div>
        </div>
        <div className="mockup-content">
          <div className="mockup-content-header">
            <div>
              <div className="mockup-content-title">Semua Paper</div>
              <div className="mockup-content-desc">42 paper dalam koleksi</div>
            </div>
            <div className="mockup-search">
              <Icon.Search />
              Cari paper...
            </div>
          </div>
          <div className="mockup-grid">
            <div className="mockup-card">
              <div className="mockup-card-meta">
                <span className="mockup-card-year">2024</span>
                <span className="mockup-card-cat">Deep Learning</span>
              </div>
              <div className="mockup-card-title">Attention Is All You Need: Revisiting Transformer Architectures</div>
              <div className="mockup-card-authors">Vaswani, A. et al.</div>
              <div className="mockup-card-bar" style={{ background: 'var(--sage-400)' }} />
            </div>
            <div className="mockup-card">
              <div className="mockup-card-meta">
                <span className="mockup-card-year">2023</span>
                <span className="mockup-card-cat">NLP</span>
              </div>
              <div className="mockup-card-title">Large Language Models for Academic Research: A Survey</div>
              <div className="mockup-card-authors">Chen, W. et al.</div>
              <div className="mockup-card-bar" style={{ background: 'var(--amber-400)' }} />
            </div>
            <div className="mockup-card">
              <div className="mockup-card-meta">
                <span className="mockup-card-year">2024</span>
                <span className="mockup-card-cat">Computer Vision</span>
              </div>
              <div className="mockup-card-title">Efficient Visual Recognition with Minimal Data</div>
              <div className="mockup-card-authors">Liu, Z. et al.</div>
              <div className="mockup-card-bar" style={{ background: 'var(--lavender-400)' }} />
            </div>
            <div className="mockup-card">
              <div className="mockup-card-meta">
                <span className="mockup-card-year">2023</span>
                <span className="mockup-card-cat">Sistem Rekomendasi</span>
              </div>
              <div className="mockup-card-title">Neural Collaborative Filtering with Graph Networks</div>
              <div className="mockup-card-authors">He, X. et al.</div>
              <div className="mockup-card-bar" style={{ background: 'var(--rose-400)' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Hamburger Icon ─── */
function HamburgerIcon({ open }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {open ? (
        <>
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </>
      ) : (
        <>
          <path d="M3 12h18" />
          <path d="M3 6h18" />
          <path d="M3 18h18" />
        </>
      )}
    </svg>
  );
}

/* ─── Landing Page ─── */
export default function Landing() {
  const sectionRef = useFadeIn();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  /* Navbar scroll effect */
  useEffect(() => {
    const nav = document.querySelector('.landing-nav');
    if (!nav) return;
    const handleScroll = () => {
      nav.classList.toggle('scrolled', window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  /* Close mobile menu on resize */
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) setMobileMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div className="landing" ref={sectionRef}>
      {/* ─── Navbar ─── */}
      <nav className="landing-nav">
        <a href="/" className="nav-brand">
          <span className="nav-brand-icon">P</span>
          <span className="nav-brand-text">Papier</span>
        </a>
        <div className="nav-links nav-links-desktop">
          <a href="#fitur" className="nav-link">Fitur</a>
          <a href="#cara-kerja" className="nav-link">Cara Kerja</a>
          <Link to="/login" className="nav-link">Masuk</Link>
          <Link to="/login" className="nav-link nav-link-primary">Mulai Gratis</Link>
        </div>
        <button
          className="nav-hamburger"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Menu"
        >
          <HamburgerIcon open={mobileMenuOpen} />
        </button>
      </nav>

      {/* Mobile menu overlay */}
      <div className={`mobile-nav-overlay ${mobileMenuOpen ? 'open' : ''}`} onClick={closeMobileMenu} />
      <div className={`mobile-nav ${mobileMenuOpen ? 'open' : ''}`}>
        <a href="#fitur" className="mobile-nav-link" onClick={closeMobileMenu}>Fitur</a>
        <a href="#cara-kerja" className="mobile-nav-link" onClick={closeMobileMenu}>Cara Kerja</a>
        <Link to="/login" className="mobile-nav-link" onClick={closeMobileMenu}>Masuk</Link>
        <Link to="/login" className="mobile-nav-link mobile-nav-link-primary" onClick={closeMobileMenu}>Mulai Gratis</Link>
      </div>

      {/* ─── Hero ─── */}
      <section className="landing-hero">
        <div className="hero-badge fade-in">
          <span className="hero-badge-dot" />
          Platform manajemen riset untuk akademisi
        </div>
        <h1 className="hero-headline fade-in fade-in-delay-1">
          Kelola paper penelitian<br />dengan <em>cara yang lebih baik</em>
        </h1>
        <p className="hero-sub fade-in fade-in-delay-2">
          Satu tempat untuk semua paper, catatan, highlight, dan ringkasan AI.
          Dirancang untuk dosen, mahasiswa, dan peneliti.
        </p>
        <div className="hero-actions fade-in fade-in-delay-3">
          <Link to="/login" className="hero-btn hero-btn-primary">
            Mulai Kelola Riset
            <Icon.ArrowRight />
          </Link>
          <a href="#fitur" className="hero-btn hero-btn-secondary">
            Lihat Fitur
          </a>
        </div>
        <div className="hero-visual fade-in fade-in-delay-4">
          <AppMockup />
        </div>
      </section>

      {/* ─── Pain Points (Problem + Amplify) ─── */}
      <section className="landing-section landing-section--alt">
        <div className="section-container">
          <div className="section-header--center fade-in">
            <p className="section-label">Masalah</p>
            <h2 className="section-title">Pernah mengalami ini?</h2>
            <p className="section-desc section-desc--center">
              Mengelola ratusan paper seharusnya tidak menyulitkan.
              Tapi bagi banyak peneliti, ini adalah kenyataan setiap hari.
            </p>
          </div>
          <div className="pain-grid">
            <div className="pain-card fade-in fade-in-delay-1">
              <div className="pain-icon"><Icon.Folder /></div>
              <h3 className="pain-title">PDF tersebar di mana-mana</h3>
              <p className="pain-text">
                Folder berantakan, file duplikat, dan tidak ada sistem yang konsisten.
                Menemukan paper yang pernah dibaca butuh waktu berjam-jam.
              </p>
            </div>
            <div className="pain-card fade-in fade-in-delay-2">
              <div className="pain-icon"><Icon.Search /></div>
              <h3 className="pain-title">Catatan hilang tak tentu rupa</h3>
              <p className="pain-text">
                Anotasi di satu app, catatan di app lain. Tidak ada koneksi antara
                paper dan insight yang pernah Anda tulis.
              </p>
            </div>
            <div className="pain-card fade-in fade-in-delay-3">
              <div className="pain-icon"><Icon.Clock /></div>
              <h3 className="pain-title">Jam terbuang untuk administrasi</h3>
              <p className="pain-text">
                Literature review berlarut karena harus membaca ulang setiap paper
                untuk mengingat poin-poin penting yang relevan.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Solution — Features ─── */}
      <section className="landing-section" id="fitur">
        <div className="section-container">
          <div className="fade-in">
            <p className="section-label">Solusi</p>
            <h2 className="section-title">Semua yang Anda butuhkan,<br />di satu tempat</h2>
            <p className="section-desc">
              Papier menggabungkan manajemen paper, PDF viewer, catatan,
              dan ringkasan AI dalam satu platform yang clean dan efisien.
            </p>
          </div>
          <div className="features-grid">
            <div className="feature-card fade-in fade-in-delay-1">
              <div className="feature-icon"><Icon.Upload /></div>
              <h3 className="feature-title">Upload & Impor Paper</h3>
              <p className="feature-text">
                Upload PDF langsung atau impor metadata via DOI.
                Paper otomatis terorganisir berdasarkan kategori dan tag.
              </p>
            </div>
            <div className="feature-card fade-in fade-in-delay-2">
              <div className="feature-icon"><Icon.FileText /></div>
              <h3 className="feature-title">PDF Viewer Terintegrasi</h3>
              <p className="feature-text">
                Baca dan anotasi PDF langsung di dalam aplikasi.
                Navigasi halaman, zoom, dan kontrol penuh.
              </p>
            </div>
            <div className="feature-card fade-in fade-in-delay-3">
              <div className="feature-icon"><Icon.Highlight /></div>
              <h3 className="feature-title">Highlight & Anotasi</h3>
              <p className="feature-text">
                Tandai bagian penting dengan warna berbeda.
                Semua highlight tersimpan dan bisa dicari kapan saja.
              </p>
            </div>
            <div className="feature-card fade-in fade-in-delay-1">
              <div className="feature-icon"><Icon.Pen /></div>
              <h3 className="feature-title">Catatan Per Paper</h3>
              <p className="feature-text">
                Tulis catatan, ringkasan, dan insight yang tertaut langsung
                ke paper. Tidak ada lagi catatan yang terpisah.
              </p>
            </div>
            <div className="feature-card fade-in fade-in-delay-2">
              <div className="feature-icon"><Icon.Sparkles /></div>
              <h3 className="feature-title">Ringkasan AI</h3>
              <p className="feature-text">
                Dapatkan ringkasan otomatis dari paper menggunakan AI.
                Pahami poin utama tanpa membaca seluruh dokumen.
              </p>
            </div>
            <div className="feature-card fade-in fade-in-delay-3">
              <div className="feature-icon"><Icon.Tag /></div>
              <h3 className="feature-title">Kategori & Tag</h3>
              <p className="feature-text">
                Organisir paper dengan kategori berwarna dan tag fleksibel.
                Filter dan cari dengan cepat sesuai kebutuhan riset Anda.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Transformation — How It Works ─── */}
      <section className="landing-section landing-section--alt" id="cara-kerja">
        <div className="section-container">
          <div className="section-header--center fade-in">
            <p className="section-label">Transformasi</p>
            <h2 className="section-title">Mulai dalam 3 langkah</h2>
            <p className="section-desc section-desc--center">
              Tidak perlu setup rumit. Dalam hitungan menit, perpustakaan riset
              digital Anda sudah siap digunakan.
            </p>
          </div>
          <div className="steps-grid">
            <div className="step fade-in fade-in-delay-1">
              <div className="step-number">1</div>
              <h3 className="step-title">Buat Akun</h3>
              <p className="step-text">
                Daftar secara gratis. Tidak perlu kartu kredit atau instalasi apapun.
              </p>
            </div>
            <div className="step fade-in fade-in-delay-2">
              <div className="step-number">2</div>
              <h3 className="step-title">Upload Paper</h3>
              <p className="step-text">
                Upload PDF atau impor via DOI. Kategorisasi dan tag otomatis tersedia.
              </p>
            </div>
            <div className="step fade-in fade-in-delay-3">
              <div className="step-number">3</div>
              <h3 className="step-title">Baca & Riset</h3>
              <p className="step-text">
                Highlight, catat, dan minta ringkasan AI. Semua terorganisir dalam satu tempat.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Social Proof — Stats ─── */}
      <section className="landing-section">
        <div className="section-container">
          <div className="section-header--center fade-in">
            <p className="section-label">Dampak</p>
            <h2 className="section-title">Dibangun untuk produktivitas akademik</h2>
          </div>
          <div className="stats-grid fade-in">
            <div className="stat-item">
              <div className="stat-value">85%</div>
              <div className="stat-label">Lebih cepat menemukan<br />paper yang relevan</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">3x</div>
              <div className="stat-label">Lebih efisien dalam<br />literature review</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">100%</div>
              <div className="stat-label">Catatan terorganisir<br />dan mudah diakses</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">∞</div>
              <div className="stat-label">Paper yang bisa<br />Anda kelola</div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Offer — Pricing ─── */}
      <section className="landing-section landing-section--alt">
        <div className="section-container">
          <div className="section-header--center fade-in">
            <p className="section-label">Penawaran</p>
            <h2 className="section-title">Gratis untuk akademisi</h2>
            <p className="section-desc section-desc--center">
              Papier adalah platform open-source yang dirancang khusus untuk
              komunitas akademik. Tidak ada biaya tersembunyi.
            </p>
          </div>
          <div className="fade-in" style={{ maxWidth: 420, margin: '0 auto' }}>
            <div className="pain-card" style={{ textAlign: 'center', padding: '36px 32px' }}>
              <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--sage-600)', marginBottom: 8 }}>
                Akademik
              </div>
              <div style={{ fontFamily: "'Lora', serif", fontSize: 44, fontWeight: 600, color: 'var(--ink-900)', marginBottom: 4, letterSpacing: '-0.02em' }}>
                Gratis
              </div>
              <div style={{ fontSize: 14, color: 'var(--ink-400)', marginBottom: 24 }}>
                Selamanya, untuk semua pengguna akademik
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left', marginBottom: 28 }}>
                {[
                  'Upload paper tanpa batas',
                  'PDF viewer + highlight',
                  'Catatan & anotasi',
                  'Ringkasan AI',
                  'Kategori & tag',
                  'Import via DOI',
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--ink-700)' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--sage-600)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {item}
                  </div>
                ))}
              </div>
              <Link to="/login" className="hero-btn hero-btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                Mulai Sekarang
                <Icon.ArrowRight />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Final CTA (Response) ─── */}
      <section className="cta-section">
        <div className="cta-container fade-in">
          <h2 className="cta-title">Siap mengelola riset Anda<br />dengan lebih baik?</h2>
          <p className="cta-desc">
            Bergabung dengan dosen, mahasiswa, dan peneliti yang sudah
            merasakan cara baru mengelola paper penelitian.
          </p>
          <div className="cta-actions">
            <Link to="/login" className="hero-btn hero-btn-primary">
              Mulai Kelola Riset
              <Icon.ArrowRight />
            </Link>
            <a href="#fitur" className="hero-btn hero-btn-secondary">
              Pelajari Lebih Lanjut
            </a>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <span className="footer-brand-icon">P</span>
            <span className="footer-brand-text">Papier</span>
          </div>
          <span className="footer-copy">© {new Date().getFullYear()} Papier. Platform manajemen riset untuk akademisi.</span>
          <div className="footer-links">
            <a href="#fitur" className="footer-link">Fitur</a>
            <a href="#cara-kerja" className="footer-link">Cara Kerja</a>
            <Link to="/login" className="footer-link">Masuk</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}