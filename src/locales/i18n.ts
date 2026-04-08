import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { enUS, cs, sk, ja, fr, it, zhCN, zhTW, de, ko, Locale } from 'date-fns/locale';
import {unflatten, flatten} from 'flat';

import en_001 from './en_001.json';
const resources: Record<string, { translation: object }> = {
    en_001: { translation: en_001 },
};
const dateFNSResources: Record<keyof typeof resources, Locale> = {
    en_001: enUS,
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