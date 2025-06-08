import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { enUS, cs, sk, ja, fr, it, zhCN, zhTW, de, ko, Locale } from 'date-fns/locale';
import {unflatten, flatten} from 'flat';

import en_001 from './en_001.json';
import cs_CZ from './cs_CZ.json';
import de_DE from './de_DE.json';
import en_PT from './en_PT.json';
import fr_FR from './fr_FR.json';
import it_IT from './it_IT.json';
import ja_JP from './ja_JP.json';
import zh_CN from './zh_CN.json';
import ko_KR from './ko_KR.json';
import lol_US from './lol_US.json';
import sk_SK from './sk_SK.json';
import zh_TW from './zh_TW.json';
const resources: Record<string, { translation: object }> = {
    cs_CZ: { translation: cs_CZ },
    de_DE: { translation: de_DE },
    en_001: { translation: en_001 },
    en_PT: { translation: en_PT },
    fr_FR: { translation: fr_FR },
    it_IT: { translation: it_IT },
    ja_JP: { translation: ja_JP },
    ko_KR: { translation: ko_KR },
    lol_US: { translation: lol_US },
    sk_SK: { translation: sk_SK },
    zh_CN: { translation: zh_CN },
    zh_TW: { translation: zh_TW },
};

if (!window.App.isPackaged) resources.stringsDebug = { translation: unflatten(Object.fromEntries(Object.entries(flatten(en_001)!).map(([k]) => [k, k]))) };

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: 'en_001',
        fallbackLng: 'en_001',
        returnEmptyString: false,
        pluralSeparator: "_",
        interpolation: {
            escapeValue: false
        },
    });

i18n.on("languageChanged", (lang) => document.documentElement.lang = lang)

export default i18n;
export { resources, dateFNSResources };