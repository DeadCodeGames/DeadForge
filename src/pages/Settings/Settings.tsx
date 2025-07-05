import React, { useContext, useEffect, useState, useRef } from "react";
import { AppContext } from "@/App.tsx";
import i18n, { resources } from "@/locales/i18n.ts";
import { Trans, useTranslation } from "react-i18next";
import LocalTwemoji from "@/components/CustomElements/LocalTwemoji.tsx";
import { flatten } from "flat";
import { Select, SelectOption } from "@/components/CustomElements/Select.tsx";
import FlipSwitch from "@/components/CustomElements/FlipSwitch";
import SettingsOption from "./SettingsOption";
import ConfirmationModal from "@/components/ConfirmationModal";

const Settings = () => {
    const { context, setContext } = useContext(AppContext);
    const { t } = useTranslation();
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const autoUpdateRef = useRef<HTMLInputElement | null>(null)
    const autoUpdatesForceDisable = true

    console.log(autoUpdateRef.current)

    useEffect(() => {
        if (!window.Electron.isSettingsWindow && context.preferences.useSettingsWindow) {
            if (window.navigation!.canGoBack) {
                window.history.back();
            } else {
                window.location.hash = context.preferences.defaultPage;
            }
            window.Electron.openSettingsWindow();
        }
    })

    const handleThemeChange = (theme: string) => {
        setContext((prev: any) => ({
            ...prev,
            preferences: {
                ...prev.preferences,
                theme
            }
        }));
    };

    const handleWindowFrameChange = (windowFrame: string | null) => {
        setContext((prev: any) => ({
            ...prev,
            preferences: {
                ...prev.preferences,
                windowFrame
            }
        }));
    };

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

    const handleSetIncludeCurrentLocationInHeader = (showCurrentPageTitleInFrame: boolean) => {
        setContext((prev: any) => ({
            ...prev,
            preferences: {
                ...prev.preferences,
                showCurrentPageTitleInFrame,
            },
        }));
    }

    const handleSetIncludeThemeSwitchInHeader = (showThemeButton: boolean) => {
        setContext((prev: any) => ({
            ...prev,
            preferences: {
                ...prev.preferences,
                showThemeButton,
            },
        }));
    }

    const handleSetShowIncompleteLanguagesChange = (showIncompleteLanguages: boolean) => {
        setContext((prev: any) => ({
            ...prev,
            preferences: {
                ...prev.preferences,
                showIncompleteLanguages
            }
        }));
    }

    const handleDefaultPageChange = (defaultPage: string) => {
        setContext((prev: any) => ({
            ...prev,
            preferences: {
                ...prev.preferences,
                defaultPage
            }
        }));
    };

    const handleSettingsWindowChange = (useSettingsWindow: boolean) => {
        setContext((prev: any) => ({
            ...prev,
            preferences: {
                ...prev.preferences,
                useSettingsWindow
            }
        }));
    };

    const handleUseTrayChange = (useTray: boolean) => {
        setContext((prev: any) => ({
            ...prev,
            preferences: {
                ...prev.preferences,
                useTray
            }
        }));
    };

    const handleAutoStartChange = (autoStart: boolean) => {
        setContext((prev: any) => ({
            ...prev,
            preferences: {
                ...prev.preferences,
                autoStart
            }
        }));
    };

    const handleAutoUpdateChange = (autoUpdate: boolean) => {
        setContext((prev: any) => ({
            ...prev,
            preferences: {
                ...prev.preferences,
                autoUpdate
            }
        }));
    };

    const handleBetaUpdatesChange = (betaUpdates: boolean) => {
        setContext((prev: any) => ({
            ...prev,
            preferences: {
                ...prev.preferences,
                betaUpdates
            }
        }));
    };

    const handleLanguageUpdatesChange = (langUpdates: boolean) => {
        setContext((prev: any) => ({
            ...prev,
            preferences: {
                ...prev.preferences,
                langUpdates
            }
        }));;
    };

    const replaySetup = () => {
        setContext((prev: any) => ({
            ...prev,
            setupModalActive: true
        }))
    };

    const exportData = async () => {
        console.log(await window.Electron.exportBackup());
    };

    const importData = async () => {
        console.log(await window.Electron.importBackup())
    };

    const resetData = async () => {
        try {
            await window.Electron.resetAllData();
            // After reset, we should probably restart the app
            window.Electron.restartApp();
        } catch (error) {
            console.error("Failed to reset app data:", error);
        }
    };

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

        // Build set of base keys from English
        const enBaseKeys = Array.from(
            new Set(
                Object.keys(enFlat)
                    .filter((key) => !key.startsWith("meta"))
                    .map(stripPlural)
            )
        );

        // For each base key, check if any plural form in the target language is non-empty
        const translatedCount = enBaseKeys.filter((baseKey) => {
            // Find all possible plural forms for this base key in the target language
            const pluralForms = PLURAL_SUFFIXES.map(suffix => baseKey + suffix).concat([baseKey]);
            return pluralForms.some(formKey => langFlat[formKey] !== undefined && langFlat[formKey] !== "");
        }).length;

        return Math.round((translatedCount / enBaseKeys.length) * 100);
    };

    const getPercentageColor = (percentage: number) => {
        const hue = Math.round(percentage * 1.15);
        return [`hsl(${hue}, 100%, 40%)`, `hsla(${hue}, 100%, 40%, 0.125)`];
    };

    const themePickExpanded = "ml-0 max-w-full w-full", themePickCollapsed = "ml-0 max-w-0 w-0", themePickBaseExpanded = "max-w-xs w-full", themePickBaseCollapsed = "max-w-6 w-6";

    const SettingsSeparator = () => (<hr className="border-notQuiteBlack dark:border-notQuiteWhite border-0 border-t-2 border-solid opacity-50 my-8 settingsShrink:my-4 rounded-full" />)
    const SettingsSectionTitle = ({ children }: { children: React.JSX.Element | string }) => (<h2 className="text-xl settingsShrink:text-2xl settingsShrink:text-center font-uniSansCAPS font-bold mb-4">{children}</h2>)

    return (
        <div className="w-[calc(100%-48px)] h-[calc(100%-48px)] dark:bg-night bg-fullMoon text-night dark:text-fullMoon transition-colors duration-300 font-notoSans overflow-y-auto p-6 relative">
            <div className="max-w-6xl mx-auto px-12 py-8 settingsShrink:p-0">
                <h1 className="text-5xl font-uniSansCAPS font-bold settingsShrink:text-center mb-6 settingsShrink:mb-4">{t("sidebar.settings")}</h1>

                {/* Theming Section */}
                <div className="mb-8">
                    <SettingsSectionTitle>{t("settings.theming.title")}</SettingsSectionTitle>

                    {/* Theme Switcher */}
                    <SettingsOption
                        title={t("settings.theming.theme")}
                        description={t("settings.theming.themeDescription")}
                        controls={
                            <div className="flex space-x-2 justify-end">
                                <button
                                    onClick={() => handleThemeChange("system")}
                                    className={`text-nowrap min-w-6 flex items-center justify-start gap-x-2 p-2 rounded-lg w-auto transition-[background-color,color,width,max-width] duration-[300ms,300ms,1s,1s] ease-in-out ${context.preferences.theme === "system"
                                        ? `bg-notQuiteBlack dark:bg-notQuiteWhite text-notQuiteWhite dark:text-notQuiteBlack ${themePickBaseExpanded}`
                                        : `bg-opacity-10 bg-notQuiteBlack dark:bg-opacity-10 dark:bg-notQuiteWhite ${themePickBaseCollapsed}`
                                    }`}
                                >
                                    <span className="material-symbols">settings</span>
                                    <span
                                        className={`font-medium overflow-hidden transition-[max-width,width,margin-left] duration-1000 ease-in-out ${context.preferences.theme === "system"
                                            ? themePickExpanded
                                            : themePickCollapsed
                                        }`}
                                    >
                                        {t("settings.theming.systemTheme")}
                                    </span>
                                </button>
                                <button
                                    onClick={() => handleThemeChange("dark")}
                                    className={`text-nowrap min-w-6 flex items-center justify-start gap-x-2 p-2 rounded-lg w-auto transition-[background-color,color,width,max-width] duration-[300ms,300ms,1s,1s] ease-in-out ${context.preferences.theme === "dark"
                                        ? `bg-notQuiteBlack dark:bg-notQuiteWhite text-notQuiteWhite dark:text-notQuiteBlack ${themePickBaseExpanded}`
                                        : `bg-opacity-10 bg-notQuiteBlack dark:bg-opacity-10 dark:bg-notQuiteWhite ${themePickBaseCollapsed}`
                                    }`}
                                >
                                    <span className="material-symbols">dark_mode</span>
                                    <span
                                        className={`font-medium overflow-hidden transition-[max-width,width,margin-left] duration-1000 ease-in-out ${context.preferences.theme === "dark"
                                            ? themePickExpanded
                                            : themePickCollapsed
                                        }`}
                                    >
                                        {t("settings.theming.darkTheme")}
                                    </span>
                                </button>
                                <button
                                    onClick={() => handleThemeChange("light")}
                                    className={`text-nowrap min-w-6 flex items-center justify-start gap-x-2 p-2 rounded-lg w-auto transition-[background-color,color,width,max-width] duration-[300ms,300ms,1s,1s] ease-in-out ${context.preferences.theme === "light"
                                        ? `bg-notQuiteBlack dark:bg-notQuiteWhite text-notQuiteWhite dark:text-notQuiteBlack ${themePickBaseExpanded}`
                                        : `bg-opacity-10 bg-notQuiteBlack dark:bg-opacity-10 dark:bg-notQuiteWhite ${themePickBaseCollapsed}`
                                    }`}
                                >
                                    <span className="material-symbols">light_mode</span>
                                    <span
                                        className={`font-medium overflow-hidden transition-[max-width,width,margin-left] duration-1000 ease-in-out ${context.preferences.theme === "light"
                                            ? themePickExpanded
                                            : themePickCollapsed
                                        }`}
                                    >
                                        {t("settings.theming.lightTheme")}
                                    </span>
                                </button>
                            </div>
                        }
                    />


                    {/* Window Frame Selector */}
                    <SettingsOption title={t("settings.theming.windowFrame")} description={t("settings.theming.windowFrameDescription")}
                        controls={
                            <Select
                                value={context.preferences.windowFrame || "auto"}
                                onChange={handleWindowFrameChange}
                                className="p-2 rounded-lg dark:bg-night bg-fullMoon border border-notQuiteBlack dark:border-notQuiteWhite"
                            >
                                <SelectOption value="auto">{t("settings.theming.windowFrameAuto")}</SelectOption>
                                <SelectOption value="windows">{t("settings.theming.windowFrameWindows")}</SelectOption>
                                <SelectOption value="mac">{t("settings.theming.windowFrameMac")}</SelectOption>
                                <SelectOption value="linux">{t("settings.theming.windowFrameLinux")}</SelectOption>
                            </Select>}
                    />

                    {/* Include CurrentPageTitle in Window Frame */}
                    <SettingsOption
                        title={t("settings.theming.currentPageTitleInFrame")}
                        description={t("settings.theming.currentPageTitleInFrameDescription")}
                        controls={
                            <FlipSwitch
                                checked={context.preferences.showCurrentPageTitleInFrame}
                                onChange={(e) => handleSetIncludeCurrentLocationInHeader(e.target.checked)}
                            />
                        }
                    />

                    {/* Include Theme Switch in Window Frame */}
                    <SettingsOption
                        title={t("settings.theming.themeButtonInFrame")}
                        description={t("settings.theming.themeButtonInFrameDescription")}
                        controls={
                            <FlipSwitch
                                checked={context.preferences.showThemeButton}
                                onChange={(e) => handleSetIncludeThemeSwitchInHeader(e.target.checked)}
                            />
                        }
                    />


                    {/* Language Switcher */}
                    <SettingsOption title={t("settings.theming.language")} description={t("settings.theming.languageDescription")}
                        controls={
                            <Select
                                value={context.preferences.language || "en_001"}
                                onChange={handleLanguageChange}
                                className="p-2 rounded-lg dark:bg-night bg-fullMoon border border-notQuiteBlack dark:border-notQuiteWhite"
                            >
                                {Object.keys(resources)
                                    .sort((langA, langB) => {
                                        const percentageA = calculateTranslationPercentage(langA);
                                        const percentageB = calculateTranslationPercentage(langB);

                                        if (percentageA !== percentageB) {
                                            return percentageB - percentageA; // Sort by percentage in descending order
                                        }

                                        const nameA = (resources as any)[langA].translation.meta.name;
                                        const nameB = (resources as any)[langB].translation.meta.name;
                                        return nameA.localeCompare(nameB); // Then sort by name in ascending order
                                    })
                                    .map((lang: string) => {
                                        const percentage = calculateTranslationPercentage(lang);
                                        const [color, backgroundColor] = getPercentageColor(percentage);

                                        return (
                                            <SelectOption key={lang} value={lang} hiddenFromSelect={!context.preferences.showIncompleteLanguages && percentage !== 100}>
                                                <div className="flex row items-center justify-between w-full">
                                                    <div className="flex flex-row items-center">
                                                        <LocalTwemoji controlled key={lang + "_flag"} options={{ className: '!w-8 !aspect-square mx-1', base: window.App.isPackaged ? `${process.env.PUBLIC_URL}/twemoji` : undefined }}>{(resources as any)[lang].translation.meta.emoji}</LocalTwemoji>
                                                        <span className="ml-2 mr-8">{(resources as any)[lang].translation.meta.name}</span>
                                                    </div>
                                                    <div className="border-2 border-solid rounded-full text-sm px-2 py-1" style={{ color: color, backgroundColor }}>
                                                        {percentage}%
                                                    </div>
                                                </div>
                                            </SelectOption>
                                        );
                                    })}
                            </Select>
                        }
                    />

                    <SettingsOption title={t('settings.theming.languageShowIncomplete')} description={<Trans i18nKey='settings.theming.languageShowIncompleteDescription' components={[(<a href="https://crowdin.com/project/deadforge" target="_blank" rel="noopener noreferrer" key="crowdin">Crowdin</a>)]} />}
                        controls={
                            <FlipSwitch
                                checked={context.preferences.showIncompleteLanguages}
                                onChange={(e) => { handleSetShowIncompleteLanguagesChange(e.target.checked) }}
                            />
                        }
                    />

                </div>

                <SettingsSeparator />

                {/* Behavior Section */}
                <div className="mb-8">
                    <SettingsSectionTitle>{t("settings.behavior.title")}</SettingsSectionTitle>

                    {/* Default Launcher Page */}

                    <SettingsOption title={t("settings.behavior.defaultPage")} description={t("settings.behavior.defaultPageDescription")}
                        controls={
                            <Select
                                value={context.preferences.defaultPage}
                                onChange={handleDefaultPageChange}
                                className="p-2 rounded-lg dark:bg-night bg-fullMoon border border-notQuiteBlack dark:border-notQuiteWhite"
                            >
                                <SelectOption value="">{t("sidebar.home")}</SelectOption>
                                <SelectOption value="library">{t("sidebar.library")}</SelectOption>
                                <SelectOption value="store">{t("sidebar.store")}</SelectOption>
                                <SelectOption value="arcade">{t("sidebar.arcade")}</SelectOption>
                            </Select>
                        }
                    />

                    {/* Settings in Separate Window */}
                    <SettingsOption title={t("settings.behavior.settingsWindow")} description={t("settings.behavior.settingsWindowDescription")}
                        controls={<FlipSwitch checked={context.preferences.useSettingsWindow}
                            onChange={(e) => handleSettingsWindowChange(e.target.checked)}
                        />
                        }
                    />

                    {/* Use Tray */}
                    <SettingsOption title={t("settings.behavior.useTray")} description={t("settings.behavior.useTrayDescription")}
                        controls={<FlipSwitch checked={context.preferences.useTray}
                            onChange={(e) => handleUseTrayChange(e.target.checked)}
                        />
                        }
                    />

                    {/* Auto-start on Boot */}
                    <SettingsOption title={t("settings.behavior.autoStart")} description={t("settings.behavior.autoStartDescription")}
                        controls={<FlipSwitch
                            checked={(window.Process.platform !== "win32" && window.Process.platform !== "darwin") ? false : context.preferences.autoStart}
                            onChange={(e) => handleAutoStartChange(e.target.checked)}
                            disabled={window.Process.platform !== "win32" && window.Process.platform !== "darwin"}
                        />
                        }
                    />
                </div>

                <SettingsSeparator />

                {/* App Data & Updates Section */}
                <div className="mb-8">
                    <SettingsSectionTitle>{t("settings.appData.title")}</SettingsSectionTitle>

                    {/* Replay Initial Setup */}
                    <SettingsOption title={t("settings.appData.initialSetup")} description={t("settings.appData.initialSetupDescription")}
                        controls={<button
                            onClick={replaySetup}
                            className="px-4 py-2 rounded-lg bg-notQuiteBlack dark:bg-notQuiteWhite text-notQuiteWhite dark:text-notQuiteBlack font-bold disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {t("settings.appData.replaySetup")}
                        </button>
                        }
                    />

                    {/* Data Management */}
                    <SettingsOption title={t("settings.appData.dataManagement")} description={t("settings.appData.dataManagementDescription")}
                        controls={
                            <div className="flex flex-row gap-4 flex-wrap justify-end settingsShrink:justify-center">
                                <button
                                    onClick={exportData}
                                    className="px-4 py-2 rounded-lg bg-opacity-10 bg-notQuiteBlack dark:bg-opacity-10 dark:bg-notQuiteWhite font-bold disabled:cursor-not-allowed disabled:opacity-50"
                                    
                                >
                                    {t("settings.appData.exportData")}
                                </button>
                                <button
                                    onClick={importData}
                                    className="px-4 py-2 rounded-lg bg-opacity-10 bg-notQuiteBlack dark:bg-opacity-10 dark:bg-notQuiteWhite font-bold disabled:cursor-not-allowed disabled:opacity-50"
                                    
                                >
                                    {t("settings.appData.importData")}
                                </button>
                                <button
                                    onClick={() => setIsResetModalOpen(true)}
                                    className="px-4 py-2 rounded-lg bg-danger text-white font-bold"
                                >
                                    {t("settings.appData.resetData")}
                                </button>
                            </div>
                        }
                    />

                    {/* Auto-updates */}
                    <SettingsOption title={t("settings.appData.autoUpdate")} description={t("settings.appData.autoUpdateDescription")}
                        controls={<FlipSwitch checked={autoUpdatesForceDisable ? false : context.preferences.autoUpdate}
                            onChange={(e) => handleAutoUpdateChange(e.target.checked)}
                            disabled={autoUpdatesForceDisable}
                            ref={autoUpdateRef}
                        />
                        }
                    />

                    {/* Beta Updates */}
                    <SettingsOption title={t("settings.appData.betaUpdates")} description={t("settings.appData.betaUpdatesDescription")}
                        controls={<FlipSwitch checked={autoUpdatesForceDisable ? false : context.preferences.betaUpdates}
                            onChange={(e) => handleBetaUpdatesChange(e.target.checked)}
                            disabled={!context.preferences.autoUpdate || autoUpdateRef.current?.disabled || autoUpdatesForceDisable}
                        />
                        }
                    />

                    {/* Language Updates */}
                    <SettingsOption title={t("settings.appData.languageUpdates")} description={t("settings.appData.languageUpdatesDescription")}
                        controls={<FlipSwitch checked={autoUpdatesForceDisable ? false : context.preferences.langUpdates}
                            onChange={(e) => handleLanguageUpdatesChange(e.target.checked)}
                            disabled={!context.preferences.autoUpdate || autoUpdateRef.current?.disabled || autoUpdatesForceDisable}
                        />
                        }
                    />
                </div>

                <span>
                    <div className="whitespace-nowrap leading-4 text-center">
                        {' ႔ ႔'}<br />
                        {'ᠸ^ ^  <'}
                    </div>
                </span>

                <div className="flex flex-row gap-4 flex-wrap justify-center settingsShrink:justify-center opacity-70">
                    <a href="https://github.com/DeadCodeGames/DeadForge/blob/2024/2025/PRIVACY.md" target="_blank" rel="noopener noreferrer" className="flex flex-row items-center gap-2 text-sm">
                        <span>{t("settings.appData.privacyPolicy")}</span>
                    </a>
                </div>
            </div>

            {/* Reset Data Modal */}
            <ConfirmationModal
                isOpen={isResetModalOpen}
                onClose={() => setIsResetModalOpen(false)}
                onConfirm={resetData}
                title={t("settings.appData.resetDataTitle")}
                message={t("settings.appData.resetDataConfirmation")}
                confirmText={t("settings.appData.resetDataConfirm")}
                cancelText={t("settings.appData.resetDataCancel")}
                isDangerous={true}
            />
        </div>
    );
}

export default Settings;