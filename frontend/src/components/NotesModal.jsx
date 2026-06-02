import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { useLanguage } from '../i18n/LanguageContext';

const NotesModal = ({ isOpen, onClose, onNavigateToPaper }) => {
  const { t } = useLanguage();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchAllNotes();
    }
  }, [isOpen]);

  const fetchAllNotes = async () => {
    setLoading(true);
    try {
      const res = await client.get('/notes/all');
      setNotes(res.data);
    } catch (err) {
      console.error('Failed to fetch notes', err);
    }
    setLoading(false);
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

  const formatReference = (note) => {
    const parts = [];
    if (note.paper_authors) parts.push(note.paper_authors);
    if (note.paper_year) parts.push(`(${note.paper_year})`);
    if (note.paper_title) parts.push(note.paper_title);
    if (note.paper_doi) parts.push(`DOI: ${note.paper_doi}`);
    return parts.join('. ');
  };

  const filteredNotes = notes.filter(note => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      note.content.toLowerCase().includes(q) ||
      (note.user_comment && note.user_comment.toLowerCase().includes(q)) ||
      (note.paper_title && note.paper_title.toLowerCase().includes(q)) ||
      (note.paper_authors && note.paper_authors.toLowerCase().includes(q))
    );
  });

  if (!isOpen) return null;

  return (
    <div className="modal-overlay open" onClick={onClose}>
      <div className="notes-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px', verticalAlign: 'middle' }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
            </svg>
            {t('notes.allNotes')} ({filteredNotes.length})
          </h2>
          <button className="modal-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="notes-modal-search">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B8B5AE" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            placeholder={t('notes.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Notes List */}
        <div className="notes-modal-body">
          {loading ? (
            <div className="notes-modal-empty">
              <p>{t('common.loading')}</p>
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="notes-modal-empty">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--ink-300)" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
              </svg>
              <p>{search ? t('notes.noSearchResults') : t('notes.empty')}</p>
            </div>
          ) : (
            <div className="notes-modal-list">
              {filteredNotes.map((note) => (
                <div key={note.id} className="notes-modal-item">
                  <div className="notes-modal-item-header">
                    <div className="notes-modal-paper-info">
                      {onNavigateToPaper ? (
                        <button
                          className="notes-modal-paper-link"
                          onClick={() => onNavigateToPaper(note.paper_id)}
                        >
                          {note.paper_title || t('notes.unknownPaper')}
                        </button>
                      ) : (
                        <span className="notes-modal-paper-title">
                          {note.paper_title || t('notes.unknownPaper')}
                        </span>
                      )}
                      {note.page_number && (
                        <span className="notes-modal-page">{t('notes.page')} {note.page_number}</span>
                      )}
                    </div>
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
                  <div className="notes-modal-content">"{note.content}"</div>
                  {note.user_comment && (
                    <div className="notes-modal-comment">{note.user_comment}</div>
                  )}
                  <div className="notes-modal-ref">
                    <span className="notes-modal-ref-label">{t('notes.reference')}:</span>
                    <span className="notes-modal-ref-text">{formatReference(note)}</span>
                  </div>
                  <div className="notes-modal-date">
                    {new Date(note.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotesModal;