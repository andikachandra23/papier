import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { useLanguage } from '../i18n/LanguageContext';

const AddCategoryModal = ({ isOpen, onClose, onCategoryAdded }) => {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#C4852E');
  const [parentId, setParentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);

  const colors = ['#C4852E', '#5C8052', '#8A72A8', '#5A7A9E', '#C45252', '#5DCAA5', '#B8B5AE', '#E07B54', '#3B82A0', '#D4A574', '#6B8E6B', '#A0522D', '#7B6B8A', '#4A90A4'];

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

  const handleSubmit = async () => {
    if (!name.trim()) {
      alert(t('category.nameRequired'));
      return;
    }
    setLoading(true);
    try {
      const res = await client.post('/categories/', { 
        name: name.trim(),
        description: description.trim(),
        color,
        parent_id: parentId ? parseInt(parentId) : null 
      });
      onCategoryAdded(res.data);
      handleClose();
    } catch (err) {
      alert(t('category.addFailed'));
    }
    setLoading(false);
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setColor('#C4852E');
    setParentId('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={`modal-overlay ${isOpen ? 'open' : ''}`} onClick={handleClose}>
      <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{t('category.newTitle')}</h2>
          <button className="modal-close" onClick={handleClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
            </svg>
          </button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <div className="section-header">{t('category.parentOptional')}</div>
            <select
              className="input-field"
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
            >
              <option value="">{t('category.noParent')}</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <div className="section-header">{t('category.name')}</div>
            <input className="input-field" placeholder={t('category.namePlaceholder')} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="form-group">
            <div className="section-header">{t('category.descOptional')}</div>
            <textarea
              className="input-field"
              placeholder={t('category.descPlaceholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              style={{ resize: 'vertical' }}
            />
          </div>
          <div className="form-group">
            <div className="section-header">{t('category.color')}</div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {colors.map((c) => (
                <div
                  key={c}
                  className={`color-swatch ${color === c ? 'selected' : ''}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={handleClose}>{t('common.cancel')}</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddCategoryModal;
