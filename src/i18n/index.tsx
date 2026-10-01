import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { en } from './en';
import { zhTW } from './zh-TW';

export type Locale = 'zh-TW' | 'en';
export type MessageKey = keyof typeof en;

const STORAGE_KEY = 'resona:locale';
const catalogs = { 'zh-TW': zhTW, en } as const;

type I18nValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  t: (key: MessageKey) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

function initialLocale(): Locale {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'zh-TW') return stored;
  } catch { /* storage is optional */ }
  return 'zh-TW';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = (next: Locale) => {
    setLocaleState(next);
    try { window.localStorage.setItem(STORAGE_KEY, next); } catch { /* storage is optional */ }
  };

  useEffect(() => {
    document.documentElement.lang = locale === 'zh-TW' ? 'zh-Hant-TW' : 'en';
    document.title = catalogs[locale]['seo.title'];
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (description) description.content = catalogs[locale]['seo.description'];
    const ogTitle = document.querySelector<HTMLMetaElement>('meta[property="og:title"]');
    if (ogTitle) ogTitle.content = catalogs[locale]['seo.title'];
    const ogDescription = document.querySelector<HTMLMetaElement>('meta[property="og:description"]');
    if (ogDescription) ogDescription.content = catalogs[locale]['seo.description'];
  }, [locale]);

  const value = useMemo<I18nValue>(() => ({
    locale,
    setLocale,
    toggleLocale: () => setLocale(locale === 'zh-TW' ? 'en' : 'zh-TW'),
    t: (key) => catalogs[locale][key] ?? en[key],
  }), [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside I18nProvider');
  return value;
}
