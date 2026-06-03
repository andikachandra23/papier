import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import '../styles/docs.css';

const sections = [
  { id: 'getting-started', title: 'Getting Started', icon: '🚀' },
  { id: 'managing-papers', title: 'Managing Papers', icon: '📄' },
  { id: 'pdf-viewer', title: 'PDF Viewer', icon: '📖' },
  { id: 'highlights', title: 'Highlights & Annotations', icon: '🖍️' },
  { id: 'notes', title: 'Notes', icon: '📝' },
  { id: 'ai-summary', title: 'AI Summary', icon: '🤖' },
  { id: 'categories-tags', title: 'Categories & Tags', icon: '🏷️' },
  { id: 'export-bulk', title: 'Export & Bulk Actions', icon: '📦' },
];

export default function Docs() {
  const [activeSection, setActiveSection] = useState('getting-started');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const contentRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: '-80px 0px -70% 0px', threshold: 0 }
    );

    sections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setMobileNavOpen(false);
    }
  };

  return (
    <div className="docs-layout">
      {/* Top bar */}
      <header className="docs-topbar">
        <div className="docs-topbar-inner">
          <Link to="/" className="docs-brand">
            <span className="docs-brand-icon">P</span>
            <span className="docs-brand-text">Papier Docs</span>
          </Link>
          <div className="docs-topbar-links">
            <Link to="/" className="docs-topbar-link">Home</Link>
            <Link to="/login" className="docs-topbar-link docs-topbar-link-primary">Open App</Link>
          </div>
          <button
            className="docs-mobile-nav-toggle"
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            aria-label="Toggle navigation"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {mobileNavOpen ? <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></> : <><path d="M3 12h18" /><path d="M3 6h18" /><path d="M3 18h18" /></>}
            </svg>
          </button>
        </div>
      </header>

      <div className="docs-body">
        {/* Sidebar nav */}
        <aside className={`docs-sidebar ${mobileNavOpen ? 'open' : ''}`}>
          <nav className="docs-nav">
            {sections.map((s) => (
              <button
                key={s.id}
                className={`docs-nav-item ${activeSection === s.id ? 'active' : ''}`}
                onClick={() => scrollTo(s.id)}
              >
                <span className="docs-nav-icon">{s.icon}</span>
                {s.title}
              </button>
            ))}
          </nav>
        </aside>
        {mobileNavOpen && <div className="docs-sidebar-overlay" onClick={() => setMobileNavOpen(false)} />}

        {/* Content */}
        <main className="docs-content" ref={contentRef}>

          {/* Getting Started */}
          <section id="getting-started" className="docs-section">
            <h2 className="docs-h2">🚀 Getting Started</h2>
            <p>Welcome to Papier — a research paper management platform built for academics. This guide will walk you through everything you need to know to get started.</p>

            <h3 className="docs-h3">Creating an Account</h3>
            <ol className="docs-list">
              <li>Go to <strong>papier.my</strong> and click <strong>"Mulai Gratis"</strong> or <strong>"Masuk"</strong></li>
              <li>You can register with your <strong>email and password</strong>, or sign in with <strong>Google</strong></li>
              <li>After logging in, you'll be redirected to your <strong>Library</strong> — your personal research dashboard</li>
            </ol>

            <h3 className="docs-h3">Understanding the Interface</h3>
            <p>The Library page has three main areas:</p>
            <div className="docs-table-wrap">
              <table className="docs-table">
                <thead>
                  <tr><th>Area</th><th>Description</th></tr>
                </thead>
                <tbody>
                  <tr><td><strong>Sidebar</strong></td><td>Navigation — categories, tags, reading list. On mobile, tap the hamburger menu to open.</td></tr>
                  <tr><td><strong>Header</strong></td><td>Page title, search bar, action buttons (Add Paper, Import DOI, etc.)</td></tr>
                  <tr><td><strong>Paper Grid</strong></td><td>Your papers displayed as cards. Click any card to open its detail panel.</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Managing Papers */}
          <section id="managing-papers" className="docs-section">
            <h2 className="docs-h2">📄 Managing Papers</h2>

            <h3 className="docs-h3">Adding a Paper Manually</h3>
            <ol className="docs-list">
              <li>Click the <strong>"+ Add Paper"</strong> button in the header</li>
              <li>Fill in the title, authors, year, category, and abstract</li>
              <li>Optionally upload a PDF file</li>
              <li>Click <strong>"Simpan"</strong> to save</li>
            </ol>

            <h3 className="docs-h3">Importing via DOI</h3>
            <ol className="docs-list">
              <li>Click <strong>"Import DOI"</strong> in the header</li>
              <li>Enter the paper's DOI (e.g., <code>10.48550/arXiv.1706.03762</code>)</li>
              <li>Papier will automatically fetch the title, authors, year, and abstract from CrossRef</li>
              <li>Review and click <strong>"Simpan"</strong></li>
            </ol>

            <h3 className="docs-h3">Paper Details</h3>
            <p>Click any paper card to open the <strong>Detail Panel</strong>, where you can:</p>
            <ul className="docs-list">
              <li>View full metadata (title, authors, year, abstract, DOI)</li>
              <li>Add/remove from Reading List</li>
              <li>Open the PDF viewer</li>
              <li>View highlights and notes</li>
              <li>Edit or delete the paper</li>
            </ul>
          </section>

          {/* PDF Viewer */}
          <section id="pdf-viewer" className="docs-section">
            <h2 className="docs-h2">📖 PDF Viewer</h2>
            <p>Papier has a built-in PDF viewer that lets you read papers without leaving the app.</p>

            <h3 className="docs-h3">Opening a PDF</h3>
            <ol className="docs-list">
              <li>Click a paper card to open its detail panel</li>
              <li>Click the <strong>"Open PDF"</strong> button (if a PDF is available)</li>
              <li>If no PDF is uploaded, you can upload one via the detail panel or the PDF viewer's upload button</li>
            </ol>

            <h3 className="docs-h3">Navigation & Controls</h3>
            <div className="docs-table-wrap">
              <table className="docs-table">
                <thead>
                  <tr><th>Control</th><th>Action</th></tr>
                </thead>
                <tbody>
                  <tr><td><strong>← / →</strong> arrows</td><td>Previous / next page</td></tr>
                  <tr><td><strong>Page number input</strong></td><td>Jump to a specific page</td></tr>
                  <tr><td><strong>Zoom +/−</strong></td><td>Zoom in or out (also Ctrl+= / Ctrl+−)</td></tr>
                  <tr><td><strong>Zoom %</strong></td><td>Click to reset zoom to 100%</td></tr>
                  <tr><td><strong>Upload button</strong></td><td>Replace or upload a PDF</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Highlights */}
          <section id="highlights" className="docs-section">
            <h2 className="docs-h2">🖍️ Highlights & Annotations</h2>
            <p>Highlight important passages in your PDFs for quick reference later.</p>

            <h3 className="docs-h3">How to Highlight</h3>
            <ol className="docs-list">
              <li>Open a paper in the PDF viewer</li>
              <li><strong>Select text</strong> by clicking and dragging on the PDF</li>
              <li>A popup will appear with color options</li>
              <li>Choose a color and click <strong>"Save Highlight"</strong></li>
            </ol>

            <h3 className="docs-h3">Managing Highlights</h3>
            <ul className="docs-list">
              <li>Highlights appear as colored overlays on the PDF</li>
              <li><strong>Hover</strong> over a highlight to see a delete button (×)</li>
              <li>Click the <strong>highlight badge</strong> (bottom-right corner) to see a list of all highlights</li>
              <li>Click any highlight in the list to jump to its page</li>
            </ul>

            <h3 className="docs-h3">Auto-Highlight with AI</h3>
            <p>Click the <strong>sparkle icon (✨)</strong> in the toolbar to open the Auto-Highlight panel. The AI will identify key sentences and let you choose which ones to highlight automatically.</p>
          </section>

          {/* Notes */}
          <section id="notes" className="docs-section">
            <h2 className="docs-h2">📝 Notes</h2>
            <p>Write notes linked directly to your papers.</p>

            <h3 className="docs-h3">Adding a Note from the PDF</h3>
            <ol className="docs-list">
              <li>Select text in the PDF viewer</li>
              <li>In the popup, click <strong>"Save as Note"</strong></li>
              <li>The selected text becomes a reference in your note</li>
            </ol>

            <h3 className="docs-h3">Adding a Note from the Detail Panel</h3>
            <ol className="docs-list">
              <li>Open a paper's detail panel</li>
              <li>Scroll to the <strong>Notes</strong> section</li>
              <li>Type your note and click <strong>"Add Note"</strong></li>
            </ol>

            <h3 className="docs-h3">Notes Modal</h3>
            <p>Click the <strong>"Notes"</strong> button in the header to see all your notes across all papers. You can search, edit, and delete notes from this view.</p>
          </section>

          {/* AI Summary */}
          <section id="ai-summary" className="docs-section">
            <h2 className="docs-h2">🤖 AI Summary</h2>
            <p>Get instant summaries of your papers using AI.</p>

            <h3 className="docs-h3">Generating a Summary</h3>
            <ol className="docs-list">
              <li>Open a paper in the PDF viewer</li>
              <li>Click the <strong>document icon (📄)</strong> in the toolbar to open the Summary panel</li>
              <li>Choose your preferred language and model</li>
              <li>Click <strong>"Generate Summary"</strong></li>
              <li>The AI will analyze the PDF and produce a summary with key points</li>
            </ol>

            <h3 className="docs-h3">Summary Features</h3>
            <ul className="docs-list">
              <li><strong>Summary tab</strong> — Full paragraph summary</li>
              <li><strong>Key Points tab</strong> — Bullet-point list of main findings</li>
              <li><strong>Word count & reading time</strong> — Statistics about the paper</li>
              <li><strong>Cached results</strong> — Summaries are saved so you don't need to regenerate</li>
            </ul>
          </section>

          {/* Categories & Tags */}
          <section id="categories-tags" className="docs-section">
            <h2 className="docs-h2">🏷️ Categories & Tags</h2>
            <p>Organize your papers with categories and tags for easy discovery.</p>

            <h3 className="docs-h3">Categories</h3>
            <ul className="docs-list">
              <li>Categories appear in the <strong>sidebar</strong> with colored dots</li>
              <li>Click <strong>"+ Kategori Baru"</strong> in the sidebar to create a new category</li>
              <li>Each category supports <strong>subcategories</strong> for deeper organization</li>
              <li>Click the <strong>✎</strong> icon next to a category to edit or delete it</li>
            </ul>

            <h3 className="docs-h3">Tags</h3>
            <ul className="docs-list">
              <li>Click <strong>"Tags"</strong> in the header to open the Tag Manager</li>
              <li>Create, rename, or delete tags</li>
              <li>Tags appear in the sidebar and can be used to filter papers</li>
              <li>Unlike categories, tags are <strong>flat</strong> (no hierarchy)</li>
            </ul>

            <h3 className="docs-h3">Filtering</h3>
            <ul className="docs-list">
              <li>Use the <strong>search bar</strong> to search by title, authors, or abstract</li>
              <li>Use the <strong>sort dropdown</strong> to sort by recent, year, or title</li>
              <li>Click <strong>"Filter"</strong> to filter by year range or tags</li>
              <li>Select a <strong>category</strong> or <strong>tag</strong> from the sidebar</li>
            </ul>
          </section>

          {/* Export & Bulk Actions */}
          <section id="export-bulk" className="docs-section">
            <h2 className="docs-h2">📦 Export & Bulk Actions</h2>
            <p>Perform actions on multiple papers at once.</p>

            <h3 className="docs-h3">Selecting Papers</h3>
            <ol className="docs-list">
              <li>Use the <strong>checkboxes</strong> on paper cards to select individual papers</li>
              <li>Use the <strong>"Select All"</strong> checkbox to select all visible papers</li>
            </ol>

            <h3 className="docs-h3">Bulk Actions</h3>
            <div className="docs-table-wrap">
              <table className="docs-table">
                <thead>
                  <tr><th>Action</th><th>Description</th></tr>
                </thead>
                <tbody>
                  <tr><td><strong>Delete</strong></td><td>Remove all selected papers permanently</td></tr>
                  <tr><td><strong>Export CSV</strong></td><td>Download selected papers as a CSV file (title, authors, year, DOI, abstract)</td></tr>
                  <tr><td><strong>Add Category</strong></td><td>Assign a category to all selected papers</td></tr>
                  <tr><td><strong>Remove Category</strong></td><td>Remove a category from all selected papers</td></tr>
                  <tr><td><strong>Add/Remove Tag</strong></td><td>Assign or remove a tag from selected papers</td></tr>
                  <tr><td><strong>Set Reading</strong></td><td>Add selected papers to your reading list</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Footer CTA */}
          <div className="docs-cta">
            <h3>Ready to get started?</h3>
            <p>Start organizing your research papers today — it's free for academics.</p>
            <Link to="/login" className="docs-cta-btn">
              Open Papier
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </Link>
          </div>

        </main>
      </div>
    </div>
  );
}