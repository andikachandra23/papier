import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { useLanguage } from '../i18n/LanguageContext';

const AddPaperModal = ({ isOpen, onClose, onPaperAdded }) => {
  const { t } = useLanguage();
  const [title, setTitle] = useState('');
  const [authors, setAuthors] = useState('');
  const [year, setYear] = useState('');
  const [abstract, setAbstract] = useState('');
  const [keywords, setKeywords] = useState('');
  const [doi, setDoi] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [doiLoading, setDoiLoading] = useState(false);

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

  const handleImportDOI = async () => {
    if (!doi.trim()) return;
    setDoiLoading(true);
    try {
      const trimmedDoi = doi.trim();
      console.log('Fetching DOI:', trimmedDoi);
      const res = await client.get(`/doi/${encodeURIComponent(trimmedDoi)}`);
      const data = res.data;
      console.log('DOI metadata received:', data);
      setTitle(data.title || '');
      setAuthors(data.authors || '');
      setYear(data.year?.toString() || '');
      setAbstract(data.abstract || '');
      setKeywords(data.keywords || '');
    } catch (err) {
      console.error('DOI import error:', err);
      alert(err.response?.data?.detail || t('addPaper.doiFailed'));
    }
    setDoiLoading(false);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      alert(t('addPaper.titleRequired'));
      return;
    }
    setLoading(true);
    try {
      const paperData = {
        title: title.trim(),
        authors: authors.trim(),
        year: year ? parseInt(year) : null,
        abstract: abstract.trim(),
        keywords: keywords.trim(),
        doi: doi.trim(),
        category_ids: categoryId ? [parseInt(categoryId)] : [],
      };
      const res = await client.post('/papers/', paperData);
      onPaperAdded(res.data);
      handleClose();
    } catch (err) {
      alert(t('addPaper.addFailed'));
    }
    setLoading(false);
  };

  const handleClose = () => {
    setTitle(''); setAuthors(''); setYear('');
    setAbstract(''); setKeywords(''); setDoi(''); setCategoryId('');
    setCategories([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={`modal-overlay ${isOpen ? 'open' : ''}`} onClick={handleClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{t('addPaper.title')}</h2>
          <button className="modal-close" onClick={handleClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <div className="section-header">{t('addPaper.importViaDoi')}</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                className="input-field"
                placeholder="10.xxxx/xxxx"
                value={doi}
                onChange={(e) => setDoi(e.target.value)}
              />
              <button className="btn btn-primary" onClick={handleImportDOI} disabled={doiLoading}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              </button>
            </div>
            <div className={`doi-loader ${doiLoading ? 'show' : ''}`}>
              <div className="spinner"></div>
              <span>{t('addPaper.fetchingDoi')}</span>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--cream-200)', margin: '16px 0', paddingTop: '12px' }}>
            <span style={{ fontSize: '12px', color: 'var(--ink-400)' }}>{t('addPaper.manual')}</span>
          </div>

          <div className="form-group">
            <div className="section-header">{t('common.title')}</div>
            <input className="input-field" placeholder={t('addPaper.paperTitle')} value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="form-group">
            <div className="section-header">{t('common.authors')}</div>
            <input className="input-field" placeholder={t('addPaper.authorsPlaceholder')} value={authors} onChange={(e) => setAuthors(e.target.value)} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <div className="section-header">{t('common.year')}</div>
              <input className="input-field" type="number" placeholder="2024" value={year} onChange={(e) => setYear(e.target.value)} />
            </div>
            <div className="form-group">
              <div className="section-header">{t('common.category')}</div>
              <select className="input-field" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">{t('addPaper.selectCategory')}</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group">
            <div className="section-header">{t('common.abstract')}</div>
            <textarea className="input-field" rows="3" placeholder={t('addPaper.abstractPlaceholder')} value={abstract} onChange={(e) => setAbstract(e.target.value)} />
          </div>
          <div className="form-group">
            <div className="section-header">{t('common.keywords')}</div>
            <input className="input-field" placeholder={t('addPaper.keywordsPlaceholder')} value={keywords} onChange={(e) => setKeywords(e.target.value)} />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={handleClose}>{t('common.cancel')}</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? t('common.saving') : t('addPaper.savePaper')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddPaperModal;
