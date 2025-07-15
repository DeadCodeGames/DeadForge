import React, { useContext, useState } from "react";
import { AppContext } from "@/App.tsx";
import i18n, { resources } from "@/locales/i18n.ts";
import { Trans, useTranslation } from "react-i18next";
import LocalTwemoji from "@/components/CustomElements/LocalTwemoji.tsx";
import FlipSwitch from "@/components/CustomElements/FlipSwitch";
import GenericModal from "@/components/GenericModal";

// Helper functions from Settings
import { flatten } from "flat";

const calculateTranslationPercentage = (lang: string) => {
    if (lang === "en_001" || lang === "stringsDebug") return 100;
    const PLURAL_SUFFIXES = ["_zero", "_one", "_two", "_few", "_many", "_other"];
    const stripPlural = (key: string) => {
        for (const suffix of PLURAL_SUFFIXES) {
            if (key.endsWith(suffix)) {
                return key.slice(0, -suffix.length);
            }
        }
        return key;
    };
    const enFlat = flatten(resources["en_001"].translation)!;
    const langFlat: Record<string, string> = flatten((resources as any)[lang].translation)!;
    const enBaseKeys = Array.from(
        new Set(
            Object.keys(enFlat)
                .filter((key) => !key.startsWith("meta"))
                .map(stripPlural)
        )
    );
    const translatedCount = enBaseKeys.filter((baseKey) => {
        const pluralForms = PLURAL_SUFFIXES.map(suffix => baseKey + suffix).concat([baseKey]);
        return pluralForms.some(formKey => langFlat[formKey] !== undefined && langFlat[formKey] !== "");
    }).length;
    return Math.round((translatedCount / enBaseKeys.length) * 100);
};

const getPercentageColor = (percentage: number) => {
    const hue = Math.round(percentage * 1.15);
    return [`hsl(${hue}, 100%, 40%)`, `hsla(${hue}, 100%, 40%, 0.125)`];
};

