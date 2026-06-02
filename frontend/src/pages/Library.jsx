import React, { useState, useEffect, useCallback } from 'react';
import client from '../api/client';
import Sidebar from '../components/Sidebar';
import PaperGrid from '../components/PaperGrid';
import AddPaperModal from '../components/AddPaperModal';
import AddCategoryModal from '../components/AddCategoryModal';
import EditCategoryModal from '../components/EditCategoryModal';
import ImportDOIModal from '../components/ImportDOIModal';
import TagManager from '../components/TagManager';
import NotesModal from '../components/NotesModal';
import DetailPanel from '../components/DetailPanel';
import PDFViewer from '../components/PDFViewer';
import LanguageSwitch from '../components/LanguageSwitch';
import { useLanguage } from '../i18n/LanguageContext';

const Library = ({ onLogout }) => {
  const { t } = useLanguage();
  const [papers, setPapers] = useState([]);
  const [currentCategory, setCurrentCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('recent');
  const [showAddPaper, setShowAddPaper] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showImportDOI, setShowImportDOI] = useState(false);
  const [showEditCategory, setShowEditCategory] = useState(false);
  const [showTagManager, setShowTagManager] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedPaper, setSelectedPaper] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [minYear, setMinYear] = useState('');
  const [maxYear, setMaxYear] = useState('');
  const [tagId, setTagId] = useState('');
  const [tags, setTags] = useState([]);
  const [categoriesData, setCategoriesData] = useState([]);
  const [sidebarKey, setSidebarKey] = useState(0);
  const [pdfViewerPaper, setPdfViewerPaper] = useState(null);
  const [showNotesModal, setShowNotesModal] = useState(false);

  const fetchTags = async () => {
    try {
      const res = await client.get('/tags/');
      setTags(res.data);
    } catch (err) {
      console.error('Failed to fetch tags', err);
    }
  };

  const fetchCategoriesData = async () => {
    try {
      const res = await client.get('/categories/');
      setCategoriesData(res.data);
    } catch (err) {
      console.error('Failed to fetch categories', err);
    }
  };

  const fetchPapers = useCallback(async () => {
    try {
      const params = {};
      if (currentCategory === 'reading') {
        params.is_reading = true;
      } else if (currentCategory.startsWith('tag-')) {
        params.tag_id = parseInt(currentCategory.replace('tag-', ''));
      } else if (currentCategory !== 'all') {
        params.category_id = currentCategory;
      }
      if (search) params.search = search;
      params.sort = sort;
      if (minYear) params.min_year = parseInt(minYear);
      if (maxYear) params.max_year = parseInt(maxYear);
      // tag_id sudah di-handle dari currentCategory.startsWith('tag-') di atas
      const res = await client.get('/papers/', { params });
      setPapers(res.data);
    } catch (err) {
      console.error('Failed to fetch papers', err);
    }
  }, [currentCategory, search, sort, minYear, maxYear]);

  useEffect(() => {
    fetchTags();
    fetchCategoriesData();
  }, []);

  useEffect(() => {
    fetchCategoriesData();
  }, [sidebarKey]);

  useEffect(() => {
    fetchPapers();
  }, [fetchPapers]);

  const handlePaperAdded = (paper) => {
    setPapers([paper, ...papers]);
  };

  const handleToggleReading = async (paperId) => {
    const paper = papers.find((p) => p.id === paperId);
    if (!paper) return;
    try {
      const res = await client.put(`/papers/${paperId}`, { is_reading: !paper.is_reading });
      setPapers(papers.map((p) => (p.id === paperId ? res.data : p)));
      if (selectedPaper?.id === paperId) setSelectedPaper(res.data);
    } catch (err) {
      alert(t('library.updateReadingFailed')); 
    }
  };

  const handleOpenDetail = (paper) => {
    setSelectedPaper(paper);
    setShowDetail(true);
  };

  const handleCloseDetail = () => {
    setShowDetail(false);
    setSelectedPaper(null);
  };

  const handleDelete = (paperId) => {
    setPapers(papers.filter((p) => p.id !== paperId));
  };

  const handlePaperUpdate = (paper) => {
    setPapers(papers.map((p) => (p.id === paper.id ? paper : p)));
    setSelectedPaper(paper);
    if (pdfViewerPaper?.id === paper.id) setPdfViewerPaper(paper);
  };

  const handleCategoryUpdated = (updatedCat) => {
    setSidebarKey(prev => prev + 1);
  };

  const handleCategoryDeleted = (deletedId) => {
    if (currentCategory === deletedId.toString()) {
      setCurrentCategory('all');
    }
    setSidebarKey(prev => prev + 1);
  };

  const handleOpenEditCategory = (cat) => {
    setSelectedCategory(cat);
    setShowEditCategory(true);
  };

  const titles = {
    all: t('library.allPapers'),
    reading: t('library.readingList'),
  };

  const getCategoryTitle = () => {
    if (currentCategory === 'all' || currentCategory === 'reading') {
      return titles[currentCategory];
    }
    // Look up in categories data (including subcategories)
    for (const cat of categoriesData) {
      if (cat.id.toString() === currentCategory) return cat.name;
      if (cat.children) {
        for (const child of cat.children) {
          if (child.id.toString() === currentCategory) return child.name;
        }
      }
    }
    return t('library.paper');
  };

  const getCategoryDescription = () => {
    if (currentCategory === 'all') return t('library.allDesc');
    if (currentCategory === 'reading') return t('library.readingDesc');
    if (currentCategory.startsWith('tag-')) {
      const tagId = parseInt(currentCategory.replace('tag-', ''));
      const tag = tags.find(t => t.id === tagId);
      return tag ? t('library.tagDesc', { tag: tag.name }) : '';
    }
    // Look up in categories data (including subcategories)
    for (const cat of categoriesData) {
      if (cat.id.toString() === currentCategory) return cat.description || '';
      if (cat.children) {
        for (const child of cat.children) {
          if (child.id.toString() === currentCategory) return child.description || '';
        }
      }
    }
    return '';
  };

  const handleSelect = (paperId) => {
    setSelectedIds(prev =>
      prev.includes(paperId) ? prev.filter(id => id !== paperId) : [...prev, paperId]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === papers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(papers.map(p => p.id));
    }
  };

  const handleBulkAction = async (action, options = {}) => {
    if (selectedIds.length === 0) return;
    if (action === 'delete') {
      if (!confirm(t('library.deleteConfirm', { count: selectedIds.length }))) return;
    }
    try {
      const payload = { paper_ids: selectedIds, action, ...options };
      const res = await client.post('/papers/bulk', payload);
      alert(res.data.message);
      setSelectedIds([]);
      fetchPapers();
    } catch (err) {
      alert(t('library.bulkFailed'));
    }
  };

  const handleExportCSV = () => {
    const rows = [['Title', 'Authors', 'Year', 'DOI', 'Abstract']];
    papers.filter(p => selectedIds.includes(p.id)).forEach(p => {
      rows.push([p.title, p.authors, p.year || '', p.doi || '', p.abstract || '']);
    });
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'papers-export.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setMinYear('');
    setMaxYear('');
    setTagId('');
    setSearch('');
    setCurrentCategory('all');
  };

  const hasFilters = minYear || maxYear || currentCategory !== 'all' || search;

  return (
    <div className="app-layout">
      <Sidebar
        key={sidebarKey}
        onLogout={onLogout}
        currentCategory={currentCategory}
        onCategoryChange={setCurrentCategory}
        onShowAddCategory={() => setShowAddCategory(true)}
        onEditCategory={handleOpenEditCategory}
        onTagChange={(tagValue) => {
          const tagIdValue = tagValue.replace('tag-', '');
          setCurrentCategory(tagValue);
          setTagId(tagIdValue);
        }}
      />
      <div className="main-content">
        <div className="main-header">
          <div className="main-header-top">
            <h1 className="page-title">{getCategoryTitle()}</h1>
            <div className="header-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <button className="btn btn-primary" onClick={() => setShowImportDOI(true)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                Import DOI
              </button>
              <button className="btn btn-primary" onClick={() => setShowAddPaper(true)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14"/><path d="M12 5v14"/>
                </svg>
                {t('library.addPaper')}
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowNotesModal(true)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
                </svg>
                {t('notes.title')}
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowTagManager(true)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>
                </svg>
                {t('common.tags')}
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowFilterPanel(!showFilterPanel)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                </svg>
                {t('library.filter')} {hasFilters && <span style={{ background: 'var(--ink-900)', color: '#fff', borderRadius: '10px', padding: '1px 6px', fontSize: '10px', marginLeft: '4px' }}>•</span>}
              </button>
              {/* Logout moved to sidebar footer */}
              <LanguageSwitch />
            </div>
          </div>
          <p className="page-description">{getCategoryDescription()}</p>

          {/* Filter Panel */}
          {showFilterPanel && (
            <div className="filter-panel">
              <div className="filter-row">
                <div className="filter-group">
                  <div className="filter-label">{t('library.year')}</div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      className="input-field"
                      style={{ width: '80px', padding: '4px 8px', fontSize: '12px' }}
                      type="number"
                      placeholder="Min"
                      value={minYear}
                      onChange={(e) => setMinYear(e.target.value)}
                    />
                    <span style={{ color: 'var(--ink-400)', fontSize: '12px' }}>—</span>
                    <input
                      className="input-field"
                      style={{ width: '80px', padding: '4px 8px', fontSize: '12px' }}
                      type="number"
                      placeholder="Max"
                      value={maxYear}
                      onChange={(e) => setMaxYear(e.target.value)}
                    />
                  </div>
                </div>
                <div className="filter-group">
                  <div className="filter-label">{t('common.tags')}</div>
                  <select
                    className="input-field"
                    style={{ padding: '4px 8px', fontSize: '12px' }}
                    value={tagId}
                    onChange={(e) => setTagId(e.target.value)}
                  >
                    <option value="">{t('library.allTags')}</option>
                    {tags.map(tag => (
                      <option key={tag.id} value={tag.id}>{tag.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button className="btn btn-secondary btn-sm" onClick={clearFilters}>
                    Reset
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="header-controls">
            <div className="search-bar">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B8B5AE" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input placeholder={t('library.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select className="sort-select" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="recent">{t('library.recent')}</option>
              <option value="year-desc">{t('library.yearDesc')}</option>
              <option value="year-asc">{t('library.yearAsc')}</option>
              <option value="title">{t('library.titleAZ')}</option>
            </select>
          </div>
        </div>
        <div className="item-count">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
              <input
                type="checkbox"
                checked={selectedIds.length > 0 && selectedIds.length === papers.length}
                onChange={handleSelectAll}
                style={{ accentColor: 'var(--ink-900)' }}
              />
              {t('library.selectAll')}
            </label>
            <span className="item-count-text">{t('library.items')} ({papers.length})</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {selectedIds.length > 0 && (
              <>
                <button className="btn btn-secondary btn-sm" onClick={handleExportCSV}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Export CSV ({selectedIds.length})
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ color: 'var(--error, #e74c3c)' }}
                  onClick={() => handleBulkAction('delete')}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                  {t('library.deleteCount', { count: selectedIds.length })}
                </button>
              </>
            )}
            <button className="btn btn-secondary btn-sm" onClick={() => setShowAddPaper(true)}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14"/><path d="M12 5v14"/>
              </svg>
              {t('library.addShort')}
            </button>
          </div>
        </div>
        <div className="paper-grid-container">
          <PaperGrid
            papers={papers}
            onOpenDetail={handleOpenDetail}
            onToggleReading={handleToggleReading}
            onSelect={handleSelect}
            selectedIds={selectedIds}
            search={search}
          />
        </div>
      </div>
      <AddPaperModal isOpen={showAddPaper} onClose={() => setShowAddPaper(false)} onPaperAdded={handlePaperAdded} />
      <AddCategoryModal isOpen={showAddCategory} onClose={() => setShowAddCategory(false)} onCategoryAdded={() => setSidebarKey(prev => prev + 1)} />
      <EditCategoryModal
        isOpen={showEditCategory}
        onClose={() => { setShowEditCategory(false); setSelectedCategory(null); }}
        onCategoryUpdated={handleCategoryUpdated}
        onCategoryDeleted={handleCategoryDeleted}
        category={selectedCategory}
      />
      <ImportDOIModal isOpen={showImportDOI} onClose={() => setShowImportDOI(false)} onPaperAdded={handlePaperAdded} />
      <TagManager 
        isOpen={showTagManager} 
        onClose={() => setShowTagManager(false)}
        onTagCreated={() => setSidebarKey(prev => prev + 1)}
        onTagRenamed={() => setSidebarKey(prev => prev + 1)}
        onTagDeleted={() => setSidebarKey(prev => prev + 1)}
      />
      <DetailPanel
        paper={selectedPaper}
        isOpen={showDetail}
        onClose={handleCloseDetail}
        onToggleReading={handleToggleReading}
        onDelete={handleDelete}
        onPaperUpdate={handlePaperUpdate}
        onOpenPDFViewer={(paper) => setPdfViewerPaper(paper)}
      />
      <NotesModal
        isOpen={showNotesModal}
        onClose={() => setShowNotesModal(false)}
      />
      {pdfViewerPaper && (
        <PDFViewer
          paper={pdfViewerPaper}
          isOpen={!!pdfViewerPaper}
          onClose={() => setPdfViewerPaper(null)}
          onPaperUpdate={handlePaperUpdate}
        />
      )}
    </div>
  );
};

export default Library;