import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { useLanguage } from '../i18n/LanguageContext';

const NotesPanel = ({ paperId, paperTitle, paperAuthors, paperYear, paperDoi }) => {
  const { t } = useLanguage();
  const [notes, setNotes] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newPageNumber, setNewPageNumber] = useState('');
  const [newComment, setNewComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [editComment, setEditComment] = useState('');

  useEffect(() => {
    if (paperId) {
      fetchNotes();
    }
  }, [paperId]);

  const fetchNotes = async () => {
    try {
      const res = await client.get(`/notes/paper/${paperId}`);
      setNotes(res.data);
    } catch (err) {
      console.error('Failed to fetch notes', err);
    }
  };

  const handleAddNote = async () => {
    if (!newContent.trim()) return;
    setSaving(true);
    try {
      const res = await client.post(`/notes/${paperId}`, {
        content: newContent.trim(),
        page_number: newPageNumber ? parseInt(newPageNumber) : null,
        user_comment: newComment.trim(),
      });
      setNotes([res.data, ...notes]);
      setNewContent('');
      setNewPageNumber('');
      setNewComment('');
      setShowAddForm(false);
    } catch (err) {
      alert(t('notes.addFailed'));
    }
    setSaving(false);
  };

  const handleUpdateNote = async (noteId) => {
    if (!editContent.trim()) return;
    setSaving(true);
    try {
      const res = await client.put(`/notes/${noteId}`, {
        content: editContent.trim(),
        user_comment: editComment.trim(),
      });
      setNotes(notes.map(n => n.id === noteId ? res.data : n));
      setEditingNoteId(null);
    } catch (err) {
      alert(t('notes.updateFailed'));
    }
    setSaving(false);
  };

  const handleDeleteNote = async (noteId) => {
    if (!confirm(t('notes.deleteConfirm'))) return;
    try {
      await client.delete(`/notes/${noteId}`);
      setNotes(notes.filter(n => n.id !== noteId));
    } catch (err) {
      alert(t('notes.deleteFailed'));
    }
  };

  const startEdit = (note) => {
    setEditingNoteId(note.id);
    setEditContent(note.content);
    setEditComment(note.user_comment || '');
  };

  const formatReference = () => {
    const parts = [];
    if (paperAuthors) parts.push(paperAuthors);
    if (paperYear) parts.push(`(${paperYear})`);
    if (paperTitle) parts.push(paperTitle);
    if (paperDoi) parts.push(`DOI: ${paperDoi}`);
    return parts.join('. ');
  };

  return (
    <div className="detail-section notes-section">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div className="detail-section-title" style={{ marginBottom: 0 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px', verticalAlign: 'middle' }}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
          </svg>
          {t('notes.title')} ({notes.length})
        </div>
        <button
          className="btn btn-secondary btn-sm"
          style={{ padding: '2px 10px', fontSize: '11px' }}
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? t('common.cancel') : `+ ${t('notes.addNote')}`}
        </button>
      </div>

      {/* Auto Reference Display */}
      {notes.length > 0 && (
        <div className="notes-reference">
          <span className="notes-reference-label">{t('notes.reference')}:</span>
          <span className="notes-reference-text">{formatReference()}</span>
        </div>
      )}

      {/* Add Note Form */}
      {showAddForm && (
        <div className="note-add-form">
          <textarea
            className="input-field note-textarea"
            placeholder={t('notes.contentPlaceholder')}
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            rows={3}
          />
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <input
              className="input-field"
              type="number"
              placeholder={t('notes.pageNumber')}
              value={newPageNumber}
              onChange={(e) => setNewPageNumber(e.target.value)}
              style={{ width: '80px', padding: '4px 8px', fontSize: '12px' }}
              min={1}
            />
            <input
              className="input-field"
              placeholder={t('notes.commentPlaceholder')}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              style={{ flex: 1, padding: '4px 8px', fontSize: '12px' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowAddForm(false)}>
              {t('common.cancel')}
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleAddNote}
              disabled={saving || !newContent.trim()}
            >
              {saving ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </div>
      )}

      {/* Notes List */}
      {notes.length === 0 && !showAddForm ? (
        <p style={{ fontSize: '12px', color: 'var(--ink-400)', margin: '4px 0 0' }}>{t('notes.empty')}</p>
      ) : (
        <div className="notes-list">
          {notes.map((note) => (
            <div key={note.id} className="note-item">
              {editingNoteId === note.id ? (
                /* Edit mode */
                <div className="note-edit-form">
                  <textarea
                    className="input-field note-textarea"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={3}
                  />
                  <input
                    className="input-field"
                    placeholder={t('notes.commentPlaceholder')}
                    value={editComment}
                    onChange={(e) => setEditComment(e.target.value)}
                    style={{ padding: '4px 8px', fontSize: '12px', marginBottom: '8px' }}
                  />
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => setEditingNoteId(null)}>
                      {t('common.cancel')}
                    </button>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleUpdateNote(note.id)}
                      disabled={saving || !editContent.trim()}
                    >
                      {saving ? t('common.saving') : t('common.save')}
                    </button>
                  </div>
                </div>
              ) : (
                /* View mode */
                <>
                  <div className="note-content">"{note.content}"</div>
                  {note.user_comment && (
                    <div className="note-comment">{note.user_comment}</div>
                  )}
                  <div className="note-meta">
                    {note.page_number && (
                      <span className="note-page">{t('notes.page')} {note.page_number}</span>
                    )}
                    <span className="note-date">
                      {new Date(note.created_at).toLocaleDateString()}
                    </span>
                    <div className="note-actions">
                      <button
                        className="note-action-btn"
                        onClick={() => startEdit(note)}
                        title={t('common.edit')}
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                        </svg>
                      </button>
                      <button
                        className="note-action-btn note-action-delete"
                        onClick={() => handleDeleteNote(note.id)}
                        title={t('common.delete')}
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotesPanel;