'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { translations, type Lang, type TranslationKey } from '@/lib/i18n';

interface LanguageContextValue {
  lang: Lang;
  toggleLang: () => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'en',
  toggleLang: () => {},
  t: (k) => translations.en[k],
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>('en');

  useEffect(() => {
    const saved = localStorage.getItem('lion_lang') as Lang | null;
    if (saved === 'en' || saved === 'my') setLang(saved);
  }, []);

  const toggleLang = useCallback(() => {
    setLang((prev) => {
      const next: Lang = prev === 'en' ? 'my' : 'en';
      localStorage.setItem('lion_lang', next);
      return next;
    });
  }, []);

  const t = useCallback((key: TranslationKey): string => translations[lang][key], [lang]);

  return (
    <LanguageContext.Provider value={{ lang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
