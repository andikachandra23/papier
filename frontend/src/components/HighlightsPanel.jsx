import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { useLanguage } from '../i18n/LanguageContext';
import { getHighlightBg } from '../utils/pdfHighlight';

const HighlightsPanel = ({ paperId }) => {
  const { t } = useLanguage();
  const [highlights, setHighlights] = useState([]);
  const [showList, setShowList] = useState(false);

  useEffect(() => {
    if (paperId) {
      fetchHighlights();
    }
  }, [paperId]);

  const fetchHighlights = async () => {
    try {
      const res = await client.get(`/highlights/${paperId}`);
      setHighlights(res.data);
    } catch (err) {
      console.error('Failed to fetch highlights', err);
    }
  };

  const handleDeleteHighlight = async (highlightId) => {
    if (!confirm(t('highlights.deleteConfirm'))) return;
    try {
      await client.delete(`/highlights/${highlightId}`);
      setHighlights(highlights.filter(h => h.id !== highlightId));
    } catch (err) {
      alert(t('highlights.deleteFailed'));
    }
  };

  if (highlights.length === 0) return null;

  return (
    <div className="detail-section highlights-section">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div className="detail-section-title" style={{ marginBottom: 0 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px', verticalAlign: 'middle' }}>
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2z"/>
          </svg>
          {t('highlights.title')} ({highlights.length})
        </div>
        <button
          className="btn btn-secondary btn-sm"
          style={{ padding: '2px 10px', fontSize: '11px' }}
          onClick={() => setShowList(!showList)}
        >
          {showList ? t('common.close') : t('highlights.title')}
        </button>
      </div>

      {showList && (
        <div className="highlights-list">
          {highlights.map((highlight) => (
            <div key={highlight.id} className="highlight-view-item">
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <span
                  className="highlight-color-dot"
                  style={{
                    background: getHighlightBg(highlight.color || '#FFEB3B'),
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    flexShrink: 0,
                    marginTop: '4px',
                    border: `1.5px solid ${highlight.color || '#FFEB3B'}`,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="highlight-text">"{highlight.text}"</div>
                  <div className="highlight-meta">
                    <span className="highlight-page">
                      {t('highlights.page')} {highlight.page}
                    </span>
                    <span className="highlight-date">
                      {new Date(highlight.created_at).toLocaleDateString()}
                    </span>
                    <button
                      className="note-action-btn note-action-delete"
                      onClick={() => handleDeleteHighlight(highlight.id)}
                      title={t('common.delete')}
                      style={{ marginLeft: 'auto' }}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HighlightsPanel;