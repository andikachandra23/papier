import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import client from '../api/client';
import { useLanguage } from '../i18n/LanguageContext';
import SummaryPanel from './SummaryPanel';
import {
  captureSelection,
  serializePositions,
  deserializePositions,
  denormalizeRect,
  HIGHLIGHT_COLORS,
  getHighlightBg,
  findTextPositionsInTextLayer,
  getAutoHighlightColor,
  getRandomHighlightColor,
} from '../utils/pdfHighlight';
import AutoHighlightPanel from './AutoHighlightPanel';

// API base URL for fetching resources
const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

// Setup PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const PDFViewer = ({ paper, isOpen, onClose, onPaperUpdate }) => {
  const { t } = useLanguage();
  const [numPages, setNumPages] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [highlights, setHighlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploadingPDF, setUploadingPDF] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [autoHighlightOpen, setAutoHighlightOpen] = useState(false);
  const [suggestedHighlights, setSuggestedHighlights] = useState([]); // preview overlays from AI

  // Selection popup state
  const [selectionPopup, setSelectionPopup] = useState(null);
  const [selectedColor, setSelectedColor] = useState(HIGHLIGHT_COLORS[0].value);
  const [savingHighlight, setSavingHighlight] = useState(false);

  // Hover highlight for delete
  const [hoveredHighlight, setHoveredHighlight] = useState(null);

  // Highlight list popup
  const [showHighlightList, setShowHighlightList] = useState(false);

  const pageContainerRef = useRef(null);
  const viewerRef = useRef(null);

  // PDF source - memoize to prevent re-render/blink when other state changes
  const pdfSource = useMemo(() => {
    if (!paper?.id) return null;
    return {
      url: `${API_BASE}/papers/${paper.id}/pdf`,
      httpHeaders: {
        Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
      },
    };
  }, [paper?.id]);

  // Fetch highlights when viewer opens
  useEffect(() => {
    if (isOpen && paper?.id) {
      fetchHighlights();
    }
  }, [isOpen, paper?.id]);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setCurrentPage(1);
      setScale(1.2);
      setError(null);
      setLoading(true);
      setSelectionPopup(null);
    }
  }, [isOpen]);

  const fetchHighlights = async () => {
    try {
      const res = await client.get(`/highlights/${paper.id}`);
      setHighlights(res.data);
    } catch (err) {
      console.error('Failed to fetch highlights', err);
    }
  };

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setLoading(false);
    setError(null);
  };

  const onDocumentLoadError = async (err) => {
    console.error('PDF load error:', err);

    let errorMsg = t('pdf.loadFailed');
    let errorDetail = '';

    if (err?.name === 'InvalidPDFException' || err?.message?.includes('Invalid PDF')) {
      errorMsg = t('pdf.invalid');
      errorDetail = t('pdf.invalidDetail');
    } else if (err?.name === 'MissingPDFException' || err?.message?.includes('Missing PDF')) {
      errorMsg = t('pdf.missing');
      errorDetail = t('pdf.missingDetail');
    } else if (err?.name === 'UnexpectedResponseException' || err?.status === 0) {
      errorMsg = t('pdf.server');
      errorDetail = t('pdf.serverDetail');
    } else if (err?.message?.includes('Failed to fetch') || err?.message?.includes('NetworkError')) {
      errorMsg = t('pdf.network');
      errorDetail = t('pdf.networkDetail');
    }

    if (paper?.id) {
      try {
        const resp = await fetch(`${API_BASE}/papers/${paper.id}/pdf`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
        });
        if (!resp.ok) {
          const data = await resp.json().catch(() => ({}));
          if (data.detail) {
            if (data.detail.includes('No PDF available')) {
              errorMsg = t('pdf.noPdf');
              errorDetail = t('pdf.noPdfDetail');
            } else if (data.detail.includes('HTML instead of PDF')) {
              errorMsg = t('pdf.html');
              errorDetail = t('pdf.htmlDetail');
            } else if (data.detail.includes('HTTP 403') || data.detail.includes('menolak akses')) {
              errorMsg = t('pdf.forbidden');
              errorDetail = t('pdf.forbiddenDetail');
            } else if (data.detail.includes('HTTP 404')) {
              errorMsg = t('pdf.notFound');
              errorDetail = t('pdf.notFoundDetail');
            } else if (data.detail.includes('HTTP 502') || data.detail.includes('Failed to fetch')) {
              errorMsg = t('pdf.externalFailed');
              errorDetail = t('pdf.externalFailedDetail');
            } else if (data.detail.includes('Timeout')) {
              errorMsg = t('pdf.timeout');
              errorDetail = t('pdf.timeoutDetail');
            } else if (data.detail.includes('Non-PDF content')) {
              errorMsg = t('pdf.nonPdf');
              errorDetail = t('pdf.nonPdfDetail');
            } else {
              errorMsg = data.detail;
              errorDetail = '';
            }
          }
        } else {
          errorMsg = t('pdf.processFailed');
          errorDetail = t('pdf.processFailedDetail');
        }
      } catch (e) {
        if (!errorMsg || errorMsg === t('pdf.loadFailed')) {
          errorMsg = t('pdf.server');
          errorDetail = 'Pastikan backend server sedang berjalan.';
        }
      }
    }

    setError({ message: errorMsg, detail: errorDetail });
    setLoading(false);
  };

  const handleUploadPDF = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf';
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const MAX_SIZE = 50 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        alert(t('detail.maxPdfSize', { size: (file.size / (1024 * 1024)).toFixed(1) }));
        return;
      }
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        alert(t('detail.pdfOnly'));
        return;
      }

      setUploadingPDF(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await client.post(`/papers/${paper.id}/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (onPaperUpdate) onPaperUpdate(res.data);
        setError(null);
        setLoading(true);
      } catch (err) {
        const msg = err.response?.data?.detail || t('detail.uploadFailed');
        alert(msg);
      }
      setUploadingPDF(false);
    };
    input.click();
  };

  // Handle mouse up on text layer for selection
  const handleCopyText = useCallback(() => {
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) {
      const text = selection.toString().trim();
      if (text) {
        navigator.clipboard.writeText(text).then(() => {}).catch(() => {
          document.execCommand('copy');
        });
      }
    }
  }, []);

  const handleMouseUp = useCallback((e) => {
    if (e.target.closest('.highlight-selection-popup')) return;
    if (e.target.closest('.highlight-overlay-item')) return;

    setTimeout(() => {
      const pageContainer = pageContainerRef.current;
      if (!pageContainer) return;

      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.rangeCount) {
        const currentSelection = window.getSelection();
        if (!currentSelection || currentSelection.isCollapsed) {
          setSelectionPopup(null);
        }
        return;
      }

      const selectedText = selection.toString().trim();
      if (!selectedText) {
        setSelectionPopup(null);
        return;
      }

      const capture = captureSelection(pageContainer, currentPage);
      if (!capture) {
        setSelectionPopup(null);
        return;
      }

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const containerRect = viewerRef.current?.getBoundingClientRect();

      if (!containerRect) return;

      setSelectionPopup({
        x: rect.left + rect.width / 2 - containerRect.left,
        y: rect.top - containerRect.top - 60,
        capture,
      });
    }, 100);
  }, [currentPage]);

  // Save as note
  const handleSaveAsNote = async () => {
    if (!selectionPopup?.capture) return;
    setSavingHighlight(true);

    try {
      const { text, page } = selectionPopup.capture;
      await client.post(`/notes/${paper.id}`, {
        content: text,
        page_number: page,
        user_comment: "",
      });
      setSelectionPopup(null);
      window.getSelection()?.removeAllRanges();
    } catch (err) {
      console.error('Failed to save note', err);
      alert(t('notes.addFailed'));
    }
    setSavingHighlight(false);
  };

  // Save highlight
  const handleSaveHighlight = async () => {
    if (!selectionPopup?.capture) return;
    setSavingHighlight(true);

    try {
      const { positions, text, page } = selectionPopup.capture;
      const positionStr = serializePositions(positions);

      const res = await client.post(`/highlights/${paper.id}`, {
        page,
        position: positionStr,
        color: selectedColor,
        text,
      });

      setHighlights(prev => [...prev, res.data]);
      setSelectionPopup(null);
      window.getSelection()?.removeAllRanges();
    } catch (err) {
      console.error('Failed to save highlight', err);
      alert(t('pdf.savingHighlightFailed'));
    }
    setSavingHighlight(false);
  };

  // Delete highlight
  const handleDeleteHighlight = async (highlightId) => {
    try {
      await client.delete(`/highlights/${highlightId}`);
      setHighlights(prev => prev.filter(h => h.id !== highlightId));
    } catch (err) {
      console.error('Failed to delete highlight', err);
      alert(t('pdf.deleteHighlightFailed'));
    }
  };

  // Close selection popup when clicking elsewhere
  const handlePageClick = useCallback((e) => {
    if (!e.target.closest('.highlight-selection-popup') && !e.target.closest('.highlight-overlay-item')) {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        setSelectionPopup(null);
      }
    }
  }, []);

  // Apply auto-highlights from AI: find text in text layer and save as highlights
  const handleApplyAutoHighlights = useCallback(async (selectedSentences) => {
    const pageContainer = pageContainerRef.current;
    if (!pageContainer || !selectedSentences.length) return;

    const newHighlights = [];
    let appliedCount = 0;

    for (const sentence of selectedSentences) {
      // Navigate to the sentence's page first
      if (sentence.page !== currentPage) {
        setCurrentPage(sentence.page);
        // Wait for page render
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      // Try to find the text in the text layer
      const container = pageContainerRef.current;
      if (!container) continue;

      const positions = findTextPositionsInTextLayer(container, sentence.text);

      if (positions && positions.length > 0) {
        try {
          const color = getRandomHighlightColor();
          const positionStr = serializePositions(positions);

          const res = await client.post(`/highlights/${paper.id}`, {
            page: sentence.page,
            position: positionStr,
            color,
            text: sentence.text,
          });

          newHighlights.push(res.data);
          appliedCount++;
        } catch (err) {
          console.error('Failed to save auto-highlight:', err);
        }
      }
    }

    if (newHighlights.length > 0) {
      setHighlights(prev => [...prev, ...newHighlights]);
    }

    // Clear suggested highlights after applying
    setSuggestedHighlights([]);
    setAutoHighlightOpen(false);

    if (appliedCount > 0) {
      alert(t('autoHighlight.allApplied') + ` (${appliedCount})`);
    }
  }, [paper?.id, currentPage, t]);

  // Get suggested highlight overlays for current page
  const currentPageSuggested = useMemo(
    () => suggestedHighlights.filter(s => s.page === currentPage && s.positions),
    [suggestedHighlights, currentPage]
  );

  // Navigation
  const goToPage = (page) => {
    if (page >= 1 && page <= numPages) {
      setCurrentPage(page);
      setSelectionPopup(null);
    }
  };

  const zoomIn = () => setScale(prev => Math.min(prev + 0.2, 3));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));
  const resetZoom = () => setScale(1.2);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (selectionPopup) {
          setSelectionPopup(null);
          window.getSelection()?.removeAllRanges();
        } else {
          onClose();
        }
      }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') goToPage(currentPage - 1);
      if (e.key === 'ArrowRight' || e.key === 'PageDown') goToPage(currentPage + 1);
      if (e.ctrlKey && e.key === '=') { e.preventDefault(); zoomIn(); }
      if (e.ctrlKey && e.key === '-') { e.preventDefault(); zoomOut(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentPage, numPages, selectionPopup, onClose]);

  // Get highlights for current page - memoize to prevent unnecessary re-renders
  const currentPageHighlights = useMemo(
    () => highlights.filter(h => h.page === currentPage),
    [highlights, currentPage]
  );

  const isFirstPage = currentPage <= 1;
  const isLastPage = !numPages || currentPage >= numPages;

  if (!isOpen) return null;

  return (
    <div className="pdf-viewer-overlay" ref={viewerRef} onClick={(e) => e.stopPropagation()}>
      {/* Toolbar */}
      <div className="pdf-toolbar">
        <div className="pdf-toolbar-left">
          <button className="pdf-toolbar-btn" onClick={onClose} title={t('pdf.close')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
            </svg>
          </button>
          <span className="pdf-toolbar-title">{paper?.title || 'PDF Viewer'}</span>
        </div>

        <div className="pdf-toolbar-center">
          <button
            className="pdf-toolbar-btn"
            onClick={() => goToPage(currentPage - 1)}
            disabled={isFirstPage}
            title={t('pdf.prev')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <div className="pdf-page-info">
            <input
              type="number"
              className="pdf-page-input"
              value={currentPage}
              onChange={(e) => goToPage(parseInt(e.target.value) || 1)}
              min={1}
              max={numPages || 1}
            />
            <span>/ {numPages || '...'}</span>
          </div>
          <button
            className="pdf-toolbar-btn"
            onClick={() => goToPage(currentPage + 1)}
            disabled={isLastPage}
            title={t('pdf.next')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>

        <div className="pdf-toolbar-right">
          <button className="pdf-toolbar-btn" onClick={handleUploadPDF} disabled={uploadingPDF} title={t('pdf.uploadReplace')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </button>
          <div className="pdf-toolbar-divider" />
          <button className="pdf-toolbar-btn" onClick={zoomOut} title="Zoom out (Ctrl+-)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/>
            </svg>
          </button>
          <button className="pdf-zoom-label" onClick={resetZoom} title="Reset zoom">
            {Math.round(scale * 100)}%
          </button>
          <button className="pdf-toolbar-btn" onClick={zoomIn} title="Zoom in (Ctrl+=)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
            </svg>
          </button>
          <div className="pdf-toolbar-divider" />
          <button
            className={`pdf-toolbar-btn ${autoHighlightOpen ? 'active' : ''}`}
            onClick={() => setAutoHighlightOpen(!autoHighlightOpen)}
            title={t('autoHighlight.title')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 4V2"/><path d="M15 16v-2"/><path d="M8 9h2"/><path d="M20 9h2"/><path d="M17.8 11.8 19 13"/><path d="M15 9h.01"/><path d="M17.8 6.2 19 5"/><path d="m3 21 9-9"/><path d="M12.2 6.2 11 5"/>
            </svg>
          </button>
          <button
            className={`pdf-toolbar-btn ${summaryOpen ? 'active' : ''}`}
            onClick={() => setSummaryOpen(!summaryOpen)}
            title={t('summary.title')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </button>
          <div className="pdf-toolbar-divider" />
          <button className="pdf-toolbar-btn" onClick={handleCopyText} title={t('pdf.copySelected')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
          </button>
          <div className="pdf-highlight-indicator" title={t('pdf.selectTextHint')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
            </svg>
            <span>{t('pdf.selectText')}</span>
          </div>
        </div>
      </div>

      {/* PDF Content */}
      <div className="pdf-content">
        {error ? (
          <div className="pdf-error">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--ink-300)" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
            <p className="pdf-error-message">{typeof error === 'object' ? error.message : error}</p>
            {typeof error === 'object' && error.detail && (
              <p className="pdf-error-detail">{error.detail}</p>
            )}
            <div className="pdf-error-actions">
              <button className="btn btn-primary btn-sm" onClick={handleUploadPDF} disabled={uploadingPDF}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                {uploadingPDF ? t('detail.uploading') : t('detail.uploadPdf')}
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => {
                setError(null);
                setLoading(true);
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/>
                  <path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
                </svg>
                Coba Lagi
              </button>
              <button className="btn btn-secondary btn-sm" onClick={onClose}>{t('common.back')}</button>
            </div>
          </div>
        ) : (
          <div className="pdf-scroll-area" onClick={handlePageClick}>
            {loading && (
              <div className="pdf-loading">
                <div className="spinner" />
                <span>{t('pdf.loading')}</span>
              </div>
            )}
            <Document
              file={pdfSource}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading=""
            >
              <div className="pdf-page-wrapper" ref={pageContainerRef}>
                <Page
                  pageNumber={currentPage}
                  scale={scale}
                  renderTextLayer={true}
                  renderAnnotationLayer={false}
                  onMouseUp={handleMouseUp}
                  onPointerUp={handleMouseUp}
                />
                {/* Highlight overlays */}
                {currentPageHighlights.map((highlight) => {
                  const positions = deserializePositions(highlight.position);
                  return positions.map((pos, idx) => (
                    <div
                      key={`${highlight.id}-${idx}`}
                      className="highlight-overlay-item"
                      style={{
                        position: 'absolute',
                        left: `${pos.x * 100}%`,
                        top: `${pos.y * 100}%`,
                        width: `${pos.width * 100}%`,
                        height: `${pos.height * 100}%`,
                        backgroundColor: getHighlightBg(highlight.color),
                        pointerEvents: 'auto',
                        cursor: 'pointer',
                        borderRadius: '2px',
                      }}
                      onMouseEnter={() => setHoveredHighlight(highlight.id)}
                      onMouseLeave={() => setHoveredHighlight(null)}
                      title={highlight.text}
                    >
                      {hoveredHighlight === highlight.id && (
                        <button
                          className="highlight-delete-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteHighlight(highlight.id);
                          }}
                          title={t('pdf.deleteHighlight')}
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  ));
                })}
              </div>
            </Document>

          </div>
        )}
      </div>

      {/* Floating navigation buttons - outside PDF content area */}
      <button
        className={`pdf-nav-btn pdf-nav-prev ${isFirstPage ? 'disabled' : ''}`}
        onClick={(e) => { e.stopPropagation(); goToPage(currentPage - 1); }}
        disabled={isFirstPage}
        title={t('pdf.prev')}
        aria-label={t('pdf.prev')}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>
      <button
        className={`pdf-nav-btn pdf-nav-next ${isLastPage ? 'disabled' : ''}`}
        onClick={(e) => { e.stopPropagation(); goToPage(currentPage + 1); }}
        disabled={isLastPage}
        title={t('pdf.next')}
        aria-label={t('pdf.next')}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </button>

      {/* Selection popup */}
      {selectionPopup && (
        <div
          className="highlight-selection-popup"
          style={{
            position: 'absolute',
            left: `${Math.max(10, Math.min(selectionPopup.x - 130, viewerRef.current?.offsetWidth - 270 || 500))}px`,
            top: `${Math.max(60, selectionPopup.y)}px`,
          }}
        >
          <div className="highlight-popup-label">{t('pdf.chooseColor')}</div>
          <div className="highlight-popup-colors">
            {HIGHLIGHT_COLORS.map((color) => (
              <button
                key={color.value}
                className={`highlight-color-btn ${selectedColor === color.value ? 'selected' : ''}`}
                style={{ backgroundColor: color.bg, borderColor: color.value }}
                onClick={() => setSelectedColor(color.value)}
                title={color.name}
              >
                <span style={{ backgroundColor: color.value }} />
              </button>
            ))}
          </div>
          <div className="highlight-popup-preview" style={{ backgroundColor: getHighlightBg(selectedColor) }}>
            <span className="highlight-popup-text">
              "{selectionPopup.capture.text.length > 60
                ? selectionPopup.capture.text.substring(0, 60) + '...'
                : selectionPopup.capture.text}"
            </span>
          </div>
          <div className="highlight-popup-actions">
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setSelectionPopup(null);
                window.getSelection()?.removeAllRanges();
              }}
            >
              Batal
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleSaveAsNote}
              disabled={savingHighlight}
              title={t('notes.saveAsNote')}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '3px' }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
              {savingHighlight ? t('common.saving') : t('notes.saveAsNote')}
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleSaveHighlight}
              disabled={savingHighlight}
            >
              {savingHighlight ? t('common.saving') : t('pdf.saveHighlight')}
            </button>
          </div>
        </div>
      )}

      {/* Summary Panel */}
      <SummaryPanel
        paper={paper}
        isOpen={summaryOpen}
        onClose={() => setSummaryOpen(false)}
      />

      {/* Auto Highlight Panel */}
      <AutoHighlightPanel
        paper={paper}
        isOpen={autoHighlightOpen}
        onClose={() => setAutoHighlightOpen(false)}
        onApplyHighlights={handleApplyAutoHighlights}
      />

      {/* Highlight count badge */}
      {highlights.length > 0 && (
        <div className="pdf-highlight-badge-wrap">
          <div
            className="pdf-highlight-badge"
            onClick={() => setShowHighlightList(!showHighlightList)}
            style={{ cursor: 'pointer' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
            </svg>
            {highlights.length} highlight{highlights.length !== 1 ? 's' : ''}
          </div>
          {showHighlightList && (
            <div className="highlight-list-popup">
              <div className="highlight-list-header">
                <span className="highlight-list-title">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
                  </svg>
                  {t('highlights.title')} ({highlights.length})
                </span>
                <button
                  className="highlight-list-close"
                  onClick={() => setShowHighlightList(false)}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                  </svg>
                </button>
              </div>
              <div className="highlight-list-body">
                {[...highlights].reverse().map((h) => (
                  <div
                    key={h.id}
                    className="highlight-list-item"
                    onClick={() => {
                      goToPage(h.page);
                      setShowHighlightList(false);
                    }}
                  >
                    <span
                      className="highlight-list-dot"
                      style={{ background: getHighlightBg(h.color || '#FFEB3B'), border: `1.5px solid ${h.color || '#FFEB3B'}` }}
                    />
                    <div className="highlight-list-content">
                      <div className="highlight-list-text">"{h.text?.length > 80 ? h.text.substring(0, 80) + '...' : h.text}"</div>
                      <div className="highlight-list-meta">
                        {t('highlights.page')} {h.page}
                        {h.created_at && <span> · {new Date(h.created_at).toLocaleDateString()}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PDFViewer;