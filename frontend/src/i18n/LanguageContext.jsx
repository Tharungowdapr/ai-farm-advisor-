import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import translations from './translations';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem('app_lang') || 'EN');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem('app_lang', lang);
    document.documentElement.lang = lang === 'KN' ? 'kn' : 'en';
  }, [lang]);

  useEffect(() => {
    axios.get('/api/settings').then(r => {
      const saved = r.data?.language;
      if (saved && (saved === 'EN' || saved === 'KN')) {
        setLangState(saved);
      }
    }).catch(() => {});
  }, []);

  const setLang = useCallback((newLang) => {
    setLangState(newLang);
    localStorage.setItem('app_lang', newLang);
    axios.post('/api/settings', { language: newLang }).catch(() => {});
  }, []);

  const t = useCallback((path) => {
    const keys = path.split('.');
    let val = translations[lang];
    for (const k of keys) {
      if (val && typeof val === 'object' && k in val) {
        val = val[k];
      } else {
        val = translations['EN'];
        for (const k2 of keys) {
          val = val?.[k2];
        }
        return val || path;
      }
    }
    return val || path;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, loading }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
export default LanguageContext;
