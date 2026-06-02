import React from 'react';
import { useLanguage } from '../i18n/LanguageContext';

const pastelColors = [
  '#FFF5F5', // Merah muda lembut
  '#F0FFF4', // Hijau mint
  '#F5F3FF', // Ungu lavender
  '#FEF3C7', // Kuning cream
  '#EFF6FF', // Biru langit
  '#FFF7ED', // Oranye peach
  '#F0FDFA', // Teal aqua
  '#FDF2F8', // Pink rose
  '#ECFDF5', // Emerald
  '#FEF2F2', // Rose soft
  '#F0FDF4', // Green soft
  '#F5F5F4', // Stone cream
  '#FDF4FF', // Ungu pink lembut
  '#FFF8E1', // Kuning hangat
  '#E8F5E9', // Hijau daun
  '#E3F2FD', // Biru laut lembut
  '#FBE9E7', // Salmon peach
  '#F3E5F5', // Lavender pink
  '#E0F2F1', // Teal mint
  '#FFF3E0', // Orange lembut
];

function highlightText(text, search) {
  if (!search || !text) return text;
  const regex = new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = String(text).split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? <mark key={i} style={{ background: 'var(--amber-100)', color: 'inherit', padding: '0 2px', borderRadius: '2px' }}>{part}</mark> : part
  );
}

const PaperCard = ({ paper, onOpenDetail, onToggleReading, onSelect, selected, search, index = 0 }) => {
  const { t } = useLanguage();
  const bgColor = pastelColors[index % pastelColors.length];
  const keywords = (paper.keywords || '').split(',').map(k => k.trim()).filter(Boolean).slice(0, 3);
  const handleCardClick = (e) => {
    if (e.target.type === 'checkbox') return;
    onOpenDetail(paper);
  };

  return (
    <div
      className={`paper-card${paper.is_reading ? ' reading' : ''}${selected ? ' selected' : ''}`}
      onClick={handleCardClick}
      style={{ position: 'relative', background: bgColor }}
    >
      {onSelect && (
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onSelect(paper.id)}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            width: '16px',
            height: '16px',
            cursor: 'pointer',
            accentColor: 'var(--ink-900)',
          }}
          onClick={(e) => e.stopPropagation()}
        />
      )}
      <div className="paper-card-meta">
        {paper.year && <span className="year-badge">{paper.year}</span>}
        {paper.categories && paper.categories.length > 0 && (
          <span className="cat-badge">
            <span className="cat-dot" style={{ background: paper.categories[0].color, width: '6px', height: '6px', display: 'inline-block', borderRadius: '50%', marginRight: '4px', verticalAlign: 'middle' }}></span>
            {paper.categories.map(c => c.name).join(', ')}
          </span>
        )}
      </div>
      <h3 className="paper-title">{highlightText(paper.title, search)}</h3>
      <p className="paper-authors">{highlightText(paper.authors, search)}</p>
      {paper.tags && paper.tags.length > 0 && (
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
          {paper.tags.map(tag => (
            <span key={tag.id} className="tag" style={{ fontSize: '10px', padding: '1px 6px' }}>{tag.name}</span>
          ))}
        </div>
      )}
      {keywords.length > 0 && (
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '2px' }}>
          {keywords.map((keyword) => (
            <span key={keyword} className="keyword-chip">{keyword}</span>
          ))}
        </div>
      )}
      <div className="paper-card-footer">
        <span className="highlight-count">
          {paper.highlights?.length > 0 && (
            <>
              <span className="highlight-dot" style={{ background: 'var(--amber-400)' }}></span>
              {paper.highlights.length} highlight{paper.highlights.length > 1 ? 's' : ''}
            </>
          )}
        </span>
        <button
          className="reading-btn"
          title={paper.is_reading ? t('paper.removeReading') : t('paper.addReading')}
          onClick={(e) => { e.stopPropagation(); onToggleReading(paper.id); }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill={paper.is_reading ? 'var(--amber-400)' : 'none'} stroke={paper.is_reading ? 'var(--amber-400)' : 'currentColor'} strokeWidth="2">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default PaperCard;