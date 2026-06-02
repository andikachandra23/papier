import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { useLanguage } from '../i18n/LanguageContext';

const TagManager = ({ isOpen, onClose, onTagCreated, onTagRenamed, onTagDeleted }) => {
  const { t } = useLanguage();
  const [tags, setTags] = useState([]);
  const [newTagName, setNewTagName] = useState('');
  const [editingTag, setEditingTag] = useState(null);
  const [editName, setEditName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchTags();
    }
  }, [isOpen]);

  const fetchTags = async () => {
    try {
      const res = await client.get('/tags/');
      setTags(res.data);
    } catch (err) {
      console.error('Failed to fetch tags', err);
    }
  };

  const handleCreate = async () => {
    if (!newTagName.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await client.post('/tags/', { name: newTagName.trim() });
      setTags([...tags, res.data]);
      setNewTagName('');
      if (onTagCreated) onTagCreated();
    } catch (err) {
      setError(err.response?.data?.detail || t('tagManager.createFailed'));
    }
    setLoading(false);
  };

  const handleRename = async (tagId) => {
    if (!editName.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await client.put(`/tags/${tagId}`, { name: editName.trim() });
      setTags(tags.map(t => t.id === tagId ? res.data : t));
      setEditingTag(null);
      setEditName('');
      if (onTagRenamed) onTagRenamed();
    } catch (err) {
      setError(err.response?.data?.detail || t('tagManager.renameFailed'));
    }
    setLoading(false);
  };

  const handleDelete = async (tagId) => {
    if (!confirm(t('tagManager.deleteConfirm'))) return;
    setLoading(true);
    setError('');
    try {
      await client.delete(`/tags/${tagId}`);
      setTags(tags.filter(t => t.id !== tagId));
      if (onTagDeleted) onTagDeleted();
    } catch (err) {
      setError(err.response?.data?.detail || t('tagManager.deleteFailed'));
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className={`modal-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <h2>{t('tagManager.title')}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <div className="section-header">{t('tagManager.addNew')}</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                className="input-field"
                style={{ flex: 1 }}
                type="text"
                placeholder={t('tagManager.namePlaceholder')}
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
              />
              <button className="btn btn-primary" onClick={handleCreate} disabled={loading || !newTagName.trim()}>
                Tambah
              </button>
            </div>
          </div>

          {error && <p style={{ color: 'var(--error, #e74c3c)', margin: '12px 0' }}>{error}</p>}

          <div className="form-group" style={{ marginTop: '16px' }}>
            <div className="section-header">{t('tagManager.list')}</div>
            {tags.length === 0 ? (
              <p style={{ color: 'var(--ink-400)', fontSize: '13px', margin: '8px 0' }}>{t('tagManager.empty')}</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {tags.map((tag) => (
                  <div
                    key={tag.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      background: 'var(--cream-100)',
                      borderRadius: '6px',
                      border: '0.5px solid var(--cream-200)',
                    }}
                  >
                    {editingTag === tag.id ? (
                      <>
                        <input
                          className="input-field"
                          style={{ flex: 1, padding: '4px 8px', fontSize: '12px' }}
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRename(tag.id);
                            if (e.key === 'Escape') { setEditingTag(null); setEditName(''); }
                          }}
                          autoFocus
                        />
                        <button
                          className="btn btn-sm"
                          style={{ padding: '4px 8px', fontSize: '11px' }}
                          onClick={() => handleRename(tag.id)}
                          disabled={loading}
                        >
                          Simpan
                        </button>
                        <button
                          className="btn btn-sm btn-secondary"
                          style={{ padding: '4px 8px', fontSize: '11px' }}
                          onClick={() => { setEditingTag(null); setEditName(''); }}
                        >
                          Batal
                        </button>
                      </>
                    ) : (
                      <>
                        <span style={{ flex: 1, fontSize: '13px' }}>{tag.name}</span>
                        <button
                          className="btn btn-sm btn-secondary"
                          style={{ padding: '4px 8px', fontSize: '11px' }}
                          onClick={() => { setEditingTag(tag.id); setEditName(tag.name); }}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-sm"
                          style={{ padding: '4px 8px', fontSize: '11px', color: 'var(--error, #e74c3c)' }}
                          onClick={() => handleDelete(tag.id)}
                          disabled={loading}
                        >
                          Hapus
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>{t('common.close')}</button>
        </div>
      </div>
    </div>
  );
};

export default TagManager;