const LanguageSelector: React.FC = () => {
    const { context, setContext } = useContext(AppContext);
    const { t } = useTranslation();
    const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);

    const handleLanguageChange = (language: string) => {
        setContext((prev: any) => ({
            ...prev,
            preferences: {
                ...prev.preferences,
                language
            }
        }));
        i18n.changeLanguage(language);
    };
    const handleSetShowIncompleteLanguagesChange = (showIncompleteLanguages: boolean) => {
        setContext((prev: any) => ({
            ...prev,
            preferences: {
                ...prev.preferences,
                showIncompleteLanguages
            }
        }));
    };

    return (
        <>
            {/* Language Selector Button */}
            <button
                className="flex items-center gap-2 p-4 rounded-lg border border-notQuiteBlack dark:border-notQuiteWhite bg-fullMoon dark:bg-night min-w-[180px]"
                onClick={() => setIsLanguageModalOpen(true)}
            >
                <LocalTwemoji controlled key={(context.preferences.language || "en_001") + "_flag"} options={{ className: '!w-8 !aspect-square mx-1', base: window.App.isPackaged ? `${process.env.PUBLIC_URL}/twemoji` : undefined }}>{(resources as any)[context.preferences.language || "en_001"].translation.meta.emoji}</LocalTwemoji>
                <span className="mx-2">{(resources as any)[context.preferences.language || "en_001"].translation.meta.name}</span>
                {(() => {
                    const percentage = calculateTranslationPercentage(context.preferences.language || "en_001");
                    const [color, backgroundColor] = getPercentageColor(percentage);
                    return (
                        <span className="border-2 border-solid rounded-full text-sm px-2 py-1 mr-1" style={{ color, backgroundColor }}>{percentage}%</span>
                    );
                })()}
            </button>

            {/* Language Modal */}
            <GenericModal
                className="max-w-[54rem] [&>:first-child]:pb-0"
                isOpen={isLanguageModalOpen}
                onClose={() => setIsLanguageModalOpen(false)}
                title={t("settings.theming.language")}
            >
                <div className="mb-4">{t("settings.theming.languageDescription")}</div>
                {/* 100% Languages */}
                <div className="mb-4">
                    <div className="font-semibold mb-2 flex flex-row gap-x-2 items-center">
                        {t("settings.theming.languageComplete")}
                        {(() => {
                            const percentage = calculateTranslationPercentage("en_001");
                            const [color, backgroundColor] = getPercentageColor(percentage);
                            return (
                                <div className="border-2 border-solid rounded-md text-xs px-1 py-0.5" style={{ color: color, backgroundColor }}>{percentage}%</div>
                            )
                        })()}
                    </div>
                    <div className="grid gap-2 grid-cols-4">
                        {Object.keys(resources)
                            .filter(lang => calculateTranslationPercentage(lang) === 100)
                            .sort((langA, langB) => {
                                const priority = (lang: string) => {
                                    if (lang === "en_001") return 0;
                                    if (lang === "stringsDebug") return 1;
                                    return 2;
                                };
                                const priorityA = priority(langA);
                                const priorityB = priority(langB);
                                if (priorityA !== priorityB) {
                                    return priorityA - priorityB;
                                }
                                const nameA = (resources as any)[langA].translation.meta.name;
                                const nameB = (resources as any)[langB].translation.meta.name;
                                return nameA.localeCompare(nameB);
                            })
                            .map(lang => {
                                return (
                                    <button
                                        key={lang}
                                        className={`flex items-center justify-center p-2 rounded-lg border border-notQuiteBlack dark:border-notQuiteWhite transition-colors ${context.preferences.language === lang ? 'bg-notQuiteBlack dark:bg-notQuiteWhite text-notQuiteWhite dark:text-notQuiteBlack font-bold' : 'bg-opacity-5 dark:bg-opacity-5 hover:bg-opacity-15 dark:hover:bg-opacity-15 bg-night dark:bg-fullMoon'}`}
                                        onClick={() => {
                                            handleLanguageChange(lang);
                                        }}
                                    >
                                        <div className="flex flex-row items-center">
                                            <LocalTwemoji controlled key={lang + "_flag"} options={{ className: '!w-8 !aspect-square mx-1', base: window.App.isPackaged ? `${process.env.PUBLIC_URL}/twemoji` : undefined }}>{(resources as any)[lang].translation.meta.emoji}</LocalTwemoji>
                                            <span className="ml-2">{(resources as any)[lang].translation.meta.name}</span>
                                        </div>
                                    </button>
                                );
                            })}
                    </div>
                </div>
                {/* Incomplete Languages */}
                {context.preferences.showIncompleteLanguages && (
                    <div className="mb-4">
                        <div className="font-semibold mb-2 mt-4">{t("settings.theming.languageIncomplete")}</div>
                        <div className="grid gap-2 grid-cols-3">
                            {Object.keys(resources)
                                .filter(lang => calculateTranslationPercentage(lang) !== 100)
                                .sort((langA, langB) => {
                                    const priority = (lang: string) => {
                                        if (lang === "en_001") return 0;
                                        if (lang === "stringsDebug") return 1;
                                        return 2;
                                    };
                                    const priorityA = priority(langA);
                                    const priorityB = priority(langB);
                                    if (priorityA !== priorityB) {
                                        return priorityA - priorityB;
                                    }
                                    const percentageA = calculateTranslationPercentage(langA);
                                    const percentageB = calculateTranslationPercentage(langB);
                                    if (percentageA !== percentageB) {
                                        return percentageB - percentageA;
                                    }
                                    const nameA = (resources as any)[langA].translation.meta.name;
                                    const nameB = (resources as any)[langB].translation.meta.name;
                                    return nameA.localeCompare(nameB);
                                })
                                .map(lang => {
                                    const percentage = calculateTranslationPercentage(lang);
                                    const [color, backgroundColor] = getPercentageColor(percentage);
                                    return (
                                        <button
                                            key={lang}
                                            className={`flex items-center justify-between p-2 rounded-lg border border-notQuiteBlack dark:border-notQuiteWhite transition-colors ${context.preferences.language === lang ? 'bg-notQuiteBlack dark:bg-notQuiteWhite text-notQuiteWhite dark:text-notQuiteBlack font-bold' : 'bg-opacity-5 dark:bg-opacity-5 hover:bg-opacity-15 dark:hover:bg-opacity-15 bg-night dark:bg-fullMoon'}`}
                                            onClick={() => {
                                                handleLanguageChange(lang);
                                            }}
                                        >
                                            <div className="flex flex-row items-center">
                                                <LocalTwemoji controlled key={lang + "_flag"} options={{ className: '!w-8 !aspect-square mx-1', base: window.App.isPackaged ? `${process.env.PUBLIC_URL}/twemoji` : undefined }}>{(resources as any)[lang].translation.meta.emoji}</LocalTwemoji>
                                                <span className="mx-2">{(resources as any)[lang].translation.meta.name}</span>
                                            </div>
                                            <div className="border-2 border-solid rounded-full text-sm px-2 py-1" style={{ color: color, backgroundColor }}>{percentage}%</div>
                                        </button>
                                    );
                                })}
                        </div>
                    </div>
                )}
                <div className="flex items-center justify-between px-4 py-3 gap-3 rounded-lg bg-fullMoon dark:bg-night">
                    <div className="flex flex-col">
                        <span className="font-medium">{t('settings.theming.languageShowIncomplete')}</span>
                        <span className="text-sm opacity-70">
                            <Trans i18nKey='settings.theming.languageShowIncompleteDescription' components={[(<a href="https://crowdin.com/project/deadforge" target="_blank" rel="noopener noreferrer" key="crowdin" className="m-0">Crowdin</a>)]} />
                        </span>
                    </div>
                    <FlipSwitch
                        checked={context.preferences.showIncompleteLanguages}
                        onChange={e => handleSetShowIncompleteLanguagesChange(e.target.checked)}
                    />
                </div>
            </GenericModal>
        </>
    );
};

export default LanguageSelector; 