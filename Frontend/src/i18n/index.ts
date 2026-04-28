import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import uk from './locales/uk.json';
import en from './locales/en.json';



const i18nInstance = i18n.use(initReactI18next).use(LanguageDetector);

i18nInstance.init({
  resources: {
    uk: { translation: uk },
    en: { translation: en },
  },
  fallbackLng: 'uk',
  supportedLngs: ['uk', 'en'],
  interpolation: {
    escapeValue: false, // React already escapes
  },
  detection: {
    order: ['localStorage', 'navigator'],
    lookupLocalStorage: 'prozoro-banka-lang',
    caches: [], // Disable automatic caching to prevent hydration pass from overriding user preference
  },
});

export default i18n;
