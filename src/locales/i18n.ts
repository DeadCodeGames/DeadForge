import i18n from 'i18next';
import { initReactI18next } from 'react-i18next'

import en from './en.json';
import cs from './cs.json';
import fr from './fr.json';
import it from './it.json';
import ja from './ja.json';
import sk from './sk.json';
import zh from './zh.json';
const resources = {
  en: { translation: en },
  cs: { translation: cs },
  fr: { translation: fr },
  it: { translation: it },
  ja: { translation: ja },
  sk: { translation: sk },
  zh: { translation: zh },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

i18n.on("languageChanged", (lang) => document.documentElement.lang = lang)

export default i18n;