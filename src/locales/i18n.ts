import i18n from 'i18next';
import { initReactI18next } from 'react-i18next'

import en from './en.json';
import cs from './cs.json';
import de from './de.json';
import fr from './fr.json';
import it from './it.json';
import ja from './ja.json';
import ko from './ko.json';
import lol from './lol.json';
import sk from './sk.json';
import zh from './zh.json';
const resources = {
  en: { translation: en },
  cs: { translation: cs },
  de: { translation: de },
  fr: { translation: fr },
  it: { translation: it },
  ja: { translation: ja },
  ko: { translation: ko },
  lol: { translation: lol },
  sk: { translation: sk },
  zh: { translation: zh },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    returnEmptyString: false,
    interpolation: {
      escapeValue: false,
    },
  });

i18n.on("languageChanged", (lang) => document.documentElement.lang = lang)

export default i18n;