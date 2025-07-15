import React, { useContext, useRef, useEffect } from "react";
import { AppContext } from "@/App.tsx";
import { Trans, useTranslation } from "react-i18next";
import FlipSwitch from "@/components/CustomElements/FlipSwitch";
import SettingsOption from "./SettingsOption";
import { Link } from "react-router-dom";
import { UpdateContext } from "@/App.tsx";

const UpdateCentre = () => {
    const { context, setContext } = useContext(AppContext);
    const { t } = useTranslation();
    const autoUpdateRef = useRef<HTMLInputElement | null>(null)
    const autoUpdatesForceDisable = true

    const {
        latestStable,
        latestBeta,
        updateState,
        downloadProgress,
        downloadingVersion,
        downloadedVersion,
        handleDownload,
        updateUpdateState
    } = useContext(UpdateContext);

    updateUpdateState();

    useEffect(() => {
        if (!window.Electron.isSettingsWindow && context.preferences.useSettingsWindow) {
            if (window.navigation!.canGoBack) {
                window.history.back();
            } else {
                window.location.hash = context.preferences.defaultPage;
            }
        }
    })

    const isDev = !window.App.isPackaged;

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

    return (
        <div className="w-[calc(100%-48px)] h-[calc(100%-48px)] dark:bg-night bg-fullMoon text-night dark:text-fullMoon transition-colors duration-300 font-notoSans overflow-y-auto p-6 relative">
            <div className="max-w-6xl mx-auto px-12 py-8">
                <h1 className="text-5xl flex items-center font-uniSansCAPS font-bold settingsShrink:text-center mb-6 settingsShrink:mb-4"><Link to="/settings" className="material-symbols text-5xl absolute -translate-x-[calc(100%+12px)] transition-opacity opacity-50 hover:opacity-80 cursor-pointer" style={{clipPath: "circle(20px)"}}>arrow_circle_left</Link>{t("settings.appData.updateCentre")}</h1>
                <div className="mb-8">
                    {/* eslint-disable-next-line react/no-children-prop */}
                    {isDev && (<SettingsOption title={t("settings.appData.updatesDevNotice")} controls={(<span className='text-warning material-symbols text-4xl size-6 flex items-center justify-center' children="logo_dev" />)} />)}
                    {/* Update Banner */}
                    <div className="mb-4 flex flex-row flex-wrap [&>:not(:last-child):not(hr):not(.separator-container)]:min-w-[17rem] items-stretch justify-stretch bg-notQuiteWhite dark:bg-notQuiteBlack/30 border-2 border-solid border-neutral-400 dark:border-neutral-600 rounded-xl shadow-lg overflow-hidden [&>:not(:last-child)]:min-h-32 last:*:min-h-12">
                        <div className="flex flex-col flex-1 flex-shrink items-center justify-center px-6 bg-neutral-300 dark:bg-neutral-800">
                            <span className="font-uniSansCAPS font-bold text-xs text-neutral-600 dark:text-neutral-300">{t('settings.appData.updateCentreBanner.currentlyRunningVersion')}</span>
                            <span className="font-uniSansCAPS font-bold text-lg leading-6 text-notQuiteBlack dark:text-notQuiteWhite flex flex-row gap-x-0 items-center justify-center">
                                {window.Process?.versions?.deadforge || t('settings.appData.updateCentreBanner.unknownVersion')}
                                {isDev && (
                                    <span className="material-symbols text-warning text-2xl align-middle ml-2">logo_dev</span>
                                )}
                            </span>
                            {[latestStable, latestBeta].includes(window.Process?.versions?.deadforge) && (
                                <span className="font-uniSansCAPS font-bold text-xs text-neutral-600 dark:text-neutral-300">
                                    <Trans i18nKey={`settings.appData.updateCentreBanner.latest${window.Process?.versions?.deadforge === latestStable ? "Stable" : "Beta"}Version`} components={{color: <span className={window.Process?.versions?.deadforge === latestStable ? "text-success" : "text-warning"} />}} />
                                </span>
                            )}
                        </div>
                        <div className="separator-container flex items-center justify-center w-px bg-neutral-300 dark:bg-neutral-800">
                            <hr className="border-0 border-r border-solid border-neutral-400 dark:border-neutral-700 my-6 h-[calc(100%-3rem)]" />
                        </div>
                        <div className="flex flex-col flex-1 flex-shrink items-center justify-center px-6 bg-neutral-300 dark:bg-neutral-800 border-l border-neutral-300 dark:border-neutral-700">
                            <span className="font-uniSansCAPS font-bold text-base text-neutral-600 dark:text-neutral-300">{t('settings.appData.updateCentreBanner.latestReleases')}</span>
                            <span className="font-uniSansCAPS font-bold text-base leading-6 text-notQuiteBlack dark:text-notQuiteWhite flex flex-col items-center justify-center">
                                <span className="flex items-center whitespace-pre">
                                    {t('settings.appData.updateCentreBanner.stable') + " "}
                                    <span className="text-success flex items-center gap-1">
                                        {latestStable ?? <span className="text-neutral-400">N/A</span>}
                                        {(latestStable && latestStable !== window.Process?.versions?.deadforge && ![downloadingVersion, downloadedVersion].includes(latestStable) && !isDev) && (
                                            <button
                                                className="material-symbols text-2xl hover:opacity-80 transition-opacity"
                                                style={{ verticalAlign: "middle" }}
                                                onClick={() => handleDownload(latestStable)}
                                            >
                                                download
                                            </button>
                                        )}
                                    </span>
                                </span>
                                <span className="flex items-center whitespace-pre">
                                    {t('settings.appData.updateCentreBanner.beta') + " "}
                                    <span className="text-warning flex items-center gap-1">
                                        {latestBeta ?? <span className="text-neutral-400">{t('settings.appData.updateCentreBanner.notAvailable')}</span>}
                                        {(latestBeta && latestBeta !== window.Process?.versions?.deadforge && ![downloadingVersion, downloadedVersion].includes(latestBeta) && !isDev) && (
                                            <button
                                                className="material-symbols text-2xl hover:opacity-80 transition-opacity"
                                                style={{ verticalAlign: "middle" }}
                                                onClick={() => handleDownload(latestBeta)}
                                            >
                                                download
                                            </button>
                                        )}
                                    </span>
                                </span>
                            </span>
                        </div>
                        {/* Right: Placeholder for future update info */}
                        {!isDev && (
                            <div className="flex-grow flex-shrink flex flex-col items-center justify-center px-6 py-4 gap-y-1 font-uniSansCAPS">
                                {/* Simulated update state UI */}
                                {updateState === 'none' && (
                                    <>
                                        <span className="flex flex-wrap font-bold text-base text-notQuiteBlack dark:text-notQuiteWhite text-wrap">{t('settings.appData.updateCentreBanner.noUpdateDownloaded')}</span>
                                    </>
                                )}
                                {updateState === 'downloading' && (
                                    <>
                                        <span className="font-uniSansCAPS font-bold text-xs text-notQuiteBlack dark:text-notQuiteWhite">{t('settings.appData.updateCentreBanner.downloadingUpdate')}</span>
                                        <span className="text-neutral-800 dark:text-neutral-200 text-lg leading-6 font-bold">{downloadingVersion}</span>
                                        <span className="text-neutral-700 dark:text-neutral-300 text-xs font-bold">{downloadProgress}%</span>
                                    </>
                                )}
                                {updateState === 'downloaded' && (
                                    <>
                                        <span className="font-uniSansCAPS font-bold text-xs text-notQuiteBlack dark:text-notQuiteWhite">{t('settings.appData.updateCentreBanner.updateDownloaded')}</span>
                                        <span className="flex items-center font-uniSansCAPS font-bold text-lg leading-6 text-neutral-800 dark:text-neutral-200 whitespace-pre">{downloadedVersion}</span>
                                        <button
                                            className="flex font-uniSansCAPS font-bold italic hover:underline bg-transparent border-none p-0 cursor-pointer hover:opacity-80 transition-opacity text-xs"
                                            onClick={() => window.Electron.DEADFORGE_installUpdate()}
                                        >
                                            {t('settings.appData.updateCentreBanner.quitAndInstall')}
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                    <SettingsOption title={t("settings.appData.autoUpdate")} description={t("settings.appData.autoUpdateDescription")}
                        controls={<FlipSwitch checked={context.preferences.autoUpdate}
                            onChange={(e) => handleAutoUpdateChange(e.target.checked)}
                            disabled={autoUpdatesForceDisable}
                            ref={autoUpdateRef}
                        />}
                    />
                    <SettingsOption title={t("settings.appData.betaUpdates")} description={t("settings.appData.betaUpdatesDescription")}
                        controls={<FlipSwitch checked={context.preferences.betaUpdates}
                            onChange={(e) => handleBetaUpdatesChange(e.target.checked)}
                            disabled={!context.preferences.autoUpdate || autoUpdateRef.current?.disabled || autoUpdatesForceDisable}
                        />}
                    />
                    <SettingsOption title={t("settings.appData.languageUpdates")} description={t("settings.appData.languageUpdatesDescription")}
                        controls={<FlipSwitch checked={context.preferences.langUpdates}
                            onChange={(e) => handleLanguageUpdatesChange(e.target.checked)}
                            disabled={!context.preferences.autoUpdate || autoUpdateRef.current?.disabled || autoUpdatesForceDisable}
                        />}
                    />
                </div>
            </div>
        </div>
    );
};

export default UpdateCentre; 