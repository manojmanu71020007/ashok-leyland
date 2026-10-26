import React, { createContext, useState, useContext, useCallback, useMemo, useEffect } from 'react';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import * as FileSystemRoot from 'expo-file-system';
import translationsData from './translations.json';

const LanguageContext = createContext();

export const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English', flag: '🇬🇧' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ', flag: '🇮🇳' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు', flag: '🇮🇳' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்', flag: '🇮🇳' },
];

const PREF_STORAGE_KEY = 'app_language_pref';
const PREF_FILE_NAME = 'app_language_pref.txt';

/**
 * Resolves persistent storage path for native FileSystem.
 */
function getStorageFileUri() {
  const dir = FileSystemLegacy?.documentDirectory || FileSystemRoot?.documentDirectory || '';
  return dir ? `${dir}${PREF_FILE_NAME}` : null;
}

export const LanguageProvider = ({ children }) => {
  const [currentLang, setCurrentLang] = useState('en');

  // Load persisted language preference on app launch
  useEffect(() => {
    let isMounted = true;

    const loadPersistedLang = async () => {
      try {
        // 1. Check Web localStorage
        if (typeof localStorage !== 'undefined') {
          const saved = localStorage.getItem(PREF_STORAGE_KEY);
          if (saved && LANGUAGES.some((l) => l.code === saved)) {
            if (isMounted) setCurrentLang(saved);
            return;
          }
        }

        // 2. Check native FileSystem
        const fileUri = getStorageFileUri();
        if (fileUri) {
          const getInfo = FileSystemLegacy?.getInfoAsync || FileSystemRoot?.getInfoAsync;
          const readAsString = FileSystemLegacy?.readAsStringAsync || FileSystemRoot?.readAsStringAsync;

          if (getInfo && readAsString) {
            const info = await getInfo(fileUri);
            if (info && info.exists) {
              const content = await readAsString(fileUri);
              const trimmed = (content || '').trim();
              if (trimmed && LANGUAGES.some((l) => l.code === trimmed)) {
                if (isMounted) setCurrentLang(trimmed);
                return;
              }
            }
          }
        }
      } catch (err) {
        // Fallback to default 'en' quietly
      }
    };

    loadPersistedLang();

    return () => {
      isMounted = false;
    };
  }, []);

  // Save selected language and persist across restarts
  const setLanguage = useCallback((langCode) => {
    if (LANGUAGES.some((l) => l.code === langCode)) {
      setCurrentLang(langCode);

      // Persist to Web localStorage
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(PREF_STORAGE_KEY, langCode);
        }
      } catch (_) {}

      // Persist to native FileSystem
      try {
        const fileUri = getStorageFileUri();
        const writeAsString = FileSystemLegacy?.writeAsStringAsync || FileSystemRoot?.writeAsStringAsync;
        if (fileUri && writeAsString) {
          writeAsString(fileUri, langCode).catch(() => {});
        }
      } catch (_) {}
    }
  }, []);

  // Pre-build reverse map of English text -> translation key for fast fallback lookup
  const englishToKeyMap = useMemo(() => {
    const map = new Map();
    const enDict = translationsData.en || {};
    for (const [k, v] of Object.entries(enDict)) {
      if (typeof v === 'string') {
        map.set(v.toLowerCase().trim(), k);
      }
    }
    return map;
  }, []);

  const t = useCallback(
    (key, fallback = '') => {
      if (!key && !fallback) return '';
      const langDict = translationsData[currentLang] || translationsData.en || {};
      const enDict = translationsData.en || {};

      // 1. Direct key match in current language
      if (key && langDict[key]) return langDict[key];

      // 2. Direct key match in English
      if (key && enDict[key] && currentLang === 'en') return enDict[key];

      // 3. Reverse lookup if key is an English phrase
      if (key && typeof key === 'string') {
        const mappedKey = englishToKeyMap.get(key.toLowerCase().trim());
        if (mappedKey && langDict[mappedKey]) {
          return langDict[mappedKey];
        }
      }

      // 4. Reverse lookup if fallback is an English phrase
      if (fallback && typeof fallback === 'string') {
        const mappedFallbackKey = englishToKeyMap.get(fallback.toLowerCase().trim());
        if (mappedFallbackKey && langDict[mappedFallbackKey]) {
          return langDict[mappedFallbackKey];
        }
      }

      // 5. Fallback or key itself
      return fallback || key;
    },
    [currentLang, englishToKeyMap]
  );

  const currentLangObj = useMemo(() => {
    return LANGUAGES.find((l) => l.code === currentLang) || LANGUAGES[0];
  }, [currentLang]);

  return (
    <LanguageContext.Provider
      value={{
        currentLang,
        currentLangObj,
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
