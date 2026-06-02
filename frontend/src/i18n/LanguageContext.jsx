import React, { createContext, useContext, useMemo, useState } from 'react';
import { translations } from './translations';

const LanguageContext = createContext(null);

const format = (value, params = {}) => Object.entries(params).reduce(
  (text, [key, val]) => text.replaceAll(`{${key}}`, val),
  value,
);

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(() => localStorage.getItem('language') || 'en');

  const setLanguage = (nextLanguage) => {
    setLanguageState(nextLanguage);
    localStorage.setItem('language', nextLanguage);
  };

  const t = (key, params) => {
    const value = key.split('.').reduce((obj, part) => obj?.[part], translations[language])
      ?? key.split('.').reduce((obj, part) => obj?.[part], translations.en)
      ?? key;
    return typeof value === 'string' ? format(value, params) : key;
  };

  const value = useMemo(() => ({ language, setLanguage, t }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
};
