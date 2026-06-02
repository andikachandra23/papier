import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { useLanguage } from '../i18n/LanguageContext';
import NotesPanel from './NotesPanel';
import HighlightsPanel from './HighlightsPanel';

const DetailPanel = ({ paper, isOpen, onClose, onToggleReading, onDelete, onPaperUpdate, onOpenPDFViewer }) => {
  const { t, language } = useLanguage();
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [allTags, setAllTags] = useState([]);
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [savingTags, setSavingTags] = useState(false);

  const [uploadingPDF, setUploadingPDF] = useState(false);
  const [resolvingPDF, setResolvingPDF] = useState(false);
  const [showURLInput, setShowURLInput] = useState(false);
  const [pdfUrlInput, setPdfUrlInput] = useState('');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [allCategories, setAllCategories] = useState([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);
  const [savingCategories, setSavingCategories] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedTagIds(paper.tags?.map(t => t.id) || []);
    }
  }, [isOpen, paper]);

  const fetchAllTags = async () => {
    try {
      const res = await client.get('/tags/');
      setAllTags(res.data);
    } catch (err) {
      console.error('Failed to fetch tags', err);
    }
  };

  const handleOpenTagPicker = () => {
    fetchAllTags();
    setSelectedTagIds(paper.tags?.map(t => t.id) || []);
    setShowTagPicker(true);
  };

  const handleToggleTag = (tagId) => {
    setSelectedTagIds(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  const handleSaveTags = async () => {
    setSavingTags(true);
    try {
      const res = await client.put(`/papers/${paper.id}`, { tag_ids: selectedTagIds });
      onPaperUpdate(res.data);
      setShowTagPicker(false);
    } catch (err) {
      alert(t('detail.saveTagsFailed'));
    }
    setSavingTags(false);
  };

  const fetchAllCategories = async () => {
    try {
      const res = await client.get('/categories/');
      setAllCategories(res.data);
    } catch (err) {
      console.error('Failed to fetch categories', err);
    }
  };

  const handleOpenCategoryPicker = () => {
    fetchAllCategories();
    setSelectedCategoryIds(paper.categories?.map(c => c.id) || []);
    setShowCategoryPicker(true);
  };

  const handleToggleCategory = (categoryId) => {
    setSelectedCategoryIds(prev =>
      prev.includes(categoryId) ? prev.filter(id => id !== categoryId) : [...prev, categoryId]
    );
  };

  const handleSaveCategories = async () => {
    setSavingCategories(true);
    try {
      const res = await client.put(`/papers/${paper.id}`, { category_ids: selectedCategoryIds });
      onPaperUpdate(res.data);
      setShowCategoryPicker(false);
    } catch (err) {
      alert(t('detail.saveCategoriesFailed'));
    }
    setSavingCategories(false);
  };

  if (!isOpen || !paper) return null;

  const keywords = (paper.keywords || '').split(',').map(k => k.trim()).filter(Boolean);

  const handleDelete = async () => {
    if (!confirm(t('detail.deletePaperConfirm'))) return;
    try {
      await client.delete(`/papers/${paper.id}`);
      onDelete(paper.id);
      onClose();
    } catch (err) {
      alert(t('detail.deletePaperFailed'));
    }
  };

  const handleToggleReading = async () => {
    try {
      const res = await client.put(`/papers/${paper.id}`, { is_reading: !paper.is_reading });
      onPaperUpdate(res.data);
    } catch (err) {
      alert(t('library.updateReadingFailed'));
    }
  };

  const handleUploadPDF = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf';
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Client-side validation
      const MAX_SIZE = 50 * 1024 * 1024; // 50MB
      if (file.size > MAX_SIZE) {
        alert(t('detail.maxPdfSize', { size: (file.size / (1024*1024)).toFixed(1) }));
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
        onPaperUpdate(res.data);
      } catch (err) {
        const msg = err.response?.data?.detail || t('detail.uploadFailed');
        alert(msg);
      }
      setUploadingPDF(false);
    };
    input.click();
  };

  const hasPDF = !!(paper.pdf_path || paper.pdf_url);

  const handleResolvePDF = async () => {
    if (!paper.doi) {
      alert(t('detail.noDoi'));
      return;
    }
    setResolvingPDF(true);
    try {
      const res = await client.post(`/papers/${paper.id}/resolve-pdf`);
      onPaperUpdate(res.data);
    } catch (err) {
      const msg = err.response?.data?.detail || t('detail.findPdfFailed');
      alert(msg);
    }
    setResolvingPDF(false);
  };

  const handleSavePDFUrl = async () => {
    if (!pdfUrlInput.trim()) return;
    try {
      const res = await client.post(`/papers/${paper.id}/resolve-pdf`, { pdf_url: pdfUrlInput.trim() });
      onPaperUpdate(res.data);
      setShowURLInput(false);
      setPdfUrlInput('');
    } catch (err) {
      alert(t('detail.saveUrlFailed'));
    }
  };

  const handleOpenPDF = () => {
    if (onOpenPDFViewer) onOpenPDFViewer(paper);
  };

  const hasSummary = !!(paper.summary_text && paper.summary_lang === language);
  let summaryKeyPoints = [];
  if (hasSummary && paper.summary_key_points) {
    try { summaryKeyPoints = JSON.parse(paper.summary_key_points); } catch { summaryKeyPoints = []; }
  }

  return (
    <div className="detail-overlay open" onClick={onClose}>
      <div className="detail-panel" onClick={(e) => e.stopPropagation()}>
        <div className="detail-header">
          <div className="detail-actions">
            <button className="btn btn-secondary btn-sm" onClick={handleToggleReading}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
              </svg>
              Reading List
            </button>
            {hasPDF && (
              <button className="btn btn-secondary btn-sm" onClick={handleOpenPDF}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                </svg>
                Baca PDF
              </button>
            )}
            <button className="btn btn-secondary btn-sm" onClick={handleUploadPDF} disabled={uploadingPDF}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              {uploadingPDF ? t('detail.uploading') : hasPDF ? t('detail.replacePdf') : t('detail.uploadPdf')}
            </button>
            {!hasPDF && (
              <>
                {paper.doi && (
                  <button className="btn btn-secondary btn-sm" onClick={handleResolvePDF} disabled={resolvingPDF}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                    </svg>
                    {resolvingPDF ? t('detail.searching') : t('detail.findPdf')}
                  </button>
                )}
                <button className="btn btn-secondary btn-sm" onClick={() => setShowURLInput(!showURLInput)}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                  </svg>
                  URL PDF
                </button>
              </>
            )}
          </div>
          <button className="modal-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
            </svg>
          </button>
        </div>

        {/* PDF URL Input */}
        {showURLInput && (
          <div style={{ background: 'var(--cream-100)', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
            <div className="detail-section-title" style={{ marginBottom: '8px' }}>{t('detail.enterPdfUrl')}</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                className="input-field"
                placeholder="https://example.com/paper.pdf"
                value={pdfUrlInput}
                onChange={(e) => setPdfUrlInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSavePDFUrl(); }}
                style={{ fontSize: '12px' }}
              />
              <button className="btn btn-primary btn-sm" onClick={handleSavePDFUrl} style={{ whiteSpace: 'nowrap' }}>
                Simpan
              </button>
            </div>
          </div>
        )}

        <div className="detail-meta">
          {paper.year && <span className="year-badge">{paper.year}</span>}
          <span className="cat-badge">{paper.categories?.[0]?.name || t('detail.other')}</span>
        </div>

        <h2 className="detail-title">{paper.title}</h2>
        <p className="detail-authors">{paper.authors || t('detail.unknownAuthors')}</p>

        {paper.abstract && (
          <div className="detail-section">
            <div className="detail-section-title">{t('common.abstract')}</div>
            <p className="detail-abstract">{paper.abstract}</p>
          </div>
        )}

        {keywords.length > 0 && (
          <div className="detail-section">
            <div className="detail-section-title">{t('common.keywords')}</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {keywords.map((keyword) => (
                <span key={keyword} className="keyword-chip">{keyword}</span>
              ))}
            </div>
          </div>
        )}

        {paper.doi && (
          <div className="detail-section">
            <div className="detail-section-title">DOI</div>
            <a href={`https://doi.org/${paper.doi}`} className="detail-doi" target="_blank" rel="noopener noreferrer">{paper.doi}</a>
          </div>
        )}

        {/* AI Summary Section */}
        <div className="detail-section">
          <div className="detail-section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            {t('summary.title')}
          </div>
          {hasSummary ? (
            <div>
              <p style={{ fontSize: '13px', color: 'var(--ink-700)', lineHeight: '1.6', margin: '0 0 8px' }}>
                {paper.summary_text.length > 200
                  ? paper.summary_text.substring(0, 200) + '...'
                  : paper.summary_text}
              </p>
              {summaryKeyPoints.length > 0 && (
                <div style={{ marginBottom: '8px' }}>
                  {summaryKeyPoints.slice(0, 3).map((point, i) => (
                    <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '4px' }}>
                      <span style={{ fontSize: '10px', color: 'var(--ink-400)', minWidth: '14px', textAlign: 'right' }}>{i + 1}.</span>
                      <span style={{ fontSize: '12px', color: 'var(--ink-500)', lineHeight: '1.4' }}>{point}</span>
                    </div>
                  ))}
                  {summaryKeyPoints.length > 3 && (
                    <span style={{ fontSize: '11px', color: 'var(--ink-400)' }}>
                      +{summaryKeyPoints.length - 3} {t('summary.keyPoints').toLowerCase()}...
                    </span>
                  )}
                </div>
              )}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => onOpenPDFViewer && onOpenPDFViewer(paper, true)}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                  </svg>
                  {t('summary.fullSummary')}
                </button>
                <span style={{ fontSize: '10px', color: 'var(--ink-400)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  {t('summary.cached')}
                </span>
              </div>
            </div>
          ) : hasPDF ? (
            <p style={{ fontSize: '12px', color: 'var(--ink-400)', margin: 0 }}>
              {t('summary.noSummary')}
            </p>
          ) : (
            <p style={{ fontSize: '12px', color: 'var(--ink-400)', margin: 0 }}>
              {t('summary.noPdf')}
            </p>
          )}
        </div>

        <NotesPanel
          paperId={paper.id}
          paperTitle={paper.title}
          paperAuthors={paper.authors}
          paperYear={paper.year}
          paperDoi={paper.doi}
        />

        <HighlightsPanel paperId={paper.id} />

        <div className="detail-section">
          <div className="detail-section-title">{t('common.category')}</div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            {paper.categories?.map((cat) => (
              <span key={cat.id} className="cat-badge">
                <span className="cat-dot" style={{ background: cat.color, width: '6px', height: '6px', display: 'inline-block', borderRadius: '50%', marginRight: '4px', verticalAlign: 'middle' }}></span>
                {cat.name}
              </span>
            ))}
            <button className="btn btn-secondary btn-sm" style={{ padding: '2px 10px', fontSize: '11px' }} onClick={handleOpenCategoryPicker}>
              {paper.categories?.length > 0 ? t('common.edit') : t('detail.addCategory')}
            </button>
          </div>
        </div>

        {/* Category Picker Modal */}
        {showCategoryPicker && (
          <div className="detail-section" style={{ background: 'var(--cream-100)', borderRadius: '8px', padding: '16px' }}>
            <div className="detail-section-title">{t('detail.chooseCategory')}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px', maxHeight: '200px', overflowY: 'auto' }}>
              {allCategories.length === 0 ? (
                <p style={{ fontSize: '12px', color: 'var(--ink-400)', margin: 0 }}>{t('detail.noCategories')}</p>
              ) : (
                allCategories.map(cat => (
                  <React.Fragment key={cat.id}>
                    <label
                      style={{
                        display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                        padding: '6px 10px', borderRadius: '6px',
                        background: selectedCategoryIds.includes(cat.id) ? 'var(--ink-900)' : '#fff',
                        color: selectedCategoryIds.includes(cat.id) ? 'var(--cream-50)' : 'var(--ink-700)',
                        border: '0.5px solid var(--cream-200)', fontSize: '12px',
                        transition: 'background 0.15s, color 0.15s',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedCategoryIds.includes(cat.id)}
                        onChange={() => handleToggleCategory(cat.id)}
                        style={{ display: 'none' }}
                      />
                      <span className="cat-dot" style={{ background: cat.color, width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0 }}></span>
                      {cat.name}
                    </label>
                    {cat.children?.map(child => (
                      <label
                        key={child.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                          padding: '6px 10px 6px 24px', borderRadius: '6px',
                          background: selectedCategoryIds.includes(child.id) ? 'var(--ink-900)' : '#fff',
                          color: selectedCategoryIds.includes(child.id) ? 'var(--cream-50)' : 'var(--ink-700)',
                          border: '0.5px solid var(--cream-200)', fontSize: '12px',
                          transition: 'background 0.15s, color 0.15s',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedCategoryIds.includes(child.id)}
                          onChange={() => handleToggleCategory(child.id)}
                          style={{ display: 'none' }}
                        />
                        <span className="cat-dot" style={{ background: child.color, width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0 }}></span>
                        {child.name}
                      </label>
                    ))}
                  </React.Fragment>
                ))
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowCategoryPicker(false)}>{t('common.cancel')}</button>
              <button className="btn btn-primary btn-sm" onClick={handleSaveCategories} disabled={savingCategories}>
                {savingCategories ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </div>
        )}

        <div className="detail-section">
          <div className="detail-section-title">Tags</div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            {paper.tags?.map((tag) => (
              <span key={tag.id} className="tag">{tag.name}</span>
            ))}
            <button className="btn btn-secondary btn-sm" style={{ padding: '2px 10px', fontSize: '11px' }} onClick={handleOpenTagPicker}>
              {paper.tags?.length > 0 ? t('common.edit') : t('detail.addTag')}
            </button>
          </div>
        </div>

        {/* Tag Picker Modal */}
        {showTagPicker && (
          <div className="detail-section" style={{ background: 'var(--cream-100)', borderRadius: '8px', padding: '16px' }}>
            <div className="detail-section-title">{t('detail.chooseTags')}</div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px', maxHeight: '160px', overflowY: 'auto' }}>
              {allTags.length === 0 ? (
                <p style={{ fontSize: '12px', color: 'var(--ink-400)', margin: 0 }}>{t('detail.noTags')}</p>
              ) : (
                allTags.map(tag => (
                  <label
                    key={tag.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer',
                      padding: '4px 10px', borderRadius: '6px',
                      background: selectedTagIds.includes(tag.id) ? 'var(--ink-900)' : '#fff',
                      color: selectedTagIds.includes(tag.id) ? 'var(--cream-50)' : 'var(--ink-700)',
                      border: '0.5px solid var(--cream-200)', fontSize: '12px',
                      transition: 'background 0.15s, color 0.15s',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedTagIds.includes(tag.id)}
                      onChange={() => handleToggleTag(tag.id)}
                      style={{ display: 'none' }}
                    />
                    {tag.name}
                  </label>
                ))
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowTagPicker(false)}>{t('common.cancel')}</button>
              <button className="btn btn-primary btn-sm" onClick={handleSaveTags} disabled={savingTags}>
                {savingTags ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </div>
        )}

        <div className="detail-footer">
          <button className="btn btn-secondary btn-sm" onClick={handleDelete}>{t('common.delete')}</button>
        </div>
      </div>

    </div>
  );
};

export default DetailPanel;