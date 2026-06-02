import React from 'react';
import { useLanguage } from '../i18n/LanguageContext';

const LanguageSwitch = () => {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="language-switch" aria-label={t('lang.label')}>
      {['en', 'id'].map((lang) => (
        <button
          key={lang}
          type="button"
          className={`language-option ${language === lang ? 'active' : ''}`}
          onClick={() => setLanguage(lang)}
          aria-pressed={language === lang}
        >
          {t(`lang.${lang}`)}
        </button>
      ))}
    </div>
  );
};

export default LanguageSwitch;
