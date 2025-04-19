import i18n from 'i18next';
import { initReactI18next } from 'react-i18next'

import en_001 from './en_001.json';

const resources = {
  en_001: { translation: en_001 },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en_001',
    fallbackLng: 'en_001',
    returnEmptyString: false,
    interpolation: {
      escapeValue: false,
    },
  });

i18n.on("languageChanged", (lang) => document.documentElement.lang = lang)

export default i18n;