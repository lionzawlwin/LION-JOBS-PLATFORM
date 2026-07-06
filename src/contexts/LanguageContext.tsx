'use client';

import { createContext, useContext, useCallback } from 'react';
import { translations, type Lang, type TranslationKey } from '@/lib/i18n';
import { useLocalStorageValue } from '@/hooks/useLocalStorageValue';

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

const DEFAULT_LANG: Lang = 'en';

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useLocalStorageValue<Lang>('lion_lang', DEFAULT_LANG);

  const toggleLang = useCallback(() => {
    setLang(lang === 'en' ? 'my' : 'en');
  }, [lang, setLang]);

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
