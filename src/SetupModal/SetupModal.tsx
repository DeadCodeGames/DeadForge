"use client"

import { useEffect, useRef, useState, useContext } from "react"; import { AppContext } from "@/App";
import { Check, ChevronLeft, ChevronRight, Goal, Minus, X } from "lucide-react";
import { SiSteam, SiEpicgames, SiItchdotio } from '@icons-pack/react-simple-icons';
import { cn } from "@/lib/utils"
import DEADCODELogo from "@/components/CustomElements/DEADCODELogo";
import { SteamLauncherData } from "@/types";
import { useScrollTimerCheck } from "@/hooks/scrollTimerCheck";

export default function FirstLaunchModal() {
    const [currentStep, setCurrentStep] = useState(0);
    const { setupModalActive, v1PrefsAvailable, v1Prefs, preferences: {initialSetupComplete} } = useContext(AppContext).context;
    const { setContext } = useContext(AppContext);
    const [importData, setImportData] = useState({
        deadforgeBackup: {
            prefsTransfered: false,
            backupImported: false,
            backupPath: "",
            isBackupValid: false
        },
        steam: {
            enabled: true,
            path: "C:\\Program Files (x86)\\Steam",
        },
        epic: {
            enabled: true,
            path: "C:\\ProgramData\\Epic\\EpicGamesLauncher\\Data\\Manifests",
        },
        itchio: {
            enabled: true,
            path: `C:\\Users\\${window.Process.username}\\AppData\\Roaming\\itch`,
        },
    });

    const [launcherData, setLauncherData] = useState({
        steam: { raw: null as SteamLauncherData | null | {}, gamesCount: 0 as number | null },
        epic: { raw: null as SteamLauncherData | null | {}, gamesCount: 0 as number | null },
        itchio: { raw: null as SteamLauncherData | null | {}, gamesCount: 0 as number | null },
    })

    const totalSteps = 4

    const finalConfirmationScrollRef = useRef<HTMLElement>(null);
    const { active: canFinish, reset } = useScrollTimerCheck(finalConfirmationScrollRef, currentStep === totalSteps, { mode: "both", firstTimer: 5000, returnTimer: 1500 });
    const inactiveClasses = "pointer-events-none scale-90", activeClasses = "pointer-events-auto scale-100",
        inactiveBackdropClasses = "pointer-events-none opacity-0", activeBackdropClasses = "pointer-events-auto opacity-100";

    const handleCheckboxChange = (platform: "steam" | "epic" | "itchio" | "v1Prefs" | "deadforgeBackup" | "deadforgeImportDisable") => {
        if (platform === "deadforgeImportDisable") {
            setImportData({
                ...importData,
                deadforgeBackup: {
                    ...importData.deadforgeBackup,
                    backupImported: false,
                    prefsTransfered: false,
                },
            })
        } else if (platform === "v1Prefs") {
            setImportData(prev => {return {
                ...prev,
                deadforgeBackup: {
                    ...prev.deadforgeBackup,
                    prefsTransfered: true,
                    backupImported: false,
                },
            }});
        } else if (platform === "deadforgeBackup") {
            setImportData(prev => {return {
                ...prev,
                deadforgeBackup: {
                    ...prev.deadforgeBackup,
                    prefsTransfered: false,
                    backupImported: true,
                },
            }});
        } else {
            setImportData({
                ...importData,
                [platform]: {
                    ...importData[platform],
                    enabled: !importData[platform].enabled,
                },
            });
        }
    };


    const handlePathChange = async (platform: "steam" | "epic" | "itchio" | "deadforgeBackup", path: string) => {
        if (platform === "deadforgeBackup") {
            setImportData({
                ...importData,
                deadforgeBackup: {
                    ...importData.deadforgeBackup,
                    backupPath: path,
                },
            })
        } else {
            setImportData({
                ...importData,
                [platform]: {
                    ...importData[platform],
                    path,
                },
            });
        }
        switch (platform) {
            case "steam": {
                const data: SteamLauncherData | null = await window.Electron.getSteamGamesData(path);
                console.log(data);
                setLauncherData(prev => {
                    return {
                        ...prev,
                        steam: {
                            raw: data,
                            gamesCount: data ? Object.keys(data.datasets).length : null
                        },
                    }
                });
                break;
            }

            case "epic": {
                const data: any | null = await window.Electron.getEpicGamesData(path);
                setLauncherData(prev => {
                    return {
                        ...prev,
                        epic: {
                            raw: data,
                            gamesCount: data ? Object.keys(data).length : null,
                        },
                    }
                });
                break;
            }

            case "itchio": {
                const data: any | null = await window.Electron.getItchGamesData(path);
                console.log(data);
                setLauncherData(prev => {
                    return {
                        ...prev,
                        itchio: {
                            raw: data,
                            gamesCount: data ? data.caves.length : null,
                        },
                    }
                });
                break;
            }

            case "deadforgeBackup": {
                const data = await window.Electron.validateBackup(path);
                console.log(data);
                setImportData(prev => {
                    return {
                        ...prev,
                        deadforgeBackup: {
                            ...prev.deadforgeBackup,
                            isBackupValid: data[0],
                        },
                    }
                });
                return (data[0])
            }
        }
    }

    useEffect(() => {
        handlePathChange("steam", importData.steam.path);
        handlePathChange("epic", importData.epic.path);
        handlePathChange("itchio", importData.itchio.path);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (setupModalActive) {
            setCurrentStep(0); reset();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [setupModalActive])

    const handleNext = () => {
        if (currentStep < totalSteps && !importData.deadforgeBackup.backupImported) {
            setCurrentStep(currentStep + 1)
        } else {
            setCurrentStep(totalSteps)
        }
    }

    const handleBack = () => {
        if (currentStep === 0) {
            setContext((prev: any) => { return { ...prev, setupModalActive: false } });
        } else if (currentStep > 0 && !importData.deadforgeBackup.backupImported) {
            setCurrentStep(currentStep - 1)
        } else {
            setCurrentStep(0)
        }
    }

    const handleFinish = async () => {
        const canProceed = !importData.deadforgeBackup.backupImported || await handlePathChange("deadforgeBackup", importData.deadforgeBackup.backupPath);
        if (!canProceed) return; else {
            setContext((prev: any) => { return { ...prev, preferences: { ...prev.preferences, initialSetupComplete: true }, setupModalActive: false } });
            window.Electron.onboardingFinished(importData);
        }
    }

    const preferencesCodeBlock = "singleLine text-nowrap group-has-[input:checked]:text-fullMoon transition-colors duration-100 ease-in-out";

    return (
        <div className={`fixed inset-0 bg-black/80 flex items-center justify-center z-40 transition-opacity duration-300 ease-in-out ${setupModalActive ? activeBackdropClasses : inactiveBackdropClasses}`}>
            <div className={`bg-notQuiteBlack text-fullMoon rounded-lg w-full max-w-2xl shadow-xl transition-transform duration-300 ease-in-out ${setupModalActive ? activeClasses : inactiveClasses}`}>
                <div className="p-6 pb-0 border-b border-night">
                    <h2 className="text-2xl font-uniSansCAPS">Welcome to <span className="font-bold">DEADFORGE</span></h2>
                    <p className="text-notQuiteWhite/80 font-montserrat mt-2">Let's import your data to get started</p>
                </div>

                <div className="p-6">
                    {/* Stepper */}
                    <div className="flex justify-between mb-8">
                        {Array.from({ length: totalSteps + 1 }).map((_, index) => (
                            <div key={index} className="flex items-center">
                                <div
                                    className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center font-montserrat",
                                        (currentStep >= index && (index === 0 || index === 4 || !importData.deadforgeBackup.backupImported)) ? "bg-progress text-fullMoon" : "bg-night text-notQuiteWhite/60",
                                    )}
                                >
                                    {(index < currentStep) ? ((index === 0 || !importData.deadforgeBackup.backupImported) ? <Check size={16} /> : <Minus size={16} />) : index + 1}
                                </div>
                                {index < totalSteps && (
                                    <div
                                        className={cn("h-1 w-[108px] mx-1", currentStep > index ? "bg-progress" : "bg-night")}
                                    />
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Content */}
                    <div className="min-h-[300px] flex flex-col">
                        {currentStep === 0 && (
                            <div className="flex flex-col flex-1 items-center justify-center min-h-full w-full space-y-6 text-center">
                                <h3 className="text-xl font-uniSansCAPS flex w-full gap-2 text-left">
                                    <DEADCODELogo />
                                    <span>
                                        <span className="font-bold">DEADFORGE</span> Data Import
                                    </span>
                                </h3>


                                <div className="flex flex-col flex-1 items-center justify-center min-h-full w-full">
                                <input type="radio" name="deadforgeImportData" checked={!(importData.deadforgeBackup.backupImported || importData.deadforgeBackup.prefsTransfered)} onChange={() => handleCheckboxChange("deadforgeImportDisable")} hidden />
                                    <div className="flex flex-col w-full items-center space-y-2 group">
                                        {v1PrefsAvailable ? (
                                            <><label className="flex items-center space-x-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="deadforgeImportData"
                                                    checked={importData.deadforgeBackup.prefsTransfered}
                                                    onChange={() => { return; }}
                                                    onClick={() => handleCheckboxChange(importData.deadforgeBackup.prefsTransfered ? "deadforgeImportDisable" : "v1Prefs")}
                                                    className="w-4 h-4 accent-progress color-white" />
                                                <span className="font-montserrat">
                                                    Import v1 preferences
                                                </span>
                                            </label><p className="text-xs font-montserrat text-zinc-400 *:text-zinc-400 whitespace-pre-wrap [&>span:has(code)]:before:content-['_']">
                                                    This includes your
                                                    <span><code className={preferencesCodeBlock}>{v1Prefs.colorScheme === "light" ? "Light" : "Dark"} Mode</code></span> preference,
                                                    <span><code className={preferencesCodeBlock}>{v1Prefs.startup ? "" : "No "}Launch at Startup</code></span> preference,
                                                    <span><code className={preferencesCodeBlock}>{v1Prefs.betaEnabled ? "" : "No "}Beta Updates</code></span> preference,
                                                    <span><code className={preferencesCodeBlock}>{v1Prefs.menubarCollapsed ? "Collapsed" : "Expanded"}</code></span> Sidebar state,
                                                    <span><code className={preferencesCodeBlock}>{v1Prefs.betaEnabled ? "" : "Don't "}Close to Tray</code></span> preference, and
                                                    <span><code className={preferencesCodeBlock}>{v1Prefs.betaEnabled ? "Use " : "Don't use "}Discord Rich Presence</code></span> preference.
                                                </p></>
                                        ) : (
                                            <span className="font-montserrat text-sm">No v1 preferences found</span>
                                        )}
                                    </div>

                                    <hr className="border-0 border-t border-solid border-neutral-500 my-4 w-full" />
                                    <div className="flex flex-col items-center space-y-4 w-full group">
                                        <label className="flex items-center space-x-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="deadforgeImportData"
                                                checked={importData.deadforgeBackup.backupImported}
                                                onChange={() => { return; }}
                                                onClick={() => { handleCheckboxChange(importData.deadforgeBackup.backupImported ? "deadforgeImportDisable" : "deadforgeBackup")}}
                                                className="w-4 h-4 accent-progress color-white" />
                                            <p className="text-sm font-montserrat">Import an app backup file (v2 backups only)</p></label>
                                        <div className="flex gap-2 w-full"><input
                                            type="text"
                                            value={importData.deadforgeBackup.backupPath}
                                            onChange={(e) => handlePathChange("deadforgeBackup", e.target.value)}
                                            disabled={!importData.deadforgeBackup.backupImported}
                                            className="flex-1 bg-night border border-night/60 group-has-[input[type=radio]:not(:checked)]:opacity-50 rounded px-3 py-2 font-consolas text-sm focus:outline-none focus:border-cornflowerBlue disabled:cursor-not-allowed"
                                            placeholder="Enter DeadForge Backup Archive file path"
                                        />
                                            <button
                                                className="bg-progress hover:bg-progress/80 text-fullMoon px-4 py-2 rounded font-montserrat disabled:opacity-50 disabled:cursor-not-allowed"
                                                disabled={!importData.deadforgeBackup.backupImported}
                                                onClick={async () => {
                                                    const { canceled, filePaths } = await window.Electron.showOpenDialog({
                                                        properties: ["openFile"],
                                                        filters: [
                                                            { name: "DeadForge Backup Archive", extensions: ["bak", "zip"] }
                                                        ]
                                                    });
                                                    if (!canceled) handlePathChange("deadforgeBackup", filePaths[0]);
                                                }}
                                            >
                                                Browse
                                            </button>
                                        </div>
                                        {(importData.deadforgeBackup.backupImported && importData.deadforgeBackup.backupPath.length ? (importData.deadforgeBackup.isBackupValid) ? (
                                            <span className="font-montserrat text-sm text-emerald-500">Yup, that backup looks good!</span>
                                        ) : (
                                            <span className="font-montserrat text-sm text-red-500">Uh oh! That doesn't look like a valid backup file.<br />You might have the wrong file path, or the file might be corrupted.</span>
                                        ) : <></>)}
                                    </div>
                                </div>
                            </div>
                        )}


                        {currentStep === 1 && (
                            <div className="space-y-6">
                                <h3 className="text-xl font-uniSansCAPS flex items-center gap-2">
                                    <SiSteam className="text-notQuiteBlack dark:text-notQuiteWhite" />
                                    Steam Import
                                </h3>

                                <div className="space-y-4">
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={importData.steam.enabled}
                                            onChange={() => handleCheckboxChange("steam")}
                                            className="w-4 h-4 accent-progress color-white"
                                        />
                                        <span className="font-montserrat">Import games from Steam</span>
                                    </label>

                                    <div className={cn("space-y-2", !importData.steam.enabled && "opacity-50")}>
                                        <label className="block font-montserrat text-sm">Steam installation directory</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={importData.steam.path}
                                                onChange={(e) => handlePathChange("steam", e.target.value)}
                                                disabled={!importData.steam.enabled}
                                                className="flex-1 bg-night border border-night/60 rounded px-3 py-2 font-consolas text-sm focus:outline-none focus:border-cornflowerBlue disabled:cursor-not-allowed"
                                                placeholder="Enter Steam directory path"
                                            />
                                            <button
                                                className="bg-progress hover:bg-progress/80 text-fullMoon px-4 py-2 rounded font-montserrat disabled:opacity-50 disabled:cursor-not-allowed"
                                                disabled={!importData.steam.enabled}
                                                onClick={async () => { const { canceled, filePaths } = await window.Electron.showOpenDialog({ defaultPath: importData.steam.path, properties: ["openDirectory"] }); if (!canceled) handlePathChange("steam", filePaths[0]) }}
                                            >
                                                Browse
                                            </button>
                                        </div>
                                        <div className="">
                                            {launcherData.steam.raw ? `Found ${launcherData.steam.gamesCount}${launcherData.steam.gamesCount === 1 ? " game" : " games"}` : (<><span className="text-red-500">Could not locate Steam installation data. Please ensure the path selected is correct.</span><br /><span>The correct path should have the Steam executable directly inside.</span></>)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {currentStep === 2 && (
                            <div className="space-y-6">
                                <h3 className="text-xl font-uniSansCAPS flex items-center gap-2">
                                    <SiEpicgames className="text-notQuiteBlack dark:text-notQuiteWhite" />
                                    Epic Games Import
                                </h3>

                                <div className="space-y-4">
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={importData.epic.enabled}
                                            onChange={() => handleCheckboxChange("epic")}
                                            className="w-4 h-4 accent-progress color-white"
                                        />
                                        <span className="font-montserrat">Import games from Epic Games</span>
                                    </label>

                                    <div className={cn("space-y-2", !importData.epic.enabled && "opacity-50")}>
                                        <label className="block font-montserrat text-sm">Epic Games apps data directory</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={importData.epic.path}
                                                onChange={(e) => handlePathChange("epic", e.target.value)}
                                                disabled={!importData.epic.enabled}
                                                className="flex-1 bg-night border border-night/60 rounded px-3 py-2 font-consolas text-sm focus:outline-none focus:border-cornflowerBlue disabled:cursor-not-allowed"
                                                placeholder="Enter Epic Games directory path"
                                            />
                                            <button
                                                className="bg-progress hover:bg-progress/80 text-fullMoon px-4 py-2 rounded font-montserrat disabled:opacity-50 disabled:cursor-not-allowed"
                                                disabled={!importData.epic.enabled}
                                                onClick={async () => {
                                                    const { canceled, filePaths } = await window.Electron.showOpenDialog(
                                                        { defaultPath: importData.epic.path, properties: ["openDirectory"] }
                                                    );
                                                    if (!canceled) handlePathChange("epic", filePaths[0]);
                                                }}
                                            >
                                                Browse
                                            </button>
                                        </div>
                                        <div>
                                            {launcherData.epic.raw ? (
                                                `Found ${launcherData.epic.gamesCount}${launcherData.epic.gamesCount === 1 ? " game" : " games"}`
                                            ) : (
                                                <>
                                                    <span className="text-red-500">
                                                        Could not locate Epic Games apps data. Please ensure the selected path is correct.
                                                    </span>
                                                    <br />
                                                    <span>
                                                        To find the correct folder:
                                                        <ol className="list-decimal list-inside mt-1 space-y-1">
                                                            <li>Open <b>Epic Games Launcher</b></li>
                                                            <li>Go to <b>Settings</b> → <b>Go to Download Settings</b> → Scroll down to <b>Advanced</b></li>
                                                            <li>Under <b>Fab Library Data Cache Directory</b>, you will see a path on your computer. The default value for this is <code className="singleLine text-nowrap">C:/ProgramData/Epic/EpicGamesLauncher/VaultCache</code></li>
                                                            <li>The <code className="singleLine text-nowrap">Manifests</code> folder is located one level up in <code className="singleLine text-nowrap">../Data/Manifests</code> by default. This can look like <code className="singleLine text-nowrap">C:/ProgramData/Epic/EpicGamesLauncher/Data/Manifests</code></li>
                                                        </ol>
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}


                        {currentStep === 3 && (
                            <div className="space-y-6">
                                <h3 className="text-xl font-uniSansCAPS flex items-center gap-2">
                                    <SiItchdotio className="text-notQuiteBlack dark:text-notQuiteWhite" />
                                    itch.io Import
                                </h3>

                                <div className="space-y-4">
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={importData.itchio.enabled}
                                            onChange={() => handleCheckboxChange("itchio")}
                                            className="w-4 h-4 accent-progress color-white"
                                        />
                                        <span className="font-montserrat">Import games from itch.io</span>
                                    </label>

                                    <div className={cn("space-y-2", !importData.itchio.enabled && "opacity-50")}>
                                        <label className="block font-montserrat text-sm">itch.io app data directory</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={importData.itchio.path}
                                                onChange={(e) => handlePathChange("itchio", e.target.value)}
                                                disabled={!importData.itchio.enabled}
                                                className="flex-1 bg-night border border-night/60 rounded px-3 py-2 font-consolas text-sm focus:outline-none focus:border-cornflowerBlue disabled:cursor-not-allowed"
                                                placeholder="Enter itch.io directory path"
                                            />
                                            <button
                                                className="bg-progress hover:bg-progress/80 text-fullMoon px-4 py-2 rounded font-montserrat disabled:opacity-50 disabled:cursor-not-allowed"
                                                disabled={!importData.itchio.enabled}
                                                onClick={async () => { const { canceled, filePaths } = await window.Electron.showOpenDialog({ defaultPath: importData.itchio.path, properties: ["openDirectory"] }); if (!canceled) handlePathChange("itchio", filePaths[0]) }}
                                            >
                                                Browse
                                            </button>
                                        </div>
                                        <div className="">
                                            {launcherData.itchio.raw ? `Found ${launcherData.itchio.gamesCount}${launcherData.itchio.gamesCount === 1 ? " game" : " games"}` : (<><span className="text-red-500">Could not locate itch installation data. Please ensure the path selected is correct.</span><br /><span>The correct path should have the itch executable directly inside.</span></>)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {currentStep === 4 && (
                            <div className="space-y-6">
                                <h3 className="text-xl font-uniSansCAPS flex items-center gap-2">
                                    <Goal className="text-success" />
                                    Ready to Import
                                </h3>

                                <div className="space-y-4">
                                    <p className="font-montserrat">We'll import your data from the following platforms:</p>

                                    <ul className="space-y-2 font-montserrat" ref={finalConfirmationScrollRef as any}>
                                        {importData.deadforgeBackup.prefsTransfered && (
                                            <li className="flex items-center gap-2">
                                                <DEADCODELogo className="text-lg" />
                                                <span>
                                                    <span className="font-bold font-uniSansCAPS">DEADFORGE</span> v1 Settings: <Check color="green" className="inline" /> Transfered
                                                </span>
                                            </li>
                                        )}
                                        {importData.deadforgeBackup.backupImported && importData.deadforgeBackup.backupPath && (
                                            <li className="flex items-center gap-2">
                                                <DEADCODELogo className="text-lg" />
                                                <span>
                                                    <span className="font-bold font-uniSansCAPS">DEADFORGE</span> v2 Backup: {importData.deadforgeBackup.isBackupValid ? (<><Check color="green" className="inline" /> Imported from</>) : (<><X color="red" className="inline" /> Backup not found at </>)} <code className="font-consolas text-xs singleLine">{importData.deadforgeBackup.backupPath}</code>
                                                </span>
                                            </li>
                                        )}
                                        {
                                            importData.deadforgeBackup.backupImported ? (importData.deadforgeBackup.isBackupValid ?(

                                                <p className="font-montserrat text-sm text-warning whitespace-pre-line">You are importing a DEADFORGE Backup Archive. This automatically skips any other setup steps, like importing Steam, Epic and itch paths.<br />You can revisit this setup again after the backup import is complete from <span className="whitespace-nowrap"><b>Settings</b> → <b>App Data & Updates</b> → <b>Initial Setup</b> → <b>Replay Setup</b></span>.</p>
                                            ) : <p className="font-montserrat text-sm text-danger whitespace-pre-line">It seems like your backup file has been deleted / moved since you selected it. Please, correct its path in the previous step before continuing.</p>) : (<>
                                                {importData.steam.enabled && launcherData.steam.raw && (
                                                    <li className="flex items-center gap-2">
                                                        <SiSteam size={18} className="text-notQuiteBlack dark:text-notQuiteWhite w-[21.58px]" />
                                                        <span>
                                                            Steam: {launcherData.steam.gamesCount + " game" + (launcherData.steam.gamesCount === 1 ? "" : "s")} from <code className="font-consolas text-xs singleLine">{importData.steam.path}</code>
                                                        </span>
                                                    </li>
                                                )}
                                                {importData.epic.enabled && launcherData.epic.raw && (
                                                    <li className="flex items-center gap-2">
                                                        <SiEpicgames size={18} className="text-notQuiteBlack dark:text-notQuiteWhite w-[21.58px]" />
                                                        <span>
                                                            Epic Games: {launcherData.epic.gamesCount + " game" + (launcherData.epic.gamesCount === 1 ? "" : "s")} from <code className="font-consolas text-xs singleLine">{importData.epic.path}</code>
                                                        </span>
                                                    </li>
                                                )}
                                                {importData.itchio.enabled && launcherData.itchio.raw && (
                                                    <li className="flex items-center gap-2">
                                                        <SiItchdotio size={18} className="text-notQuiteBlack dark:text-notQuiteWhite w-[21.58px]" />
                                                        <span>
                                                            itch.io: {launcherData.itchio.gamesCount + " game" + (launcherData.itchio.gamesCount === 1 ? "" : "s")} from <code className="font-consolas text-xs singleLine">{importData.itchio.path}</code>
                                                        </span>
                                                    </li>
                                                )}
                                            </>)
                                        }
                                        {!importData.steam.enabled && !importData.epic.enabled && !importData.itchio.enabled && (
                                            <li className="text-warning">No platforms selected for import</li>
                                        )}
                                    </ul>

                                    <p className="font-montserrat text-xs text-notQuiteWhite/70 whitespace-pre-line">
                                        {'Click "Finish" to start importing your games and data. The app will restart automatically.\nAdditional game library assets may be downloaded as part of the import process.\nThis process is fully automatic. Any updates to your imported libraries will be automatically processed, and their assets will also be downloaded in the future.'}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Navigation */}
                    <div className="flex justify-between mt-8 pt-4 border-t border-notQuiteBlack">
                        {currentStep !== 0 ? (
                            <button
                                onClick={handleBack}
                                disabled={currentStep === 0}
                                className="px-4 py-2 flex items-center gap-1 font-montserrat text-notQuiteWhite/80 hover:text-fullMoon disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft size={18} />
                                Back
                            </button>
                        ) : (
                            <button
                                onClick={handleBack}
                                disabled={!initialSetupComplete}
                                className="px-4 py-2 flex items-center gap-1 font-montserrat text-notQuiteWhite/80 hover:text-fullMoon disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <X size={18} />
                                Skip
                            </button>
                        )}

                        {currentStep < totalSteps ? (
                            <button
                                onClick={handleNext}
                                className="px-6 py-2 bg-progress hover:bg-progress/80 disabled:bg-night disabled:hover:bg-night opacity-100 disabled:opacity-50 disabled:cursor-not-allowed text-fullMoon rounded font-montserrat flex items-center gap-1 transition-[color,background-color,border-color,text-decoration-color,fill,stroke,opacity]"
                                disabled={(importData.deadforgeBackup.backupImported && !importData.deadforgeBackup.isBackupValid)}
                            >
                                Next
                                <ChevronRight size={18} />
                            </button>
                        ) : (
                            <button
                                onClick={handleFinish}
                                className="px-6 py-2 enabled:bg-success enabled:hover:bg-success/80 disabled:bg-night text-fullMoon transition-[color,background-color,border-color,text-decoration-color,fill,stroke,opacity] duration-200 ease-in-out disabled:opacity-75 disabled:cursor-wait rounded font-montserrat"
                                disabled={!canFinish}
                            >
                                Finish
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
