import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { useLanguage } from '../i18n/LanguageContext';

const ImportDOIModal = ({ isOpen, onClose, onPaperAdded }) => {
  const { t } = useLanguage();
  const [doi, setDoi] = useState('');
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  const fetchCategories = async () => {
    try {
      const res = await client.get('/categories/');
      setCategories(res.data);
    } catch (err) {
      console.error('Failed to fetch categories', err);
    }
  };

  if (!isOpen) return null;

  const handleSearch = async () => {
    if (!doi.trim()) return;
    setLoading(true);
    setError('');
    setMetadata(null);
    try {
      const res = await client.get(`/doi/${encodeURIComponent(doi.trim())}`);
      setMetadata(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || t('doi.fetchFailed'));
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!metadata) return;
    setSaving(true);
    setError('');
    try {
      const paperData = {
        title: metadata.title,
        authors: metadata.authors,
        year: metadata.year,
        abstract: metadata.abstract,
        keywords: metadata.keywords || '',
        doi: metadata.doi,
        category_ids: categoryId ? [parseInt(categoryId)] : [],
      };
      const res = await client.post('/papers/', paperData);
      onPaperAdded(res.data);
      handleClose();
    } catch (err) {
      setError(err.response?.data?.detail || t('doi.saveFailed'));
    }
    setSaving(false);
  };

  const handleClose = () => {
    setDoi('');
    setMetadata(null);
    setError('');
    setCategoryId('');
    onClose();
  };

  return (
    <div className={`modal-overlay ${isOpen ? 'open' : ''}`} onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
        <div className="modal-header">
          <h2>{t('doi.importTitle')}</h2>
          <button className="modal-close" onClick={handleClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <div className="section-header">DOI</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                className="input-field"
                style={{ flex: 1 }}
                type="text"
                placeholder={t('doi.example')}
                value={doi}
                onChange={(e) => setDoi(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
              />
              <button className="btn btn-primary" onClick={handleSearch} disabled={loading}>
                {loading ? t('doi.searching') : t('doi.search')}
              </button>
            </div>
          </div>

          {error && <p style={{ color: 'var(--error, #e74c3c)', margin: '12px 0' }}>{error}</p>}

          {metadata && (
            <>
              <div className="form-group">
                <div className="section-header">{t('doi.optionalCategory')}</div>
                <select
                  className="input-field"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  <option value="">{t('addPaper.selectCategory')}</option>
                  {categories.map((cat) => (
                    <React.Fragment key={cat.id}>
                      <option value={cat.id}>{cat.name}</option>
                      {cat.children?.map((child) => (
                        <option key={child.id} value={child.id}>  {child.name}</option>
                      ))}
                    </React.Fragment>
                  ))}
                </select>
              </div>
            <div style={{
              marginTop: '16px',
              padding: '16px',
              background: 'var(--surface-50, #f9f8f5)',
              borderRadius: '8px',
              border: '1px solid var(--border, #e0ddd5)',
            }}>
              <div style={{ marginBottom: '12px' }}>
                <div className="section-header" style={{ marginBottom: '4px' }}>{t('common.title')}</div>
                <p style={{ margin: 0, fontSize: '14px' }}>{metadata.title}</p>
              </div>
              {metadata.authors && (
                <div style={{ marginBottom: '12px' }}>
                  <div className="section-header" style={{ marginBottom: '4px' }}>{t('common.authors')}</div>
                  <p style={{ margin: 0, fontSize: '14px' }}>{metadata.authors}</p>
                </div>
              )}
              {metadata.year && (
                <div style={{ marginBottom: '12px' }}>
                  <div className="section-header" style={{ marginBottom: '4px' }}>{t('common.year')}</div>
                  <p style={{ margin: 0, fontSize: '14px' }}>{metadata.year}</p>
                </div>
              )}
              {metadata.abstract && (
                <div>
                  <div className="section-header" style={{ marginBottom: '4px' }}>{t('common.abstract')}</div>
                  <p style={{
                    margin: 0,
                    fontSize: '13px',
                    color: 'var(--ink-400)',
                    maxHeight: '120px',
                    overflow: 'auto',
                    lineHeight: '1.5',
                  }}>
                    {metadata.abstract}
                  </p>
                </div>
              )}
              {metadata.keywords && (
                <div style={{ marginTop: '12px' }}>
                  <div className="section-header" style={{ marginBottom: '4px' }}>{t('common.keywords')}</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {metadata.keywords.split(',').map(k => k.trim()).filter(Boolean).map(keyword => (
                      <span key={keyword} className="keyword-chip">{keyword}</span>
                    ))}
                  </div>
                </div>
              )}
              </div>
            </>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={handleClose}>{t('common.cancel')}</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={!metadata || saving}>
            {saving ? t('common.saving') : t('doi.saveToLibrary')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportDOIModal;
