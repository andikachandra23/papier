import React, { useState, useCallback } from 'react';
import client from '../api/client';
import { useLanguage } from '../i18n/LanguageContext';
import { getAutoHighlightColor, getRandomHighlightColor } from '../utils/pdfHighlight';

const AutoHighlightPanel = ({ paper, isOpen, onClose, onApplyHighlights }) => {
  const { t, language } = useLanguage();
  const [sentences, setSentences] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedSentences, setSelectedSentences] = useState(new Set());
  const [totalFound, setTotalFound] = useState(0);
  const [pagesScanned, setPagesScanned] = useState(0);
  const [applying, setApplying] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const getCategoryLabel = useCallback((category) => {
    const catKey = category || 'lainnya';
    try {
      return t(`autoHighlight.categories.${catKey}`) || category;
    } catch {
      return category;
    }
  }, [t]);

  const fetchAutoHighlights = useCallback(async () => {
    if (!paper?.id) return;
    setLoading(true);
    setError(null);
    setSentences([]);
    setSelectedSentences(new Set());

    try {
      const params = { lang: language, max_sentences: 15 };
      if (searchQuery.trim()) {
        params.query = searchQuery.trim();
      }
      const res = await client.get(`/papers/${paper.id}/auto-highlights`, { params });
      const data = res.data;
      setSentences(data.sentences || []);
      setTotalFound(data.total_found || 0);
      setPagesScanned(data.pages_scanned || 0);

      // Select all by default
      const allIndices = new Set((data.sentences || []).map((_, idx) => idx));
      setSelectedSentences(allIndices);
    } catch (err) {
      const msg = err.response?.data?.detail || t('autoHighlight.fetchFailed');
      setError(msg);
    }
    setLoading(false);
  }, [paper?.id, language, t, searchQuery]);

  const toggleSentence = (idx) => {
    setSelectedSentences(prev => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const selectAll = useCallback((e) => {
    e.stopPropagation();
    const allIndices = new Set(sentences.map((_, idx) => idx));
    setSelectedSentences(allIndices);
  }, [sentences]);

  const deselectAll = useCallback((e) => {
    e.stopPropagation();
    setSelectedSentences(new Set());
  }, []);

  const handleApply = useCallback(async () => {
    const selected = sentences.filter((_, idx) => selectedSentences.has(idx));
    if (selected.length === 0) return;

    setApplying(true);
    try {
      await onApplyHighlights(selected);
    } catch (err) {
      console.error('Failed to apply auto highlights', err);
    }
    setApplying(false);
  }, [sentences, selectedSentences, onApplyHighlights]);

  const handleClear = useCallback(() => {
    setSentences([]);
    setSelectedSentences(new Set());
    setTotalFound(0);
    setPagesScanned(0);
    setError(null);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="summary-panel-overlay" style={{ pointerEvents: 'auto', width: '100%' }} onClick={onClose}>
      <div className="summary-panel" style={{ width: '420px' }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="summary-panel-header">
          <div className="summary-panel-title-row">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2z"/>
            </svg>
            <h3 className="summary-panel-heading">{t('autoHighlight.title')}</h3>
            {totalFound > 0 && !loading && (
              <span className="summary-cached-badge" style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '8px', background: 'var(--accent-primary, #6366f1)', color: 'white', marginLeft: '8px' }}>
                {totalFound}
              </span>
            )}
          </div>
          <button className="pdf-toolbar-btn" onClick={onClose} title={t('common.close')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
            </svg>
          </button>
        </div>

        {/* Search Query Input & Generate Button (when no sentences) */}
        {!loading && sentences.length === 0 && !error && (
          <div className="summary-controls">
            <label style={{ fontSize: '12px', fontWeight: '500', color: 'var(--ink-600, #444)', marginBottom: '4px', display: 'block' }}>
              {t('autoHighlight.searchLabel')}
            </label>
            <textarea
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('autoHighlight.searchPlaceholder')}
              rows={3}
              style={{
                width: '100%',
                padding: '8px 10px',
                fontSize: '12px',
                lineHeight: '1.5',
                border: '1px solid var(--border, #d1d5db)',
                borderRadius: '6px',
                resize: 'vertical',
                fontFamily: 'inherit',
                background: 'var(--bg-primary, #fff)',
                color: 'var(--ink-700, #333)',
                outline: 'none',
                marginBottom: '8px',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => { e.target.style.borderColor = 'var(--accent-primary, #6366f1)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'var(--border, #d1d5db)'; }}
            />
            <p style={{ fontSize: '11px', color: 'var(--ink-400, #999)', margin: '0 0 12px', lineHeight: '1.4' }}>
              {t('autoHighlight.searchHint')}
            </p>
            <button
              className="btn btn-primary summary-generate-btn"
              onClick={fetchAutoHighlights}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2z"/>
              </svg>
              {t('autoHighlight.generate')}
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="summary-loading">
            <div className="spinner" />
            <span>{t('autoHighlight.generating')}</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="summary-error">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--rose-400)" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p>{error}</p>
            <button className="btn btn-secondary btn-sm" onClick={fetchAutoHighlights}>
              {t('pdf.retry')}
            </button>
          </div>
        )}

        {/* Sentences List */}
        {sentences.length > 0 && !loading && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            {/* Stats bar */}
            <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border, #e5e5e5)', fontSize: '11px', color: 'var(--ink-400, #888)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>
                {t('autoHighlight.found', { count: totalFound })} · {t('summary.pages')}: {pagesScanned}
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button className="btn btn-secondary btn-sm" style={{ padding: '3px 10px', fontSize: '10px' }} onClick={selectAll}>
                  {t('library.selectAll')}
                </button>
                <button className="btn btn-secondary btn-sm" style={{ padding: '3px 10px', fontSize: '10px' }} onClick={deselectAll}>
                  {t('autoHighlight.clear')}
                </button>
              </div>
            </div>

            {/* Sentence items */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px' }}>
              {sentences.map((sentence, idx) => {
                const isSelected = selectedSentences.has(idx);
                const color = getAutoHighlightColor(sentence.category);
                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                      padding: '8px',
                      marginBottom: '6px',
                      borderRadius: '6px',
                      border: `1.5px solid ${isSelected ? color : 'var(--border, #e5e5e5)'}`,
                      background: isSelected ? `${color}10` : 'transparent',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      opacity: isSelected ? 1 : 0.6,
                    }}
                    onClick={() => toggleSentence(idx)}
                  >
                    {/* Checkbox */}
                    <div style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '3px',
                      border: `2px solid ${isSelected ? color : 'var(--border, #ccc)'}`,
                      background: isSelected ? color : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '1px',
                    }}>
                      {isSelected && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Category badge */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <span style={{
                          fontSize: '9px',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          padding: '1px 6px',
                          borderRadius: '3px',
                          background: `${color}25`,
                          color: color,
                        }}>
                          {getCategoryLabel(sentence.category)}
                        </span>
                        <span style={{ fontSize: '10px', color: 'var(--ink-400, #888)' }}>
                          {t('autoHighlight.page')} {sentence.page}
                        </span>
                      </div>

                      {/* Sentence text (original) */}
                      <div style={{
                        fontSize: '12px',
                        lineHeight: '1.5',
                        color: 'var(--ink-700, #333)',
                      }}>
                        "{sentence.text.length > 200 ? sentence.text.substring(0, 200) + '...' : sentence.text}"
                      </div>

                      {/* Indonesian translation */}
                      {sentence.text_id && (
                        <div style={{
                          fontSize: '11px',
                          lineHeight: '1.4',
                          color: 'var(--ink-400, #888)',
                          marginTop: '4px',
                          fontStyle: 'italic',
                          paddingLeft: '8px',
                          borderLeft: `2px solid ${color}40`,
                        }}>
                          🇮🇩 {sentence.text_id.length > 200 ? sentence.text_id.substring(0, 200) + '...' : sentence.text_id}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer actions */}
            <div className="summary-footer" style={{ display: 'flex', gap: '8px', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleClear}
                >
                  {t('autoHighlight.clear')}
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={fetchAutoHighlights}
                  disabled={loading}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/>
                    <path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
                  </svg>
                  {t('summary.regenerate')}
                </button>
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleApply}
                disabled={applying || selectedSentences.size === 0}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
                </svg>
                {applying ? t('common.saving') : `${t('autoHighlight.saveHighlights')} (${selectedSentences.size})`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AutoHighlightPanel;