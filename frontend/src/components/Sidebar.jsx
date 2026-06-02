import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { useLanguage } from '../i18n/LanguageContext';

const Sidebar = ({ currentCategory, onCategoryChange, onShowAddCategory, onEditCategory, onTagChange, onLogout }) => {
  const { t } = useLanguage();
  const [categories, setCategories] = useState([]);
  const [allCount, setAllCount] = useState(0);
  const [readingCount, setReadingCount] = useState(0);
  const [tags, setTags] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetchCategories();
    fetchCounts();
    fetchTags();
    fetchUserRole();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await client.get('/categories/');
      setCategories(res.data);
    } catch (err) {
      console.error('Failed to fetch categories', err);
    }
  };

  const fetchCounts = async () => {
    try {
      const [allRes, readingRes] = await Promise.all([
        client.get('/papers/'),
        client.get('/papers/?is_reading=true'),
      ]);
      setAllCount(allRes.data.length);
      setReadingCount(readingRes.data.length);
    } catch (err) {
      console.error('Failed to fetch counts', err);
    }
  };

  const fetchTags = async () => {
    try {
      const res = await client.get('/tags/');
      setTags(res.data);
    } catch (err) {
      console.error('Failed to fetch tags', err);
    }
  };

  const fetchUserRole = async () => {
    try {
      const res = await client.get('/auth/me');
      setIsAdmin(res.data.role === 'admin');
    } catch (err) {
      // ignore
    }
  };

  const handleTagClick = (tagId) => {
    if (onTagChange) {
      onTagChange(tagId);
    }
  };

  const handleCategoryClick = (catId) => {
    onCategoryChange(catId);
  };

  return (
    <div className="sidebar">
      <div className="sidebar-brand">Papier</div>

      <div
        className={`cat-item ${currentCategory === 'all' ? 'active' : ''}`}
        onClick={() => handleCategoryClick('all')}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
        </svg>
        {t('library.allPapers')}
        <span className="cat-count">{allCount}</span>
      </div>

      <div
        className={`cat-item ${currentCategory === 'reading' ? 'active' : ''}`}
        onClick={() => handleCategoryClick('reading')}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
        </svg>
        Reading List
        <span className="cat-count">{readingCount}</span>
      </div>

      {tags.length > 0 && (
        <>
          <div className="sidebar-divider"></div>
          <div className="sidebar-section-title">Tags</div>
          {tags.map((tag) => (
            <div
              key={tag.id}
              className={`cat-item tag-item ${currentCategory === `tag-${tag.id}` ? 'active' : ''}`}
              onClick={() => handleTagClick(`tag-${tag.id}`)}
              style={{ fontSize: '12px' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                <line x1="7" y1="7" x2="7.01" y2="7"/>
              </svg>
              <span style={{ flex: 1 }}>{tag.name}</span>
            </div>
          ))}
        </>
      )}

      <div className="sidebar-divider"></div>
      <div className="sidebar-section-title">{t('sidebar.myLibrary')}</div>

      {categories.map((cat) => (
        <React.Fragment key={cat.id}>
          <div
            className={`cat-item ${currentCategory === cat.id.toString() ? 'active' : ''}`}
            style={{ position: 'relative' }}
          >
            <span className="cat-dot" style={{ background: cat.color }}></span>
            <span style={{ flex: 1 }} onClick={() => handleCategoryClick(cat.id.toString())}>{cat.name}</span>
            <span className="cat-count" onClick={() => handleCategoryClick(cat.id.toString())}>{cat.paper_count}</span>
            {onEditCategory && (
              <button
                onClick={(e) => { e.stopPropagation(); onEditCategory(cat); }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '2px 4px',
                  opacity: 0.5,
                  marginLeft: '4px',
                  fontSize: '11px',
                  color: 'inherit',
                }}
                title={t('sidebar.editCategory')}
              >
                ✎
              </button>
            )}
          </div>
          {cat.children && cat.children.map((child) => (
            <div
              key={child.id}
              className={`cat-item sub-cat ${currentCategory === child.id.toString() ? 'active' : ''}`}
              style={{ fontSize: '12px', position: 'relative' }}
            >
              <span className="cat-dot" style={{ background: child.color, width: '6px', height: '6px' }}></span>
              <span style={{ flex: 1 }} onClick={() => handleCategoryClick(child.id.toString())}>{child.name}</span>
              <span className="cat-count" onClick={() => handleCategoryClick(child.id.toString())}>{child.paper_count}</span>
              {onEditCategory && (
                <button
                  onClick={(e) => { e.stopPropagation(); onEditCategory(child); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '2px 4px',
                    opacity: 0.5,
                    marginLeft: '4px',
                    fontSize: '10px',
                    color: 'inherit',
                  }}
                  title={t('sidebar.editSubcategory')}
                >
                  ✎
                </button>
              )}
            </div>
          ))}
        </React.Fragment>
      ))}

      <div className="sidebar-footer">
        <div className="sidebar-divider"></div>
        <div className="cat-item" onClick={onShowAddCategory}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14"/><path d="M12 5v14"/>
          </svg>
          {t('sidebar.newCategory')}
        </div>
        {isAdmin && (
          <div className="cat-item" onClick={() => { window.location.href = '/admin'; }} style={{ color: 'var(--sage-600)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            {t('admin.title')}
          </div>
        )}
        {onLogout && (
          <div className="cat-item" onClick={onLogout} style={{ color: 'var(--rose-600)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            {t('common.logout')}
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;