import React, { createContext, useState, useContext, useCallback } from 'react';
import translationsData from './translations.json';

const LanguageContext = createContext();

export const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English', flag: '🇬🇧' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ', flag: '🇮🇳' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు', flag: '🇮🇳' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்', flag: '🇮🇳' },
];

export const LanguageProvider = ({ children }) => {
  const [currentLang, setCurrentLang] = useState('en');

  const setLanguage = useCallback((langCode) => {
    if (LANGUAGES.some((l) => l.code === langCode)) {
      setCurrentLang(langCode);
    }
  }, []);

  const t = useCallback(
    (key, fallback = '') => {
      if (!key) return fallback;
      const langDict = translationsData[currentLang] || translationsData.en || {};
      if (langDict[key]) return langDict[key];
      const enDict = translationsData.en || {};
      if (enDict[key]) return enDict[key];
      return fallback || key;
    },
    [currentLang]
  );

  return (
    <LanguageContext.Provider
      value={{
        currentLang,
        setLanguage,
        t,
        languages: LANGUAGES,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
