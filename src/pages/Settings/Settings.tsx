import { useContext } from "react";
import { AppContext } from "@/App.tsx";
import { resources } from "@/locales/i18n.ts";
import { useTranslation } from "react-i18next";
import Twemoji from "react-twemoji";
import { flatten } from "flat";
import { Select, SelectOption } from "@/components/CustomElements/Select.tsx";

export default function Settings() {
    const { context, setContext } = useContext(AppContext);
    const { t } = useTranslation();

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
    };

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
        }));
    };

    const replaySetup = () => {
        console.log("Replaying initial setup sequence");
    };

    const exportData = () => {
        console.log("Exporting user data");
    };

    const importData = () => {
        console.log("Importing user data");
    };

    const resetData = () => {
        console.log("Resetting all user data");
    };

    const calculateTranslationPercentage = (lang: string) => {
        if (lang === "en_001") return 100;

        const enTranslations: number = Object.entries(flatten(resources["en_001"].translation)!).filter(([key]) => key !== "meta").length;

        const langTranslations: number = Object.entries(flatten((resources as any)[lang].translation)!).filter(([key, value]) => key !== "meta" && value !== "").length

        return Math.round((langTranslations / enTranslations) * 100);
    };

    const getPercentageColor = (percentage: number) => {
        const hue = Math.round(percentage * 1.15);
        return [`hsl(${hue}, 100%, 40%)`, `hsla(${hue}, 100%, 40%, 0.125)`];
    };

    const themePickExpanded = "ml-0 max-w-full w-full", themePickCollapsed = "ml-0 max-w-0 w-0", themePickBaseExpanded = "max-w-xs w-full", themePickBaseCollapsed = "max-w-6 w-6";

    return (
        <div className="w-[calc(100%-48px)] h-[calc(100%-48px)] dark:bg-night bg-fullMoon text-night dark:text-fullMoon transition-colors duration-300 font-notoSans overflow-y-auto p-6 relative">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-4xl font-uniSansCAPS font-bold mb-6">{t("sidebar.settings")}</h1>

                {/* Theming Section */}
                <div className="mb-8">
                    <h2 className="text-xl font-uniSansCAPS font-bold mb-4">{t("settings.theming.title")}</h2>

                    {/* Theme Switcher */}
                    <div className="flex justify-between items-center mb-4 p-4 bg-opacity-5 bg-notQuiteBlack dark:bg-opacity-5 dark:bg-notQuiteWhite rounded-lg">
                        <div>
                            <div className="font-bold">{t("settings.theming.theme")}</div>
                            <div className="text-opacity-70 text-notQuiteBlack dark:text-opacity-70 dark:text-notQuiteWhite italic">{t("settings.theming.themeDescription")}</div>
                        </div>
                        <div className="flex space-x-2 justify-end">
                            <button
                                onClick={() => handleThemeChange("system")}
                                className={`min-w-6 flex items-center justify-start gap-x-2 p-2 rounded-lg w-auto transition-[background-color,color,width,max-width] duration-[300ms,300ms,1s,1s] ease-in-out ${context.preferences.theme === "system" ? `bg-notQuiteBlack dark:bg-notQuiteWhite text-notQuiteWhite dark:text-notQuiteBlack ${themePickBaseExpanded}` : `bg-opacity-10 bg-notQuiteBlack dark:bg-opacity-10 dark:bg-notQuiteWhite ${themePickBaseCollapsed}`}`}
                            >
                                <span className="material-symbols">settings</span>
                                <span className={`font-medium overflow-hidden transition-[max-width,width,margin-left] duration-1000 ease-in-out ${context.preferences.theme === "system" ? themePickExpanded : themePickCollapsed}`}>{t("settings.theming.systemTheme")}</span>
                            </button>
                            <button
                                onClick={() => handleThemeChange("dark")}
                                className={`min-w-6 flex items-center justify-start gap-x-2 p-2 rounded-lg w-auto transition-[background-color,color,width,max-width] duration-[300ms,300ms,1s,1s] ease-in-out ${context.preferences.theme === "dark" ? `bg-notQuiteBlack dark:bg-notQuiteWhite text-notQuiteWhite dark:text-notQuiteBlack ${themePickBaseExpanded}` : `bg-opacity-10 bg-notQuiteBlack dark:bg-opacity-10 dark:bg-notQuiteWhite ${themePickBaseCollapsed}`}`}
                            >
                                <span className="material-symbols">dark_mode</span>
                                <span className={`font-medium overflow-hidden transition-[max-width,width,margin-left] duration-1000 ease-in-out ${context.preferences.theme === "dark" ? themePickExpanded : themePickCollapsed}`}>{t("settings.theming.darkTheme")}</span>
                            </button>
                            <button
                                onClick={() => handleThemeChange("light")}
                                className={`min-w-6 flex items-center justify-start gap-x-2 p-2 rounded-lg w-auto transition-[background-color,color,width,max-width] duration-[300ms,300ms,1s,1s] ease-in-out ${context.preferences.theme === "light" ? `bg-notQuiteBlack dark:bg-notQuiteWhite text-notQuiteWhite dark:text-notQuiteBlack ${themePickBaseExpanded}` : `bg-opacity-10 bg-notQuiteBlack dark:bg-opacity-10 dark:bg-notQuiteWhite ${themePickBaseCollapsed}`}`}
                            >
                                <span className="material-symbols">light_mode</span>
                                <span className={`font-medium overflow-hidden transition-[max-width,width,margin-left] duration-1000 ease-in-out ${context.preferences.theme === "light" ? themePickExpanded : themePickCollapsed}`}>{t("settings.theming.lightTheme")}</span>
                            </button>
                        </div>
                    </div>

                    {/* Window Frame Selector */}
                    <div className="flex justify-between items-center mb-4 p-4 bg-opacity-5 bg-notQuiteBlack dark:bg-opacity-5 dark:bg-notQuiteWhite rounded-lg">
                        <div>
                            <div className="font-bold">{t("settings.theming.windowFrame")}</div>
                            <div className="text-opacity-70 text-notQuiteBlack dark:text-opacity-70 dark:text-notQuiteWhite italic">{t("settings.theming.windowFrameDescription")}</div>
                        </div>
                        <Select
                            value={context.preferences.windowFrame || "auto"}
                            onChange={handleWindowFrameChange}
                            className="p-2 rounded-lg dark:bg-night bg-fullMoon border border-notQuiteBlack dark:border-notQuiteWhite"
                        >
                            <SelectOption value="auto">{t("settings.theming.windowFrameAuto")}</SelectOption>
                            <SelectOption value="windows">{t("settings.theming.windowFrameWindows")}</SelectOption>
                            <SelectOption value="mac">{t("settings.theming.windowFrameMac")}</SelectOption>
                            <SelectOption value="linux">{t("settings.theming.windowFrameLinux")}</SelectOption>
                        </Select>
                    </div>

                    {/* Include Theme Switch in Window Frame */}
                    <div className="flex justify-between items-center mb-4 p-4 bg-opacity-5 bg-notQuiteBlack dark:bg-opacity-5 dark:bg-notQuiteWhite rounded-lg">
                        <div>
                            <div className="font-bold">{t("settings.theming.themeButtonInFrame")}</div>
                            <div className="text-opacity-70 text-notQuiteBlack dark:text-opacity-70 dark:text-notQuiteWhite italic">{t("settings.theming.themeButtonInFrameDescription")}</div>
                        </div>
                        <label className="inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={context.preferences.showThemeButton}
                                onChange={(e) => {
                                    setContext((prev: any) => ({
                                        ...prev,
                                        preferences: {
                                            ...prev.preferences,
                                            showThemeButton: e.target.checked
                                        }
                                    }));
                                }}
                            />
                            <div className="relative w-11 h-6 bg-notQuiteBlack dark:bg-notQuiteWhite rounded-full peer-focus:outline-none peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-fullMoon dark:after:bg-night after:rounded-full after:h-5 after:w-5 after:transition-all opacity-50 peer-checked:opacity-100"></div>
                        </label>
                    </div>

                    {/* Language Switcher */}
                    <div className="flex justify-between items-center mb-4 p-4 bg-opacity-5 bg-notQuiteBlack dark:bg-opacity-5 dark:bg-notQuiteWhite rounded-lg">
                        <div>
                            <div className="font-bold">{t("settings.theming.language")}</div>
                            <div className="text-opacity-70 text-notQuiteBlack dark:text-opacity-70 dark:text-notQuiteWhite italic">{t("settings.theming.languageDescription")}</div>
                        </div>
                        <Select
                            value={context.preferences.language || "en_001"}
                            onChange={handleLanguageChange}
                            className="p-2 rounded-lg dark:bg-night bg-fullMoon border border-notQuiteBlack dark:border-notQuiteWhite"
                        >
                            {Object.keys(resources).map((lang: string) => {
                                const percentage = calculateTranslationPercentage(lang);
                                const [color, backgroundColor] = getPercentageColor(percentage);
                                return (
                                    <SelectOption key={lang} value={lang}>
                                        <div className="flex row items-center justify-between w-full">
                                            <div className="flex flex-row items-center">
                                                <Twemoji options={{ className: '!w-12 !aspect-square mr-1' }}>{(resources as any)[lang].translation.meta.emoji}</Twemoji>
                                                <span className="ml-2 mr-8">{(resources as any)[lang].translation.meta.name}</span>
                                            </div>
                                            <div className="border-2 border-solid rounded-full px-2.5 py-1.5" style={{ color: color, backgroundColor }}>
                                                {percentage}%
                                            </div>
                                        </div>
                                    </SelectOption>
                                );
                            })}
                        </Select>
                    </div>
                </div>

                <hr className="border-notQuiteBlack dark:border-notQuiteWhite opacity-20 my-8" />

                {/* Behavior Section */}
                <div className="mb-8">
                    <h2 className="text-xl font-uniSansCAPS font-bold mb-4">{t("settings.behavior.title")}</h2>

                    {/* Default Launcher Page */}
                    <div className="flex justify-between items-center mb-4 p-4 bg-opacity-5 bg-notQuiteBlack dark:bg-opacity-5 dark:bg-notQuiteWhite rounded-lg">
                        <div>
                            <div className="font-bold">{t("settings.behavior.defaultPage")}</div>
                            <div className="text-opacity-70 text-notQuiteBlack dark:text-opacity-70 dark:text-notQuiteWhite italic">{t("settings.behavior.defaultPageDescription")}</div>
                        </div>
                        <Select
                            value={context.preferences.defaultPage || "library"}
                            onChange={handleDefaultPageChange}
                            className="p-2 rounded-lg dark:bg-night bg-fullMoon border border-notQuiteBlack dark:border-notQuiteWhite"
                        >
                            <SelectOption value="library">{t("sidebar.library")}</SelectOption>
                            <SelectOption value="store">{t("sidebar.store")}</SelectOption>
                        </Select>
                    </div>

                    {/* Settings in Separate Window */}
                    <div className="flex justify-between items-center mb-4 p-4 bg-opacity-5 bg-notQuiteBlack dark:bg-opacity-5 dark:bg-notQuiteWhite rounded-lg">
                        <div>
                            <div className="font-bold">{t("settings.behavior.settingsWindow")}</div>
                            <div className="text-opacity-70 text-notQuiteBlack dark:text-opacity-70 dark:text-notQuiteWhite italic">{t("settings.behavior.settingsWindowDescription")}</div>
                        </div>
                        <label className="inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={context.preferences.useSettingsWindow}
                                onChange={(e) => handleSettingsWindowChange(e.target.checked)}
                            />
                            <div className="relative w-11 h-6 bg-notQuiteBlack dark:bg-notQuiteWhite rounded-full peer-focus:outline-none peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-fullMoon dark:after:bg-night after:rounded-full after:h-5 after:w-5 after:transition-all opacity-50 peer-checked:opacity-100"></div>
                        </label>
                    </div>

                    {/* Use Tray */}
                    <div className="flex justify-between items-center mb-4 p-4 bg-opacity-5 bg-notQuiteBlack dark:bg-opacity-5 dark:bg-notQuiteWhite rounded-lg">
                        <div>
                            <div className="font-bold">{t("settings.behavior.useTray")}</div>
                            <div className="text-opacity-70 text-notQuiteBlack dark:text-opacity-70 dark:text-notQuiteWhite italic">{t("settings.behavior.useTrayDescription")}</div>
                        </div>
                        <label className="inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={context.preferences.useTray}
                                onChange={(e) => handleUseTrayChange(e.target.checked)}
                            />
                            <div className="relative w-11 h-6 bg-notQuiteBlack dark:bg-notQuiteWhite rounded-full peer-focus:outline-none peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-fullMoon dark:after:bg-night after:rounded-full after:h-5 after:w-5 after:transition-all opacity-50 peer-checked:opacity-100"></div>
                        </label>
                    </div>

                    {/* Auto-start on Boot */}
                    <div className="flex justify-between items-center mb-4 p-4 bg-opacity-5 bg-notQuiteBlack dark:bg-opacity-5 dark:bg-notQuiteWhite rounded-lg">
                        <div>
                            <div className="font-bold">{t("settings.behavior.autoStart")}</div>
                            <div className="text-opacity-70 text-notQuiteBlack dark:text-opacity-70 dark:text-notQuiteWhite italic">{t("settings.behavior.autoStartDescription")}</div>
                        </div>
                        <label className="inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={context.preferences.autoStart}
                                onChange={(e) => handleAutoStartChange(e.target.checked)}
                            />
                            <div className="relative w-11 h-6 bg-notQuiteBlack dark:bg-notQuiteWhite rounded-full peer-focus:outline-none peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-fullMoon dark:after:bg-night after:rounded-full after:h-5 after:w-5 after:transition-all opacity-50 peer-checked:opacity-100"></div>
                        </label>
                    </div>
                </div>

                <hr className="border-notQuiteBlack dark:border-notQuiteWhite opacity-20 my-8" />

                {/* App Data & Updates Section */}
                <div className="mb-8">
                    <h2 className="text-xl font-uniSansCAPS font-bold mb-4">{t("settings.appData.title")}</h2>

                    {/* Replay Initial Setup */}
                    <div className="flex justify-between items-center mb-4 p-4 bg-opacity-5 bg-notQuiteBlack dark:bg-opacity-5 dark:bg-notQuiteWhite rounded-lg">
                        <div>
                            <div className="font-bold">{t("settings.appData.initialSetup")}</div>
                            <div className="text-opacity-70 text-notQuiteBlack dark:text-opacity-70 dark:text-notQuiteWhite italic">{t("settings.appData.initialSetupDescription")}</div>
                        </div>
                        <button
                            onClick={replaySetup}
                            className="px-4 py-2 rounded-lg bg-notQuiteBlack dark:bg-notQuiteWhite text-notQuiteWhite dark:text-notQuiteBlack font-bold"
                        >
                            {t("settings.appData.replaySetup")}
                        </button>
                    </div>

                    {/* Data Management */}
                    <div className="flex justify-between items-center mb-4 p-4 bg-opacity-5 bg-notQuiteBlack dark:bg-opacity-5 dark:bg-notQuiteWhite rounded-lg">
                        <div>
                            <div className="font-bold">{t("settings.appData.dataManagement")}</div>
                            <div className="text-opacity-70 text-notQuiteBlack dark:text-opacity-70 dark:text-notQuiteWhite italic">{t("settings.appData.dataManagementDescription")}</div>
                        </div>
                        <div className="flex space-x-2">
                            <button
                                onClick={exportData}
                                className="px-4 py-2 rounded-lg bg-opacity-10 bg-notQuiteBlack dark:bg-opacity-10 dark:bg-notQuiteWhite font-bold"
                            >
                                {t("settings.appData.exportData")}
                            </button>
                            <button
                                onClick={importData}
                                className="px-4 py-2 rounded-lg bg-opacity-10 bg-notQuiteBlack dark:bg-opacity-10 dark:bg-notQuiteWhite font-bold"
                            >
                                {t("settings.appData.importData")}
                            </button>
                            <button
                                onClick={resetData}
                                className="px-4 py-2 rounded-lg bg-red-600 text-white font-bold"
                            >
                                {t("settings.appData.resetData")}
                            </button>
                        </div>
                    </div>

                    {/* Auto-updates */}
                    <div className="flex justify-between items-center mb-4 p-4 bg-opacity-5 bg-notQuiteBlack dark:bg-opacity-5 dark:bg-notQuiteWhite rounded-lg">
                        <div>
                            <div className="font-bold">{t("settings.appData.autoUpdate")}</div>
                            <div className="text-opacity-70 text-notQuiteBlack dark:text-opacity-70 dark:text-notQuiteWhite italic">{t("settings.appData.autoUpdateDescription")}</div>
                        </div>
                        <label className="inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={context.preferences.autoUpdate}
                                onChange={(e) => handleAutoUpdateChange(e.target.checked)}
                            />
                            <div className="relative w-11 h-6 bg-notQuiteBlack dark:bg-notQuiteWhite rounded-full peer-focus:outline-none peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-fullMoon dark:after:bg-night after:rounded-full after:h-5 after:w-5 after:transition-all opacity-50 peer-checked:opacity-100"></div>
                        </label>
                    </div>

                    {/* Beta Updates */}
                    <div className="flex justify-between items-center mb-4 p-4 bg-opacity-5 bg-notQuiteBlack dark:bg-opacity-5 dark:bg-notQuiteWhite rounded-lg">
                        <div>
                            <div className="font-bold">{t("settings.appData.betaUpdates")}</div>
                            <div className="text-opacity-70 text-notQuiteBlack dark:text-opacity-70 dark:text-notQuiteWhite italic">{t("settings.appData.betaUpdatesDescription")}</div>
                        </div>
                        <label className="inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={context.preferences.betaUpdates}
                                onChange={(e) => handleBetaUpdatesChange(e.target.checked)}
                                disabled={!context.preferences.autoUpdate}
                            />
                            <div className={`relative w-11 h-6 bg-notQuiteBlack dark:bg-notQuiteWhite rounded-full peer-focus:outline-none peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-fullMoon dark:after:bg-night after:rounded-full after:h-5 after:w-5 after:transition-all opacity-50 peer-checked:opacity-100 ${!context.preferences.autoUpdate ? 'opacity-30' : ''}`}></div>
                        </label>
                    </div>

                    {/* Language Updates */}
                    <div className="flex justify-between items-center mb-4 p-4 bg-opacity-5 bg-notQuiteBlack dark:bg-opacity-5 dark:bg-notQuiteWhite rounded-lg">
                        <div>
                            <div className="font-bold">{t("settings.appData.languageUpdates")}</div>
                            <div className="text-opacity-70 text-notQuiteBlack dark:text-opacity-70 dark:text-notQuiteWhite italic">{t("settings.appData.languageUpdatesDescription")}</div>
                        </div>
                        <label className="inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={context.preferences.langUpdates}
                                onChange={(e) => handleLanguageUpdatesChange(e.target.checked)}
                                disabled={!context.preferences.autoUpdate}
                            />
                            <div className={`relative w-11 h-6 bg-notQuiteBlack dark:bg-notQuiteWhite rounded-full peer-focus:outline-none peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-fullMoon dark:after:bg-night after:rounded-full after:h-5 after:w-5 after:transition-all opacity-50 peer-checked:opacity-100 ${!context.preferences.autoUpdate ? 'opacity-30' : ''}`}></div>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
}