import React, { useContext, useEffect, useState } from "react";
import { AppContext } from "@/App.tsx";
import i18n, { dateFNSResources } from "@/locales/i18n.ts";
import { useTranslation } from "react-i18next";
import { Select, SelectOption } from "@/components/CustomElements/Select.tsx";
import FlipSwitch from "@/components/CustomElements/FlipSwitch";
import SettingsOption from "./SettingsOption";
import ConfirmationModal from "@/components/ConfirmationModal";
import GenericModal from "@/components/GenericModal";
import MarkdownText from "@/components/CustomElements/MarkdownText";
import Tooltip from "@/components/CustomElements/Tooltip";
import Credits from "./Credits";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import LanguageSelector from "@/components/CustomElements/LanguageSelector";

const Settings = () => {
    const { context, setContext } = useContext(AppContext);
    const { t } = useTranslation();
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
    const [isCreditsModalOpen, setIsCreditsModalOpen] = useState(false);
    const [privacyMarkdown, setPrivacyMarkdown] = useState<string | null>(null);
    const [privacyLoading, setPrivacyLoading] = useState(false);
    const [privacyError, setPrivacyError] = useState<string | null>(null);

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

    useEffect(() => {
        window.Electron.onPrivacyUpdate((_, content) => setPrivacyMarkdown(content))
        return () => {window.Electron.onPrivacyUpdate(() => {})}
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

    const themePickExpanded = "ml-0 max-w-full w-full", themePickCollapsed = "ml-0 max-w-0 w-0", themePickBaseExpanded = "max-w-xs w-full", themePickBaseCollapsed = "max-w-6 w-6";

    const SettingsSeparator = () => (<hr className="border-notQuiteBlack dark:border-notQuiteWhite border-0 border-t-2 border-solid opacity-50 my-8 settingsShrink:my-4 rounded-full" />)
    const SettingsSectionTitle = ({ children }: { children: React.JSX.Element | string }) => (<h2 className="text-xl settingsShrink:text-2xl settingsShrink:text-center font-uniSansCAPS font-bold mb-4">{children}</h2>)

    // Fetch privacy policy markdown
    const fetchPrivacy = async () => {
        setPrivacyLoading(true);
        setPrivacyError(null);
        try {
            const md = await window.Electron.fetchPrivacy();
            setPrivacyMarkdown(md);
        } catch (e) {
            setPrivacyError(`Failed to load privacy policy: ${e}`);
        } finally {
            setPrivacyLoading(false);
        }
    };

    // Open privacy modal and fetch content
    const openPrivacyModal = () => {
        window.Electron.updatePrivacy();
        setIsPrivacyModalOpen(true);
        fetchPrivacy();
    };
    // Open credits modal and fetch content
    const openCreditsModal = () => {
        setIsCreditsModalOpen(true);
    };

    return (
        <div className="w-[calc(100%-48px)] h-[calc(100%-48px)] dark:bg-night bg-fullMoon text-night dark:text-fullMoon transition-colors duration-300 font-notoSans overflow-y-auto p-6 relative">
            <div className="max-w-6xl mx-auto px-12 py-8">
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
                    <SettingsOption
                        title={t("settings.theming.language")}
                        description={t("settings.theming.languageDescription")}
                        controls={
                            <LanguageSelector />
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

                    {/* Update Centre Link */}
                    <Link
                        to="/settings/updates"
                        className="m-0 no-underline group/update-centre-link"
                    >
                        <SettingsOption
                            title={t("settings.appData.updateCentre")}
                            description={t("settings.appData.updateCentreDescription")}
                            controls={
                                <span className="material-symbols text-4xl mx-1.5 transition-opacity opacity-50 group-hover/update-centre-link:opacity-80">arrow_circle_right</span>
                            }
                        />
                    </Link>
                </div>

                <span>
                    <div className="whitespace-nowrap leading-[15px] text-center flex justify-center">
                        <Tooltip content="yip!" containerClassName="w-fit">
                            {' ႔ ႔'}<br />
                            {'ᠸ^ ^  <'}
                        </Tooltip>
                    </div>
                </span>

                <div className="flex flex-row flex-wrap justify-center settingsShrink:justify-center opacity-70 mt-1 [&>:not(:last-child)]:after:content-['・'] [&>:not(:last-child)]:after:mx-1">
                    <span className="text-sm flex items-baseline">
                        <button type="button" onClick={openPrivacyModal} className="underline hover:opacity-100 opacity-80">
                            <span>{t("settings.appData.privacyPolicy")}</span>
                        </button>
                    </span>
                    <span className="text-sm flex items-baseline">
                        <button type="button" onClick={openCreditsModal} className="underline hover:opacity-100 opacity-80">
                            <span>{t("settings.appData.credits")}</span>
                        </button>
                    </span>
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

            {/* Privacy Policy Modal */}
            <GenericModal
                className="max-w-4xl [&>:first-child]:font-bold [&>:first-child>:first-child>:first-child]:-mt-3 [&>:nth-child(2)>:first-child>:first-child]:absolute [&>:nth-child(2)>:first-child>:first-child]:mt-[-2.4rem]"
                isOpen={isPrivacyModalOpen}
                onClose={() => setIsPrivacyModalOpen(false)}
                title={t("settings.appData.privacyPolicy")}
            >
                {privacyLoading ? (
                    <div className="text-center opacity-70">{t("loading")}</div>
                ) : privacyError ? (
                    <div className="text-danger text-center">{privacyError}</div>
                ) : privacyMarkdown ? (
                    <MarkdownText className="[&>:first-child]:mt-0 [&>:last-child]:mb-0">{privacyMarkdown.replace(/^.*$\n.*<!-- (.*) -->/m, (_, lastUpdatedDate) => `###### ${t('home.articles.lastEditedOn', {date: format(new Date(lastUpdatedDate), 'PPP', { locale: dateFNSResources[i18n.language as keyof typeof dateFNSResources] })})}`)}</MarkdownText>
                ) : null}
            </GenericModal>

            {/* Credits Modal */}
            <GenericModal
                isOpen={isCreditsModalOpen}
                onClose={() => setIsCreditsModalOpen(false)}
                title={t("settings.appData.credits")}
                className="[&>:first-child]:pb-0"
            >
                <Credits refreshVar={isCreditsModalOpen} />
            </GenericModal>
        </div>
    );
}

export default Settings;