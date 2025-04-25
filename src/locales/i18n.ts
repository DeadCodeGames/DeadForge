import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import {unflatten, flatten} from 'flat';

import en_001 from './en_001.json';
import cs_CZ from './cs_CZ.json';
import de_DE from './de_DE.json';
import en_PT from './en_PT.json';
import fr_FR from './fr_FR.json';
import it_IT from './it_IT.json';
import ja_JP from './ja_JP.json';
import ko_KR from './ko_KR.json';
import lol_US from './lol_US.json';
import sk_SK from './sk_SK.json';
import zh_CN from './zh_CN.json';

const resources: Record<string, { translation: object }> = {
  en_001: { translation: en_001 },
};

if (!window.App.isPackaged) resources.stringsDebug = { translation: unflatten(Object.fromEntries(Object.entries(flatten(en_001)!).map(([k,]) => [k, k]))) };

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
export { resources };