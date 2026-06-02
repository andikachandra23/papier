import React, { useState, useEffect, useCallback } from 'react';
import client from '../api/client';
import { useLanguage } from '../i18n/LanguageContext';

const SummaryPanel = ({ paper, isOpen, onClose }) => {
  const { t, language } = useLanguage();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('summary');
  const [sentenceCount, setSentenceCount] = useState(7);
  const [summaryLang, setSummaryLang] = useState(language);

  // Sync summaryLang when panel opens: prefer cached summary's language, fallback to global language
  useEffect(() => {
    if (isOpen && paper) {
      if (paper.summary_text && paper.summary_lang) {
        setSummaryLang(paper.summary_lang);
      } else {
        setSummaryLang(language);
      }
    }
  }, [isOpen, paper?.id, paper?.summary_lang, language]);

  // Load cached summary when panel opens or paper changes
  useEffect(() => {
    if (isOpen && paper) {
      // Check if paper has cached summary matching selected summary language
      if (paper.summary_text && paper.summary_lang === summaryLang) {
        let keyPoints = [];
        try {
          keyPoints = paper.summary_key_points ? JSON.parse(paper.summary_key_points) : [];
        } catch {
          keyPoints = [];
        }
        setSummary({
          summary: paper.summary_text,
          key_points: keyPoints,
          word_count_original: paper.summary_text.split(/\s+/).length,
          word_count_summary: paper.summary_text.split(/\s+/).length,
          pages_processed: paper.summary_pages || 0,
          total_pages: paper.summary_pages || 0,
        });
        setError(null);
      } else {
        setSummary(null);
        setError(null);
      }
      setLoading(false);
      setActiveTab('summary');
    }
  }, [isOpen, paper?.id, paper?.summary_text, paper?.summary_lang, summaryLang]);

  // Fetch/generate summary
  const fetchSummary = useCallback(async (force = false) => {
    if (!paper?.id) return;
    setLoading(true);
    setError(null);

    try {
      const res = await client.get(`/papers/${paper.id}/summarize`, {
        params: { max_sentences: sentenceCount, lang: summaryLang, force },
      });
      setSummary(res.data);
    } catch (err) {
      const msg = err.response?.data?.detail || t('summary.fetchFailed');
      setError(msg);
    }
    setLoading(false);
  }, [paper?.id, sentenceCount, t, summaryLang]);

  // Delete cached summary and regenerate
  const handleRegenerate = useCallback(async () => {
    if (!paper?.id) return;
    setLoading(true);
    setError(null);
    setSummary(null);

    try {
      // Delete cached summary first
      await client.delete(`/papers/${paper.id}/summary`);
      // Then generate new one
      const res = await client.get(`/papers/${paper.id}/summarize`, {
        params: { max_sentences: sentenceCount, lang: summaryLang, force: true },
      });
      setSummary(res.data);
    } catch (err) {
      const msg = err.response?.data?.detail || t('summary.fetchFailed');
      setError(msg);
    }
    setLoading(false);
  }, [paper?.id, sentenceCount, t, summaryLang]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const compressionRatio = summary && summary.word_count_original > 0
    ? Math.round((1 - summary.word_count_summary / summary.word_count_original) * 100)
    : 0;

  if (!isOpen) return null;

  return (
    <div className="summary-panel-overlay">
      <div className="summary-panel">
        {/* Header */}
        <div className="summary-panel-header">
          <div className="summary-panel-title-row">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            <h3 className="summary-panel-heading">{t('summary.title')}</h3>
            {summary && (
              <span className="summary-cached-badge" title={t('summary.cached')}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </span>
            )}
          </div>
          <button className="pdf-toolbar-btn" onClick={handleClose} title={t('common.close')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
            </svg>
          </button>
        </div>

        {/* Controls - shown when no summary */}
        {!summary && !loading && (
          <div className="summary-controls">
            <div className="summary-control-group">
              <label className="summary-control-label">{t('summary.language')}</label>
              <select
                className="summary-select"
                value={summaryLang}
                onChange={(e) => setSummaryLang(e.target.value)}
              >
                <option value="id">{t('summary.langId')}</option>
                <option value="en">{t('summary.langEn')}</option>
              </select>
            </div>
            <div className="summary-control-group">
              <label className="summary-control-label">{t('summary.sentenceCount')}</label>
              <select
                className="summary-select"
                value={sentenceCount}
                onChange={(e) => setSentenceCount(Number(e.target.value))}
              >
                <option value={3}>3</option>
                <option value={5}>5</option>
                <option value={7}>7</option>
                <option value={10}>10</option>
                <option value={15}>15</option>
              </select>
            </div>
            <button
              className="btn btn-primary summary-generate-btn"
              onClick={() => fetchSummary(false)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
              </svg>
              {t('summary.generate')}
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="summary-loading">
            <div className="spinner" />
            <span>{t('summary.loading')}</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="summary-error">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--rose-400)" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p>{error}</p>
            <button className="btn btn-secondary btn-sm" onClick={() => fetchSummary(false)}>
              {t('pdf.retry')}
            </button>
          </div>
        )}

        {/* Summary Content */}
        {summary && !loading && (
          <div className="summary-content">
            {/* Stats */}
            <div className="summary-stats">
              <div className="summary-stat">
                <span className="summary-stat-value">{summary.word_count_original.toLocaleString()}</span>
                <span className="summary-stat-label">{t('summary.originalWords')}</span>
              </div>
              <div className="summary-stat">
                <span className="summary-stat-value">{summary.word_count_summary.toLocaleString()}</span>
                <span className="summary-stat-label">{t('summary.summaryWords')}</span>
              </div>
              <div className="summary-stat">
                <span className="summary-stat-value">{compressionRatio}%</span>
                <span className="summary-stat-label">{t('summary.compressed')}</span>
              </div>
              <div className="summary-stat">
                <span className="summary-stat-value">{summary.total_pages}</span>
                <span className="summary-stat-label">{t('summary.pages')}</span>
              </div>
            </div>

            {/* Token Usage Info */}
            {summary.total_tokens > 0 && (
              <div style={{
                display: 'flex', gap: '12px', padding: '10px 14px',
                background: 'var(--lavender-50)', borderRadius: '8px',
                marginBottom: '12px', fontSize: '12px', color: 'var(--lavender-600)',
                alignItems: 'center', flexWrap: 'wrap',
              }}>
                <span style={{ fontWeight: 600 }}>🤖 Token Usage:</span>
                <span>📥 {t('tokenUsage.totalPrompt')}: <strong>{(summary.prompt_tokens || 0).toLocaleString()}</strong></span>
                <span>📤 {t('tokenUsage.totalCompletion')}: <strong>{(summary.completion_tokens || 0).toLocaleString()}</strong></span>
                <span>📊 {t('tokenUsage.totalAll')}: <strong>{(summary.total_tokens || 0).toLocaleString()}</strong></span>
              </div>
            )}

            {/* Tabs */}
            <div className="summary-tabs">
              <button
                className={`summary-tab ${activeTab === 'summary' ? 'active' : ''}`}
                onClick={() => setActiveTab('summary')}
              >
                {t('summary.fullSummary')}
              </button>
              <button
                className={`summary-tab ${activeTab === 'keypoints' ? 'active' : ''}`}
                onClick={() => setActiveTab('keypoints')}
              >
                {t('summary.keyPoints')}
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'summary' ? (
              <div className="summary-text">
                {summary.summary}
              </div>
            ) : (
              <div className="summary-keypoints">
                {summary.key_points.map((point, idx) => (
                  <div key={idx} className="summary-keypoint">
                    <div className="summary-keypoint-number">{idx + 1}</div>
                    <div className="summary-keypoint-text">{point}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Footer with regenerate */}
            <div className="summary-footer">
              <div className="summary-control-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label className="summary-control-label" style={{ margin: 0 }}>{t('summary.language')}:</label>
                <select
                  className="summary-select"
                  value={summaryLang}
                  onChange={(e) => setSummaryLang(e.target.value)}
                >
                  <option value="id">{t('summary.langId')}</option>
                  <option value="en">{t('summary.langEn')}</option>
                </select>
              </div>
              <div className="summary-control-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label className="summary-control-label" style={{ margin: 0 }}>{t('summary.sentenceCount')}:</label>
                <select
                  className="summary-select"
                  value={sentenceCount}
                  onChange={(e) => setSentenceCount(Number(e.target.value))}
                >
                  <option value={3}>3</option>
                  <option value={5}>5</option>
                  <option value={7}>7</option>
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                </select>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={handleRegenerate}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/>
                  <path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
                </svg>
                {t('summary.regenerate')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SummaryPanel;