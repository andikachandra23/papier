import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { useLanguage } from '../i18n/LanguageContext';

const COLORS = [
  '#D9D6C8',
  '#7B68AE',
  '#5A9BD5',
  '#70AD47',
  '#ED7D31',
  '#FFC000',
  '#FF6B6B',
  '#4ECDC4',
  '#95A5A6',
  '#2C3E50',
  '#E07B54',
  '#3B82A0',
  '#D4A574',
  '#6B8E6B',
  '#A0522D',
  '#4A90A4',
];

const EditCategoryModal = ({ isOpen, onClose, onCategoryUpdated, onCategoryDeleted, category }) => {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#D9D6C8');
  const [parentId, setParentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  useEffect(() => {
    if (category) {
      setName(category.name || '');
      setDescription(category.description || '');
      setColor(category.color || '#D9D6C8');
      setParentId(category.parent_id?.toString() || '');
      setError('');
      setShowDeleteConfirm(false);
    }
  }, [category]);

  const fetchCategories = async () => {
    try {
      const res = await client.get('/categories/');
      setCategories(res.data);
    } catch (err) {
      console.error('Failed to fetch categories', err);
    }
  };

  if (!isOpen || !category) return null;

  const handleSave = async () => {
    if (!name.trim()) {
      setError(t('category.nameRequired'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await client.put(`/categories/${category.id}`, {
        name: name.trim(),
        description: description.trim(),
        color,
        parent_id: parentId ? parseInt(parentId) : null,
      });
      onCategoryUpdated(res.data);
      handleClose();
    } catch (err) {
      setError(err.response?.data?.detail || t('category.updateFailed'));
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    setLoading(true);
    setError('');
    try {
      await client.delete(`/categories/${category.id}`);
      onCategoryDeleted(category.id);
      handleClose();
    } catch (err) {
      setError(err.response?.data?.detail || t('category.deleteFailed'));
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setColor('#D9D6C8');
    setParentId('');
    setError('');
    setShowDeleteConfirm(false);
    onClose();
  };

  const isSub = !!category.parent_id;

  return (
    <div className={`modal-overlay ${isOpen ? 'open' : ''}`} onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
        <div className="modal-header">
          <h2>{isSub ? t('category.editSubcategory') : t('category.editCategory')}</h2>
          <button className="modal-close" onClick={handleClose}>×</button>
        </div>
        <div className="modal-body">
          {!showDeleteConfirm ? (
            <>
              <div className="form-group">
                <div className="section-header">{t('category.parent')}</div>
                <select
                  className="input-field"
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                >
                  <option value="">{t('category.noParent')}</option>
                  {categories.filter(c => c.id !== category.id).map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <div className="section-header">{t('category.nameShort')}</div>
                <input
                  className="input-field"
                  type="text"
                  placeholder={isSub ? t('category.subNamePlaceholder') : t('category.catNamePlaceholder')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <div className="section-header">{t('category.desc')}</div>
                <textarea
                  className="input-field"
                  placeholder={t('category.descShortPlaceholder')}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  style={{ resize: 'vertical' }}
                />
              </div>
              <div className="form-group">
                <div className="section-header">{t('category.color')}</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {COLORS.map((c) => (
                    <div
                      key={c}
                      onClick={() => setColor(c)}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: c,
                        cursor: 'pointer',
                        border: c === color ? '3px solid var(--ink-900, #1a1a1a)' : '2px solid var(--border, #e0ddd5)',
                      }}
                    />
                  ))}
                </div>
              </div>
              {error && <p style={{ color: 'var(--error, #e74c3c)', margin: '12px 0' }}>{error}</p>}
            </>
          ) : (
            <div style={{ padding: '16px 0' }}>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--ink-600)' }}>
                {t('category.confirmDelete', { type: isSub ? t('category.subcategory') : t('category.category') })}<strong>{category.name}</strong>?
              </p>
              <p style={{ margin: '8px 0 0', fontSize: '13px', color: 'var(--ink-400)' }}>
                {t('category.irreversible')}
              </p>
              {error && <p style={{ color: 'var(--error, #e74c3c)', margin: '12px 0' }}>{error}</p>}
            </div>
          )}
        </div>
        <div className="modal-footer">
          {!showDeleteConfirm ? (
            <>
              <button
                className="btn"
                style={{ color: 'var(--error, #e74c3c)', background: 'none', border: 'none', cursor: 'pointer' }}
                onClick={() => setShowDeleteConfirm(true)}
              >
                {t('common.delete')}
              </button>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-secondary" onClick={handleClose}>{t('common.cancel')}</button>
                <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
                  {loading ? t('common.saving') : t('common.save')}
                </button>
              </div>
            </>
          ) : (
            <>
              <button className="btn btn-secondary" onClick={() => setShowDeleteConfirm(false)}>{t('common.back')}</button>
              <button
                className="btn"
                style={{ background: 'var(--error, #e74c3c)', color: '#fff', border: 'none' }}
                onClick={handleDelete}
                disabled={loading}
              >
                {loading ? t('category.deleting') : t('category.yesDelete')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditCategoryModal;