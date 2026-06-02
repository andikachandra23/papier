import React from 'react';
import PaperCard from './PaperCard';
import { useLanguage } from '../i18n/LanguageContext';

const PaperGrid = ({ papers, onOpenDetail, onToggleReading, onSelect, selectedIds, search }) => {
  const { t } = useLanguage();
  if (papers.length === 0) {
    return (
      <div className="empty-state">
        <p>{t('paper.noResults')}</p>
      </div>
    );
  }

  return (
    <div className="paper-grid">
      {papers.map((paper, index) => (
        <PaperCard
          key={paper.id}
          paper={paper}
          onOpenDetail={onOpenDetail}
          onToggleReading={onToggleReading}
          onSelect={onSelect}
          selected={selectedIds?.includes(paper.id)}
          search={search}
          index={index}
        />
      ))}
    </div>
  );
};

export default PaperGrid;