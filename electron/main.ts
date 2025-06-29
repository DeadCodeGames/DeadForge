import path from 'path'; /* import url from 'url'; */ import fs from 'fs'; import { spawn, ChildProcess, exec } from 'child_process';
import { app, BrowserWindow, dialog, Extension, ipcMain, nativeTheme, shell, Tray, protocol } from 'electron';
import { ExtensionReference, InstallExtensionOptions } from 'electron-devtools-installer';
import { Preferences, OldPreferences, defaultPreferences } from './preferences';
import * as SteamStuff from './mainHelpers/SteamStuff'; import * as EpicStuff from './mainHelpers/EpicStuff'; import * as ItchStuff from './mainHelpers/ItchStuff';
import { importBackup, exportBackup, validateBackup } from './mainHelpers/BackupStuff';
import { closeDB, getAllGamesFromDB, getAllDLCsFromDB, initUserDB, insertPathIntoDB, removePathFromDB, getAllGameJoinsFromDB, updateGameLastPlayed, getPathsFromDB, updateGamePlaytime, getAllCuratedAssetsFromDB, getAllCustomAssetsFromDB, checkIsDeadForgeGameInLibrary, DeadForgeGameObject, addDeadForgeGameToLocalLibrary, getGameMetrics } from './mainHelpers/DataDB';
import { initWatchers } from './mainHelpers/WatchManager';
import { Collection, CollectionGame, Collections, GameWarning, OldCollections } from './types';
import { waitForGameProcess, monitorExternalProcess } from './mainHelpers/ProcessWatcher';
import https from 'https';
import { selectCustomAsset, saveCustomAsset, updateLogoPosition } from './mainHelpers/CustomAssets';
import { updateArticles, getArticles } from './mainHelpers/ArticleManager';
import { handleProtocolUrl, registerProtocolHandler } from './mainHelpers/DeadForgeProtocolHandler';
import { handleDeadForgeUpdate } from './mainHelpers/Updater';
import { installDeadForgeGame, getGameDownloadSize } from './mainHelpers/GameInstallerAndUpdater';
const gotInstanceLock = app.requestSingleInstanceLock();
if (!gotInstanceLock) { app.exit(); }
const windowStateKeeper = require('electron-window-state');
// eslint-disable-next-line no-unused-vars
let installExtension: (extensionReference: ExtensionReference | string | Array<ExtensionReference | string>, options?: InstallExtensionOptions) => Promise<Extension[]>, REACT_DEVELOPER_TOOLS: ExtensionReference;

let mainWindow: BrowserWindow | null = null;
console.log(app.getPath("temp"))
export function notifyGamesUpdate() {
    if (mainWindow) {
        const games = getAllGamesFromDB();
        const dlcs = getAllDLCsFromDB();
        const gameJoins = getAllGameJoinsFromDB();
        const curatedAssets = getAllCuratedAssetsFromDB(), customAssets = getAllCustomAssetsFromDB();
        mainWindow.webContents.send('games:update', games, dlcs, gameJoins, curatedAssets, customAssets);
    }
}

export function getResourcePath(...parts: string[]) {
    const basePath = app.isPackaged
        ? path.join(path.dirname(app.getAppPath()), 'app.asar.unpacked', 'resources')
        : path.join(__dirname, '..', 'resources');

    const fullPath = path.join(basePath, ...parts);

    if (!fs.existsSync(fullPath)) {
        console.warn('Resource not found:', fullPath);
    }

    return fullPath;
}

if (!process.argv.find((s) => s === "--update-finished" || !app.isPackaged)) {
    handleDeadForgeUpdate().then(() => {
        app.relaunch({ args: process.argv.slice(1).concat(["--update-finished"]) });
        app.exit();
    })
} else if (process.argv.find((s) => s === "--reset-cleanup")) {
    fs.rmSync(path.join(app.getPath('userData'), 'db', 'user.sqlite3'), { force: true });
    fs.rmSync(path.join(app.getPath('userData'), 'preferences.json'), { force: true });
    fs.rmSync(path.join(app.getPath('userData'), 'collections.json'), { force: true });
    app.relaunch({ args: [...process.argv.slice(1).filter((s) => s !== "--reset-cleanup")] });
    app.exit();
} else {
    console.log("DeadForge is up-to-date. Starting...")
    if (!app.isPackaged) {
        ({ default: installExtension, REACT_DEVELOPER_TOOLS } = require('electron-devtools-installer'));
    }

    // Track running game processes
    const gameProcesses = new Map<string, ChildProcess | { pid: number, stopMonitoring: () => void, kill: () => void, isHelperWindow?: boolean }>();

    // Track game launch timestamps for playtime calculation
    const gameLaunchTimestamps = new Map<string, number>();

    let trayWindow: BrowserWindow | null = null;
    let settingsWindow: BrowserWindow | null = null;
    // eslint-disable-next-line prefer-const
    let notificationsWindow: BrowserWindow | null = null;
    let tray: Tray;
    let initialLoad = true;

    const FIRST_DEV_RUN = !app.isPackaged && Boolean(process.argv.find((s) => s === "--first-run"));

    let legacyPreferencesAvailable = false, legacyPreferences: OldPreferences;

    // eslint-disable-next-line no-unused-vars
    function migratePreferences(v1Prefs: OldPreferences, options?: { dryRun?: true }): undefined;
    // eslint-disable-next-line no-unused-vars
    function migratePreferences(v1Prefs: OldPreferences, options?: { dryRun?: false }): Preferences;
    function migratePreferences(v1Prefs: OldPreferences, options?: { dryRun?: boolean }): Preferences | undefined {
        const newPrefs: Preferences = { ...defaultPreferences };

        // Migrate known fields
        if (v1Prefs.colorScheme) newPrefs.theme = v1Prefs.colorScheme;
        if (typeof v1Prefs.menubarCollapsed === "boolean") newPrefs.sidebarCollapsed = v1Prefs.menubarCollapsed;
        if (typeof v1Prefs.closeToTray === "boolean") newPrefs.useTray = v1Prefs.closeToTray;
        if (typeof v1Prefs.startup === "boolean") newPrefs.autoStart = v1Prefs.startup;
        if (typeof v1Prefs.betaEnabled === "boolean") newPrefs.betaUpdates = v1Prefs.betaEnabled;

        legacyPreferences = v1Prefs;

        fs.writeFileSync(path.join(app.getPath("userData"), "preferences.v1.json"), JSON.stringify(v1Prefs));

        if (options?.dryRun) {
            fs.writeFileSync(path.join(app.getPath("userData"), "preferences.json"), JSON.stringify(defaultPreferences));
            legacyPreferencesAvailable = true;
            return;
        } else {
            fs.writeFileSync(path.join(app.getPath("userData"), "preferences.json"), JSON.stringify(newPrefs));
            legacyPreferencesAvailable = false;
            return newPrefs;
        }

    }

    function isOldPreferences(obj: OldPreferences | Preferences): obj is OldPreferences {
        return (
            typeof obj === 'object' &&
            'colorScheme' in obj &&
            'menubarCollapsed' in obj &&
            'closeToTray' in obj &&
            'startup' in obj &&
            'betaEnabled' in obj
        );
    }

    function isOldCollections(obj: OldCollections | Collections): obj is OldCollections {
        return (
            typeof obj === 'object' &&
            'favourites' in obj &&
            obj.favourites.every((f) => typeof f === 'string') &&
            'collections' in obj &&
            Object.values(obj.collections).every((c) => c.every((g: unknown) => typeof g === 'string'))
        );
    }

    let initialPrefs: Preferences | OldPreferences;
    let initialCollections: Collections | OldCollections;
    try {
        initialPrefs = JSON.parse(fs.readFileSync(path.join(app.getPath("userData"), "preferences.json"), { encoding: "utf-8" }));
        if (isOldPreferences(initialPrefs)) {
            migratePreferences(initialPrefs, { dryRun: true });
            initialPrefs = defaultPreferences;
        }
        initialCollections = JSON.parse(fs.readFileSync(path.join(app.getPath("userData"), "collections.json"), { encoding: "utf-8" }));
        if (isOldCollections(initialCollections)) {
            fs.renameSync(path.join(app.getPath("userData"), "collections.json"), path.join(app.getPath("userData"), "collections.v1.json"));
        }
    } catch (e) {
        console.log(e);
        initialPrefs = defaultPreferences;
    }


    const createTray = () => {
        tray = new Tray(path.join(__dirname, 'trayIcon.png'));
        let trayTimer: null | NodeJS.Timeout = null;
        const trayClickEvent = async () => {
            if (trayTimer) { clearTimeout(trayTimer); trayTimer = null; return; } else {
                await new Promise((resolve) => { trayTimer = setTimeout(() => { if (trayTimer === null) return; trayTimer = null; resolve(null) }, 500) });
            }
            if (!trayWindow) return;

            await new Promise<void>((resolve) => {
                ipcMain.once('tray:contentsHeightResponse', (event, height) => {
                    trayWindow!.setBounds({ height });
                    resolve();
                });

                trayWindow?.webContents.send('tray:getContentsHeight');
            });

            const { x, y } = tray.getBounds();
            const { height } = trayWindow.getBounds();

            // Simple tray positioner
            trayWindow.setPosition(x - 4, y - height - 8);
            if (trayWindow.isVisible()) {
                trayWindow.hide();
            } else {
                trayWindow.show();
            }
        }

        trayWindow?.webContents.openDevTools();

        tray.on('click', trayClickEvent);
        tray.on('right-click', trayClickEvent);

        tray.on('double-click', () => {
            clearTimeout(trayTimer!); trayTimer = null;
            mainWindow?.show();
            mainWindow?.restore();
            mainWindow?.focus();
        });
    }

    const createWindow = () => {
        const mainWindowState = windowStateKeeper({
            defaultHeight: 600,
            defaultWidth: 900,
            maximize: true,
            fullscreen: true
        })

        mainWindow = new BrowserWindow({
            minWidth: 1016,
            minHeight: 725,
            maxWidth: 3840,
            maxHeight: 2160,
            x: mainWindowState.x || undefined,
            y: mainWindowState.y || undefined,
            height: mainWindowState.height,
            width: mainWindowState.width,
            frame: false,
            titleBarStyle: 'hidden',
            icon: path.join(__dirname, 'windowIcon.png'),
            backgroundColor: '#0F0F0F',
            webPreferences: {
                preload: path.join(__dirname, 'preload.js'),
                nodeIntegration: true,
                contextIsolation: true,
                devTools: app.isPackaged ? false : true,
                webviewTag: true,
                additionalArguments: [`--isPackaged=${app.isPackaged}`, `--deadforgeVersion=${require('../package.json').version}`]
            }
        });

        mainWindowState.manage(mainWindow)
        if (!app.isPackaged) installExtension(REACT_DEVELOPER_TOOLS).then((ext) => Array.isArray(ext) ? ext.forEach(e => console.log(`Added Extension: ${e.name} (${e.id})`)) : console.log(`Added Extension: ${(ext as Extension).name!} (${(ext as Extension).id})`)).catch((err: Error) => console.log('An error occurred: ', err));
        mainWindow?.loadURL(app.isPackaged ? `file://${path.join(__dirname, "../build/index.html")}#/${initialPrefs.defaultPage || ""}` : `http://localhost:3000#/${initialPrefs.defaultPage || ""}`);

        mainWindow.on('closed', () => {
            mainWindow = null;
        });

        mainWindow.webContents.on('dom-ready', () => {
            const deadforgeURL = process.argv.find(item => item.startsWith("deadforge://"))
            if (deadforgeURL) {
                handleProtocolUrl(deadforgeURL, mainWindow)
            }
        })

        mainWindow.webContents.on("did-navigate", () => {
            if (!initialLoad) {
                app.relaunch();
                app.quit()
            } else {
                initialLoad = false;
            }
        });

        mainWindow!.webContents.setWindowOpenHandler(({ url }) => {
            console.log("window open handler", url)
            shell.openExternal(`https://deadcode.is-a.dev/DeadForgeRedirect?url=${encodeURIComponent(url)}`);
            return { action: 'deny' as const };
        });
    };

    protocol.registerSchemesAsPrivileged([
        {
            scheme: 'local',
            privileges: {
                standard: true,
                supportFetchAPI: true,
                secure: true,
                corsEnabled: true,
                bypassCSP: true
            }
        }
    ]);

    function getFallbackFilePath(fallback: string, filePath: string, delocalized?: string) {
        const fallbackMap: Record<string, string> = {
            defaultIcon: path.join(__dirname, 'windowIcon.png'),
            delocalized: (() => {
                if (!filePath) return '';

                const parsedPath = path.parse(filePath);
                const fileName = parsedPath.name + parsedPath.ext;

                const languageSuffixes = Object.values(SteamStuff.steamLanguageMap);

                for (const suffix of languageSuffixes) {
                    const suffixPattern = `_${suffix}`;
                    if (fileName.includes(suffixPattern) &&
                        (fileName.endsWith(suffixPattern) ||
                            fileName.indexOf(suffixPattern) + suffixPattern.length < fileName.length)) {
                        const baseFileName = fileName.replace(suffixPattern, '');
                        if (fs.existsSync(path.join(parsedPath.dir, baseFileName))) { return path.join(parsedPath.dir, baseFileName) };
                    }
                }

                if (delocalized) {
                    let delocalizedFilePath: string;
                    if (process.platform === 'win32') {
                        const hostAndPath = delocalized + (delocalized || '');
                        if (hostAndPath.length > 0 && hostAndPath[1] === '/') {
                            delocalizedFilePath = hostAndPath[0] + ':' + hostAndPath.substring(1);
                        } else {
                            delocalizedFilePath = delocalized;
                        }
                    } else {
                        delocalizedFilePath = delocalized;
                    }

                    delocalizedFilePath = decodeURIComponent(delocalizedFilePath);
                    return delocalizedFilePath;
                }

                return filePath;
            })()
        };

        return fallbackMap[fallback] || '';
    }


    // Add this helper function for registering the local protocol
    function registerLocalProtocol() {
        protocol.handle('local', (request) => {
            const url = new URL(request.url.replace("local://const_userdata", "local://" + app.getPath("userData")).replace(/\\/g, "/"));
            try {
                let filePath: string;
                if (process.platform === 'win32') {
                    const hostAndPath = url.hostname + (url.pathname || '');
                    if (hostAndPath.length > 0 && hostAndPath[1] === '/') {
                        filePath = hostAndPath[0] + ':' + hostAndPath.substring(1);
                    } else {
                        filePath = url.pathname;
                    }
                } else {
                    filePath = url.pathname;
                }

                filePath = decodeURIComponent(filePath);

                if (!(fs.existsSync(filePath) && fs.lstatSync(filePath).isFile())) {
                    console.error(`File not found: ${filePath}`);

                    const fallback = url.searchParams.get('fallback');
                    const delocalized = url.searchParams.get('delocalized') || undefined;
                    if (fallback) {
                        const fallbackPath = getFallbackFilePath(fallback, filePath, delocalized);

                        if (fs.existsSync(fallbackPath)) {
                            console.log("fallback exists", fallbackPath)
                            console.log(`Serving fallback: ${fallbackPath}`);
                            const data = fs.readFileSync(fallbackPath);
                            const mimeType = getMimeType(fallbackPath);

                            return new Response(data, {
                                headers: {
                                    'Content-Type': mimeType,
                                    'Access-Control-Allow-Origin': '*'
                                }
                            });
                        } else {
                            console.error(`Fallback file not found: ${fallbackPath}`);
                        }
                    }

                    return new Response(null, { status: 404 });
                }
                const data = fs.readFileSync(filePath);
                const mimeType = getMimeType(filePath);

                return new Response(data, {
                    headers: {
                        'Content-Type': mimeType,
                        'Access-Control-Allow-Origin': '*'
                    }
                });
            } catch (error) {
                console.error('Error serving file from local protocol:', error, url.href);
                return new Response(null, { status: 500 });
            }
        });
    }

    // Handle protocol URLs when app is already running
    app.on('second-instance', (event, commandLine) => {
        // Look for protocol URL in command line arguments
        const url = commandLine.find(arg => arg.startsWith('deadforge://'));
        if (url) {
            handleProtocolUrl(url, mainWindow);
        }
        mainWindow?.show();
        mainWindow?.focus();
    });

    app.whenReady().then(async () => {
        registerProtocolHandler();
        registerLocalProtocol();
        initUserDB();
        initWatchers();
        await new Promise((resolve) => setTimeout(() => {
            if (FIRST_DEV_RUN) {
                console.warn("Sometimes, during development, the development server starts way too late, and the window page is an error instead.");
                console.warn("This ̶s̶h̶o̶u̶l̶d̶ ̶n̶o̶t̶ ̶b̶e̶ is not an issue in prod, but is annoying in dev.");
                console.warn("While refreshing the main window fixes it, you cannot really refresh the tray window because of how the IPC flow was designed.");
                console.warn("For this reason, there is a 2.5s delay before creating the windows on the first launch during dev. Any further refreshes caused by editing files in the electron/ folder have a delay of 0.");
            }
            createWindow();
            createTrayWindow();
            resolve(null);
        }, !FIRST_DEV_RUN ? 0 : 2500));

        if (initialPrefs.useTray) createTray();
    });

    // Quit when all windows are closed (except on macOS)
    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
            app.quit();
        }
    });

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });

    // IPC handlers
    ipcMain.handle('window:minimize', () => {
        mainWindow?.minimize();
    });

    ipcMain.handle('window:maximize', () => {
        if (!mainWindow) return;
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow.maximize();
        }
    });

    ipcMain.handle('window:isMaximized', () => {
        return mainWindow?.isMaximized() ?? false;
    });

    ipcMain.handle('window:close', () => {
        if (trayWindow) {
            mainWindow?.hide();
        } else {
            mainWindow?.close();
        }
    });

    // Theme mode
    ipcMain.handle('theme:get', () => {
        return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
    });

    /* <--------------------------- Tray --------------------------------> */

    const createTrayWindow = () => {
        trayWindow = new BrowserWindow({
            width: 240,
            height: 300,
            show: false,
            frame: false,
            resizable: false,
            skipTaskbar: true,
            alwaysOnTop: true,
            transparent: true,
            roundedCorners: true,
            fullscreenable: false,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: true,
                devTools: app.isPackaged ? false : true,
                preload: path.join(__dirname, 'tray.preload.js'),
            }
        });

        const trayURL = app.isPackaged
            ? `file://${path.join(__dirname, "../build/index.html")}#/tray`
            : "http://localhost:3000#/tray";

        setTimeout(() => trayWindow?.loadURL(trayURL), 1000);

        trayWindow.on('blur', () => trayWindow?.hide());
        trayWindow.on('closed', () => (trayWindow = null));

        type trayChoice = {
            type: 'exit'
        } | {
            type: 'navigate',
            destination: string
        } | {
            type: 'launch',
            source: string,
            gameId: string,
            executable: string,
            arguments: string | string[]
        } | {
            type: 'stop',
            source: string,
            gameId: string
        }

        ipcMain.on("tray:choice", (event: Electron.IpcMainEvent, choice: trayChoice) => {
            trayWindow?.hide()
            if (choice.type === 'exit') app.quit();
            else if (choice.type === 'navigate') {
                mainWindow?.webContents.send("tray:navigate", choice.destination);
                mainWindow?.show();
                mainWindow?.focus();
            }
            else if (choice.type === 'launch') {
                mainWindow?.webContents.send("game:trayLaunch", choice.source, choice.gameId, choice.executable, choice.arguments);
            }
            else if (choice.type === 'stop') {
                mainWindow?.webContents.send("game:trayStop", choice.source, choice.gameId);
            }
        })

        ipcMain.on("tray:resize", (event: Electron.IpcMainEvent, width: number, height: number) => {
            trayWindow?.setBounds({ width, height });
        });
    };

    /* <------------------------- Settings ------------------------------> */

    const createSettingsWindow = () => {
        if (settingsWindow) {
            settingsWindow.show();
            settingsWindow.focus();
            return;
        }

        settingsWindow = new BrowserWindow({
            minWidth: 700,
            minHeight: 450,
            height: 1000,
            width: 750,
            frame: false,
            titleBarStyle: 'hidden',
            icon: path.join(__dirname, 'windowIcon.png'),
            backgroundColor: '#0F0F0F',
            webPreferences: {
                preload: path.join(__dirname, 'settings.preload.js'),
                nodeIntegration: true,
                contextIsolation: true,
                devTools: app.isPackaged ? false : true,
                additionalArguments: [`--isPackaged=${app.isPackaged}`]
            }
        });

        settingsWindow?.loadURL(app.isPackaged ? `file://${path.join(__dirname, "../build/index.html")}#/settings` : `http://localhost:3000#/settings`);
        if (!app.isPackaged) installExtension(REACT_DEVELOPER_TOOLS).then((ext) => Array.isArray(ext) ? ext.forEach(e => console.log(`Added Extension: ${e.name} (${e.id})`)) : console.log(`Added Extension: ${(ext as Extension).name!} (${(ext as Extension).id})`)).catch((err: Error) => console.log('An error occurred: ', err));

        settingsWindow.on('closed', () => {
            settingsWindow = null;
        });
    };

    // IPC handlers
    ipcMain.handle('settings:minimize', () => {
        settingsWindow?.minimize();
    });

    ipcMain.handle('settings:maximize', () => {
        if (!settingsWindow) return;
        if (settingsWindow.isMaximized()) {
            settingsWindow.unmaximize();
        } else {
            settingsWindow.maximize();
        }
    });

    ipcMain.handle('settings:isMaximized', () => {
        return settingsWindow?.isMaximized() ?? false;
    });

    ipcMain.handle('settings:close', () => {
        settingsWindow?.close();
    });

    ipcMain.handle('preferences:get', () => {
        let preferences: Preferences;
        try {
            preferences = JSON.parse(fs.readFileSync(path.join(app.getPath('userData'), 'preferences.json'), 'utf-8'));
            if (fs.existsSync(path.join(app.getPath('userData'), 'preferences.v1.json'))) {
                legacyPreferencesAvailable = true;
                legacyPreferences = JSON.parse(fs.readFileSync(path.join(app.getPath('userData'), 'preferences.v1.json'), 'utf-8'));
            }
            if (isOldPreferences(preferences)) {
                migratePreferences(preferences, { dryRun: true });
                preferences = defaultPreferences;
            }
        } catch {
            preferences = defaultPreferences;
        }
        return { preferences, v1PrefsAvailable: legacyPreferencesAvailable || fs.existsSync(path.join(app.getPath('userData'), 'preferences.v1.json')), v1Prefs: legacyPreferences };
    });

    ipcMain.handle('preferences:set', (event: Electron.IpcMainInvokeEvent, newPreferences: Preferences, isSettingsOpen: boolean, fromSettingsWindow?: boolean) => {
        fs.writeFileSync(path.join(app.getPath('userData'), 'preferences.json'), JSON.stringify(newPreferences));
        if (!trayWindow && newPreferences.useTray) {
            createTrayWindow();
            createTray();
        }
        else if (trayWindow && !newPreferences.useTray) {
            trayWindow?.destroy();
            trayWindow = null;
            tray?.destroy();
        }
        if (newPreferences.autoStart && !app.getLoginItemSettings().openAtLogin) {
            app.setLoginItemSettings({ openAtLogin: true });
        } else if (!newPreferences.autoStart && app.getLoginItemSettings().openAtLogin) {
            app.setLoginItemSettings({ openAtLogin: false });
        }
        if (settingsWindow && fromSettingsWindow) {
            mainWindow?.webContents.send('preferences:update', newPreferences);
        }
        trayWindow?.webContents.send('preferences:update', newPreferences);
        if (newPreferences.useSettingsWindow && !settingsWindow && isSettingsOpen) {
            createSettingsWindow();
        } else if (!newPreferences.useSettingsWindow && settingsWindow) {
            settingsWindow?.destroy();
            settingsWindow = null;
            mainWindow!.webContents.send('tray:choice', { type: 'navigate', destination: '/settings' });
        }
    });

    ipcMain.on('window:openSettingsWindow', createSettingsWindow)

    ipcMain.handle('app:reload', () => {
        app.relaunch(); app.exit(0)
    });

    ipcMain.handle("dialog:showOpenDialog", async (event, options) => {
        const window = BrowserWindow.getFocusedWindow()
        if (!window) {
            return { canceled: true, filePaths: [] }
        }

        return await dialog.showOpenDialog(window, options)
    })

    ipcMain.handle('steam:getGamesData', async (_, SteamPath: string) => {
        return await SteamStuff.getInstalledSteamGames(path.join(SteamPath, 'appcache', 'appinfo.vdf'), path.join(SteamPath, 'steamapps', 'libraryfolders.vdf'));
    })

    ipcMain.handle('epic:getGamesData', (_, manifestsDir: string) => {
        return EpicStuff.getInstalledEpicGames(manifestsDir);
    });

    ipcMain.handle('itch:getGamesData', (_, itchAppDir: string) => {
        return ItchStuff.readItchDB(path.join(itchAppDir, "db", "butler.db"));
    })

    ipcMain.handle('backup:export', async (): Promise<string | { canceled: true }> => {
        const window = BrowserWindow.getFocusedWindow()
        if (!window) {
            return { canceled: true }
        }

        const selectResult = await dialog.showSaveDialog(window, { defaultPath: path.join(app.getPath('downloads'), 'deadforge_backup.bak'), filters: [{ name: 'DeadForge Backup Archive', extensions: ['bak', 'zip'] }] });

        const result = exportBackup(selectResult.filePath).then(r => { return r }, e => { console.log(e); return { canceled: true as const } });
        return result;
    })

    ipcMain.handle('backup:import', async (): Promise<[string, Preferences] | { canceled: true }> => {
        const window = BrowserWindow.getFocusedWindow();
        if (!window) {
            return { canceled: true }
        }

        const selectResult = await dialog.showOpenDialog(window, { properties: ['openFile'], filters: [{ name: 'DeadForge Backup Archive', extensions: ['bak', 'zip'] }] });
        if (selectResult.filePaths.length === 0) { return { canceled: true } }

        // send request to main window for confirmation

        return await importBackup(selectResult.filePaths[0]);
    })

    ipcMain.handle('backup:validate', async (_, path: string): Promise<[true, Preferences] | [false, Record<never, never>]> => {
        const data = await validateBackup(path);
        return data;
    })

    ipcMain.handle('onboarding:finished', async (_, data) => {
        if (data.deadforgeBackup.backupImported && await validateBackup(data.deadforgeBackup.backupPath)) {
            importBackup(data.deadforgeBackup.backupPath);
        } else {
            if (data.deadforgeBackup.prefsTransfered && legacyPreferencesAvailable) {
                migratePreferences(
                    JSON.parse(fs.readFileSync(path.join(app.getPath('userData'), 'preferences.v1.json'), 'utf-8')) as OldPreferences,
                    { dryRun: false }
                );
            };

            // Steam
            if (data.steam.enabled && await SteamStuff.getInstalledSteamGames(path.join(data.steam.path, 'appcache', 'appinfo.vdf'), path.join(data.steam.path, 'steamapps', 'libraryfolders.vdf'))) {
                insertPathIntoDB('steam', data.steam.path);
            } else {
                removePathFromDB('steam');
            }

            // Epic Games
            if (data.epic.enabled) {
                const hasValidData = EpicStuff.getInstalledEpicGames(data.epic.dataPath);
                const hasValidExe = validateEpicExecutable(data.epic.executablePath);

                if (hasValidData && hasValidExe) {
                    insertPathIntoDB('epic_data', data.epic.dataPath);
                    insertPathIntoDB('epic_exe', data.epic.executablePath);
                } else {
                    removePathFromDB('epic_data');
                    removePathFromDB('epic_exe');
                }
            } else {
                removePathFromDB('epic_data');
                removePathFromDB('epic_exe');
            }

            // itch.io
            if (data.itchio.enabled) {
                const hasValidData = await ItchStuff.readItchDB(path.join(data.itchio.dataPath, "db", "butler.db"));
                const resolvedExePath = findItchExecutable(data.itchio.executablePath);

                if (hasValidData && resolvedExePath) {
                    insertPathIntoDB('itchio_data', data.itchio.dataPath);
                    insertPathIntoDB('itchio_exe', data.itchio.executablePath);
                } else {
                    removePathFromDB('itchio_data');
                    removePathFromDB('itchio_exe');
                }
            } else {
                removePathFromDB('itchio_data');
                removePathFromDB('itchio_exe');
            }
        }
    })

    app.on('before-quit', () => {
        // Save playtime for any running games before quitting
        gameLaunchTimestamps.forEach((launchTime, key) => {
            const [client, gameId] = key.split('-');
            updatePlaytimeOnGameExit(client, gameId);
        });

        closeDB();
    });

    ipcMain.handle('games:fetch', () => {
        return [getAllGamesFromDB(), getAllDLCsFromDB(), getAllGameJoinsFromDB(), getAllCuratedAssetsFromDB(), getAllCustomAssetsFromDB()];
    });

    /**
     * Launches a game and updates its lastPlayed timestamp
     */
    ipcMain.handle('game:launch', async (_, client: string, gameId: string | number, executable: string, args: string | string[], pollInterval = 1000) => {
        try {
            console.log(`Launching game ${gameId} from ${client}`);
            console.log(`Executable: ${executable}`);
            console.log(`Arguments: ${Array.isArray(args) ? args.join(' ') : args}`);

            let resolvedExecutable = executable;

            // Handle HTML files
            if (executable.toLowerCase().endsWith('.html')) {
                const resolveLocalURL = (url?: string) => {
                    if (!url) return undefined;
                    console.log(url);
                    if (url.startsWith("%USERDATA%")) {
                        return url.replace("%USERDATA%", app.getPath('userData'));
                    }
                    return url;
                }
                const gameWindow = new BrowserWindow({
                    width: 1280,
                    height: 720,
                    icon: resolveLocalURL(getAllGamesFromDB().find(g => g.source === client && String(g.id) === String(gameId))?.media?.iconUrl),
                    webPreferences: {
                        nodeIntegration: false,
                        contextIsolation: true,
                        webSecurity: true
                    }
                });
                gameWindow.setAutoHideMenuBar(false);
                gameWindow.setMenuBarVisibility(false);

                // Load the HTML file
                await gameWindow.loadFile(executable);

                const key = `${client}-${gameId}`;
                gameProcesses.set(key, {
                    pid: gameWindow.webContents.getOSProcessId(),
                    stopMonitoring: () => { },
                    kill: () => gameWindow.close(),
                    isHelperWindow: true
                });
                gameLaunchTimestamps.set(key, Math.floor(Date.now() / 1000));

                // Handle window close
                gameWindow.on('closed', () => {
                    updatePlaytimeOnGameExit(client, gameId);
                    gameProcesses.delete(key);
                    mainWindow?.webContents.send('game:processTerminated', client, gameId);
                });

                updateGameLastPlayed(client, gameId);
                notifyGamesUpdate();
                return { success: true };
            }

            if (client === 'itch' && String(gameId) === '-1' && executable.endsWith('CONST_ITCHEXEC')) {
                const basePath = path.dirname(executable);
                const resolvedPath = findItchExecutable(basePath);
                if (!resolvedPath) {
                    throw new Error('Could not resolve itch.io executable path');
                }
                resolvedExecutable = resolvedPath;
            } else if (client === 'steam' && String(gameId) !== '-1') {
                const steamPath = getPathsFromDB('steam');
                if (!steamPath) {
                    throw new Error('Steam path not found');
                }
                resolvedExecutable = path.join(steamPath, 'steam.exe');
                args = args.length > 0 ? (Array.isArray(args) ? [`steam://run/${gameId}//'${args.join(" ")}'`] : [`steam://run/${gameId}//'${args}'`]) : [`steam://run/${gameId}`];
            }

            const child = spawn(resolvedExecutable, Array.isArray(args) ? args : [args], {
                detached: true,
                stdio: 'ignore'
            });

            child.unref();

            const key = `${client}-${gameId}`;
            gameProcesses.set(key, child);

            // Store launch timestamp for playtime tracking
            gameLaunchTimestamps.set(key, Math.floor(Date.now() / 1000));

            // Only wait for real game process for Steam
            if (client === 'steam' && String(gameId) !== '-1') {
                const found = await waitForGameProcess(executable, pollInterval);

                if (found) {
                    console.log(`Tracking actual game process: ${found.name} (pid ${found.pid})`);

                    try {
                        const monitor = monitorExternalProcess(found.pid, () => {
                            console.log(`Game process ${found.name} (pid ${found.pid}) exited`);

                            // Calculate and update playtime when game exits
                            updatePlaytimeOnGameExit(client, gameId);

                            gameProcesses.delete(key);
                            mainWindow?.webContents.send('game:processTerminated', client, gameId);
                        });

                        // Store the monitor reference to be able to stop monitoring later if needed
                        gameProcesses.set(key, {
                            pid: found.pid, stopMonitoring: monitor.stop, kill: () => {
                                monitor.stop();
                                process.kill(found.pid);
                            }
                        });
                    } catch (err) {
                        console.warn('Could not track real game process:', err);
                    }
                }
            } else {
                child.on('exit', async (code, signal) => {
                    console.log(`Game ${gameId} from ${client} process exited with code ${code} and signal ${signal}`);

                    // Grace period logic for executablesToWatch
                    const games = getAllGamesFromDB();
                    const gameData = games.find(g => g.source === client && String(g.id) === String(gameId));
                    let executablesToWatch: string[] | undefined = undefined;
                    let installPath: string | undefined = undefined;
                    if (gameData) {
                        // Try to get executablesToWatch from curated assets first
                        const curatedAssets = getAllCuratedAssetsFromDB();
                        const curated = curatedAssets.find(a => a.source === client && String(a.id) === String(gameId));
                        if (curated && curated.executablesToWatch) {
                            try {
                                executablesToWatch = typeof curated.executablesToWatch === 'string' ? JSON.parse(curated.executablesToWatch) : curated.executablesToWatch;
                            } catch { executablesToWatch = curated.executablesToWatch; }
                        }
                        // Fallback to custom assets if needed (not implemented here)
                        installPath = gameData.installPath;
                    }

                    if (executablesToWatch && executablesToWatch.length > 0 && installPath) {
                        // Substitute %GAMEROOT% with installPath
                        const watchedExecutables = executablesToWatch.map(e => e.replace(/%GAMEROOT%/g, installPath!));
                        const { areAnyExecutablesRunning, findRunningExecutableProcess, monitorExternalProcess } = require('./mainHelpers/ProcessWatcher');
                        const gracePeriod = 3000;
                        const interval = 500;
                        let elapsed = 0;
                        let graceTimeout: NodeJS.Timeout | null = null;
                        let monitoring = false;
                        const tryMonitorNewProcess = async () => {
                            const proc = await findRunningExecutableProcess(watchedExecutables);
                            if (proc) {
                                // Update gameProcesses for this game
                                gameProcesses.set(key, {
                                    pid: proc.pid,
                                    stopMonitoring: () => {}, // Will be set below
                                    kill: () => { try { process.kill(proc.pid); } catch {} },
                                });
                                // Start monitoring this process
                                const monitor = monitorExternalProcess(proc.pid, () => {
                                    // When this process exits, re-run the grace period logic
                                    monitoring = false;
                                    startGracePeriod();
                                });
                                // Update stopMonitoring
                                const entry = gameProcesses.get(key);
                                if (entry && typeof entry === 'object' && !(entry instanceof ChildProcess)) entry.stopMonitoring = monitor.stop;
                                monitoring = true;
                            }
                        };
                        const startGracePeriod = () => {
                            elapsed = 0;
                            if (graceTimeout) clearTimeout(graceTimeout);
                            // Notify UI that we're checking if the game is really closed
                            mainWindow?.webContents.send('game:status', client, gameId, 'checking');
                            const checkAndMaybeClose = async () => {
                                const anyRunning = await areAnyExecutablesRunning(watchedExecutables);
                                if (anyRunning) {
                                    // If any are running, try to monitor the new process if not already
                                    if (!monitoring) {
                                        await tryMonitorNewProcess();
                                        // Notify UI that the game is running again
                                        mainWindow?.webContents.send('game:status', client, gameId, 'running');
                                    }
                                    return; // Do not mark as closed
                                }
                                elapsed += interval;
                                if (elapsed < gracePeriod) {
                                    graceTimeout = setTimeout(checkAndMaybeClose, interval);
                                } else {
                                    // After grace period, if none are running, mark as closed
                                    updatePlaytimeOnGameExit(client, gameId);
                                    gameProcesses.delete(key);
                                    mainWindow?.webContents.send('game:processTerminated', client, gameId);
                                    mainWindow?.webContents.send('game:status', client, gameId, 'closed');
                                }
                            };
                            graceTimeout = setTimeout(checkAndMaybeClose, interval);
                        };
                        startGracePeriod();
                    } else {
                        // Calculate and update playtime when game exits (original logic)
                        updatePlaytimeOnGameExit(client, gameId);
                        gameProcesses.delete(key);
                        mainWindow?.webContents.send('game:processTerminated', client, gameId);
                    }
                });
            }

            updateGameLastPlayed(client, gameId);
            notifyGamesUpdate();
            return { success: true };
        } catch (error: unknown) {
            console.error('Error launching game:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    });

    /**
     * Updates the playtime of a game when it exits
     */
    function updatePlaytimeOnGameExit(client: string, gameId: string | number) {
        const key = `${client}-${gameId}`;
        const launchTimestamp = gameLaunchTimestamps.get(key);

        if (launchTimestamp) {
            const currentTime = Math.floor(Date.now() / 1000);
            const playedSeconds = Math.max(0, currentTime - launchTimestamp);

            if (playedSeconds > 5) { // Only count sessions longer than 5 seconds
                console.log(`Game ${gameId} from ${client} played for ${playedSeconds} seconds`);
                updateGameLastPlayed(client, gameId);
                updateGamePlaytime(client, gameId, playedSeconds);
            }

            gameLaunchTimestamps.delete(key);
        }
    }

    /**
     * Kills a process by its executable name
     */
    async function killProcess(client: string, gameId: string | number, executablePath: string): Promise<{ success: boolean, error?: string }> {
        const executableName = path.basename(executablePath);

        return new Promise((resolve) => {
            if (process.platform === 'win32') {
                // On Windows, use taskkill to kill the process by image name
                exec(`taskkill /IM "${executableName}" /F /T`, (error) => {
                    if (error) {
                        console.error('Error killing process:', error);
                        resolve({ success: false, error: error.message });
                        return;
                    }
                });
                console.log('Process killed successfully');
                mainWindow?.webContents.send('game:processTerminated', client, gameId);
                resolve({ success: true });
            } else {
                // On Unix-like systems, find the PID using ps and kill it
                exec(`pkill -9 "${executableName}"`, (error) => {
                    if (error && error.code !== 1) {
                        console.error('Error killing process:', error);
                        resolve({ success: false, error: error.message });
                        return;
                    }
                });
                console.log('Process killed successfully');
                resolve({ success: true });
            }
        });
    }

    /**
     * Stops a running game process
     */
    ipcMain.handle('game:stop', async (_, client: string, gameId: string | number) => {
        try {
            const key = `${client}-${gameId}`;

            // Calculate and update playtime when game is stopped manually
            updatePlaytimeOnGameExit(client, gameId);

            // First try to stop the process if we're tracking it
            const childProcess = gameProcesses.get(key);
            if (childProcess) {
                if (!(childProcess instanceof ChildProcess) && childProcess.isHelperWindow) {
                    childProcess.kill();
                }
                if (process.platform === 'win32') {
                    if (childProcess.pid) {
                        spawn('taskkill', ['/pid', childProcess.pid.toString(), '/f', '/t']);
                    }
                } else {
                    childProcess.kill();
                }
                return { success: true };
            }

            // If we're not tracking it, try to find and kill it by executable name
            const games = getAllGamesFromDB();
            const gameData = games.find(g => g.source === client && String(g.id) === String(gameId));

            if (gameData?.launchOptions) {
                try {
                    const launchOptions = JSON.parse(gameData.launchOptions as any as string);
                    if (launchOptions[0]?.executable) {
                        const killed = await killProcess(client, gameId, launchOptions[0].executable);
                        return { success: killed };
                    }
                } catch (error) {
                    console.error('Error parsing launch options:', error);
                    return { success: false, error: 'Failed to parse launch options' };
                }
            }

            return { success: false, error: 'Game process not found' };
        } catch (error: unknown) {
            console.error('Error stopping game:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    });

    /**
     * Checks if a process with the given executable name is running
     */
    /* async function isProcessRunning(executablePath: string): Promise<boolean> {
        const executableName = path.basename(executablePath);
    
        return new Promise((resolve, reject) => {
            if (process.platform === 'win32') {
                const process = spawn('tasklist', ['/FI', `IMAGENAME eq ${executableName}`, '/NH']);
                let stdout = '';
                let stderr = '';
    
                process.stdout.on('data', (data) => {
                    stdout += data.toString();
                });
    
                process.stderr.on('data', (data) => {
                    stderr += data.toString();
                });
    
                process.on('close', (code) => {
                    if (code === 0) {
                        resolve(stdout.toLowerCase().includes(executableName.toLowerCase()));
                    } else {
                        console.error('Error checking process (tasklist):', stderr.trim());
                        resolve(false); // Resolve with false on error, or you could reject
                    }
                });
    
                process.on('error', (err) => {
                    console.error('Failed to run tasklist:', err);
                    reject(false);
                });
            } else {
                // On Unix-like systems, use ps and grep with separate arguments
                const process = spawn('pgrep', ['-x', executableName]); // '-x' matches the exact name
                // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
                let stdout = '';
                // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
                let stderr = '';
    
                process.stdout.on('data', (data) => {
                    stdout += data.toString();
                });
    
                process.stderr.on('data', (data) => {
                    stderr += data.toString();
                });
    
                process.on('close', (code) => {
                    resolve(code === 0); // pgrep returns 0 if found, 1 if not
                });
    
                process.on('error', (err) => {
                    console.error('Failed to run pgrep:', err);
                    reject(false);
                });
            }
        });
    } */

    /**
     * Checks which games from the provided list are currently running
     */
    ipcMain.handle('games:checkRunning', async (_, gameChecks: Array<{ source: string, id: string }>) => {
        const games = getAllGamesFromDB();
        const curatedAssets = getAllCuratedAssetsFromDB();
        const processKeys = gameChecks.map(game => `${game.source}-${game.id}`);
        const tracked = new Set(processKeys.filter(key => gameProcesses.has(key) && !(key.split("-")[0] === "steam" && (gameProcesses.get(key) as ChildProcess).spawnfile.endsWith("steam.exe"))));

        // For untracked, collect all executable paths (including executablesToWatch)
        const toCheck: { key: string, executables: string[] }[] = [];
        for (const game of gameChecks) {
            const key = `${game.source}|${game.id}`;
            const processKey = `${game.source}-${game.id}`;
            if (tracked.has(processKey)) continue;
            const gameData = games.find(g => g.source === game.source && String(g.id) === String(game.id));
            const executables: string[] = [];
            // Add main launchOptions executable
            if (gameData?.launchOptions) {
                try {
                    const launchOptions = JSON.parse(gameData.launchOptions as any as string);
                    if (launchOptions[0]?.executable) {
                        executables.push(launchOptions[0].executable);
                    }
                } catch { }
            }
            // Add executablesToWatch from curated assets
            const curated = curatedAssets.find(a => a.source === game.source && String(a.id) === String(game.id));
            if (curated && curated.executablesToWatch && gameData?.installPath) {
                try {
                    const execs = typeof curated.executablesToWatch === 'string' ? JSON.parse(curated.executablesToWatch) : curated.executablesToWatch;
                    if (Array.isArray(execs)) {
                        executables.push(...(execs.map(e => {
                            if (e.includes('%GAMEROOT%')) {
                                if (gameData.installPath) {
                                    // Remove %GAMEROOT% and resolve the rest relative to installPath
                                    const rel = e.replace(/%GAMEROOT%[\\/]/, '');
                                    return path.resolve(gameData.installPath, rel);
                                } else {
                                    // installPath missing, skip this entry
                                    return undefined;
                                }
                            } else {
                                return path.resolve(e);
                            }
                        }).filter(e => e !== undefined))); // Remove undefined entries
                    }
                } catch { }
            }
            if (executables.length > 0) {
                toCheck.push({ key, executables });
            }
        }

        let running: Record<string, boolean> = {};
        if (process.platform === 'win32' && toCheck.length > 0) {
            // Flatten all executables to check
            const allExecutables = Array.from(new Set(toCheck.flatMap(x => x.executables)));
            running = await areProcessesRunningWindows(allExecutables);
        }
        console.log(running);

        // Build result
        const result: Record<string, boolean> = {};
        for (const game of gameChecks) {
            const key = `${game.source}|${game.id}`;
            const processKey = `${game.source}-${game.id}`;
            if (tracked.has(processKey)) {
                result[key] = true;
            } else {
                const check = toCheck.find(x => x.key === key);
                // If any of the executables for this game are running, mark as running
                result[key] = check ? check.executables.some(exec => running[exec]) : false;
            }
        }
        return result;
    });

    // Add a helper function to determine MIME type based on file extension
    function getMimeType(filePath: string): string {
        const extension = path.extname(filePath).toLowerCase();
        const mimeTypes: Record<string, string> = {
            '.html': 'text/html',
            '.js': 'text/javascript',
            '.css': 'text/css',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.mp3': 'audio/mpeg',
            '.mp4': 'video/mp4',
            '.wav': 'audio/wav',
            '.pdf': 'application/pdf',
            '.txt': 'text/plain',
            '.webp': 'image/webp',
        };

        return mimeTypes[extension] || 'application/octet-stream';
    }

    ipcMain.handle('collections:fetch', () => {
        const collections = JSON.parse(fs.readFileSync(path.join(app.getPath("userData"), "collections.json"), { encoding: "utf-8" }));
        return { favourites: collections.favourites, collections: collections.collections };
    });

    ipcMain.handle('collections:send', (_, favourites: CollectionGame[], collections: Collection[]) => {
        fs.writeFileSync(path.join(app.getPath("userData"), "collections.json"), JSON.stringify({ favourites, collections }));
    });

    // Add these new functions after the imports and before the first function
    function validateEpicExecutable(executablePath: string): boolean {
        try {
            if (!fs.existsSync(executablePath)) return false;
            const stats = fs.statSync(executablePath);
            return stats.isFile() && executablePath.toLowerCase().endsWith('.exe');
        } catch (error) {
            console.error('Error validating Epic executable:', error);
            return false;
        }
    }

    function findItchExecutable(basePath: string): string | null {
        try {
            // First check if this is actually a directory
            if (!fs.existsSync(basePath) || !fs.statSync(basePath).isDirectory()) {
                return null;
            }

            // Get all directories in the base path
            const dirs = fs.readdirSync(basePath);

            // Look for app-* directory
            const appDir = dirs.find(dir => dir.startsWith('app-'));
            if (!appDir) return null;

            // Check for itch.exe in the app directory
            const executablePath = path.join(basePath, appDir, 'itch.exe');
            if (fs.existsSync(executablePath) && fs.statSync(executablePath).isFile()) {
                return executablePath;
            }

            return null;
        } catch (error) {
            console.error('Error finding itch executable:', error);
            return null;
        }
    }

    // Add these new IPC handlers before app.on('before-quit', closeDB);
    ipcMain.handle('validate:epicExecutable', (_, executablePath: string) => {
        return validateEpicExecutable(executablePath);
    });

    ipcMain.handle('validate:itchExecutable', (_, basePath: string) => {
        return findItchExecutable(basePath);
    });

    // Add handler to resolve display paths for special constants
    ipcMain.handle('path:resolveDisplayPath', (_, _path: string) => {
        // Handle special constants based on the path itself
        if (_path.endsWith('CONST_ITCHEXEC')) {
            const basePath = path.dirname(_path);
            const resolvedPath = findItchExecutable(basePath);
            return resolvedPath || _path;
        }

        return _path;
    });

    // Add new handlers for app reset and restart
    ipcMain.handle('app:resetAllData', async () => {
        try {
            // Close all windows except main window
            if (settingsWindow) {
                settingsWindow.close();
            }
            if (trayWindow) {
                trayWindow.close();
            }
            if (notificationsWindow) {
                (notificationsWindow as any).close();
            }

            closeDB()

            app.relaunch({ args: [...process.argv.slice(1), "--reset-cleanup"] });
            app.exit();

            return true;
        } catch (error) {
            console.error('Failed to reset app data:', error);
            return false;
        }
    });

    ipcMain.handle('app:restart', () => {
        app.relaunch();
        app.exit();
    });

    /**
     * Downloads and updates game warnings from the external source with a timeout
     */
    async function downloadWarnings(timeout = 500): Promise<boolean> {
        return new Promise((resolve) => {
            const warningsPath = path.join(app.getPath("userData"), "warnings.json");
            const warningsUrl = 'https://deadcode.is-a.dev/DeadForgeExternalData/notes/list.json';

            // Set timeout
            const timeoutId = setTimeout(() => {
                console.log('Warning download timed out');
                resolve(false);
            }, timeout);

            const request = https.get(warningsUrl, (response) => {
                if (response.statusCode !== 200) {
                    console.error(`Failed to download warnings: ${response.statusCode}`);
                    clearTimeout(timeoutId);
                    resolve(false);
                    return;
                }

                let data = '';
                response.on('data', (chunk) => {
                    data += chunk;
                });

                response.on('end', () => {
                    clearTimeout(timeoutId);
                    try {
                        // Parse the data to validate it's proper JSON
                        const warnings = JSON.parse(data);

                        // Write to file
                        fs.writeFileSync(warningsPath, JSON.stringify(warnings));
                        console.log('Successfully updated warnings');
                        resolve(true);
                    } catch (error) {
                        console.error('Error parsing warnings:', error);
                        resolve(false);
                    }
                });
            });

            request.on('error', (error) => {
                clearTimeout(timeoutId);
                console.error('Error downloading warnings:', error);
                resolve(false);
            });

            request.end();
        });
    }

    // Ensure warnings.json exists when reading
    ipcMain.handle('fetch-game-warnings', async (_, { source, id }: { source: string, id: string }) => {
        try {
            const warningsPath = path.join(app.getPath("userData"), "warnings.json");

            // Always try to download latest warnings first
            await downloadWarnings();

            // Read warnings from file (either updated or existing)
            if (fs.existsSync(warningsPath)) {
                const warnings = JSON.parse(fs.readFileSync(warningsPath, { encoding: "utf-8" }));
                const warning = warnings.find((warning: GameWarning) => warning.matches.some((match: { source: string, id: string }) => match.source === source && String(match.id) === String(id)));
                if (!warning) return { success: true, data: "" };
                return { success: true, data: warning };
            }

            return { success: true, data: "" };
        } catch (error) {
            console.error('Error fetching game warnings:', error);
            return { success: false, error: 'Failed to fetch game warnings' };
        }
    });

    ipcMain.handle('selectCustomAsset', async () => {
        return await selectCustomAsset();
    });

    ipcMain.handle('saveCustomAsset', async (_, params) => {
        return await saveCustomAsset(params);
    });

    ipcMain.handle('updateLogoPosition', async (_, params) => {
        return await updateLogoPosition(params);
    });

    ipcMain.handle('saveMissingAssetsReport', async (_, report: string) => {
        fs.readdirSync(app.getPath("userData")).filter(file => file.startsWith("missingAssetsReport")).forEach(file => {
            if (fs.statSync(path.join(app.getPath("userData"), file)).isFile() && fs.readFileSync(path.join(app.getPath("userData"), file), { encoding: "utf-8" }) === report) {
                fs.unlinkSync(path.join(app.getPath("userData"), file));
            }
        });
        const reportPath = path.join(app.getPath("userData"), `missingAssetsReport${Date.now()}.txt`);
        fs.writeFileSync(reportPath, report);
    });

    // Add these IPC handlers before app.on('before-quit', closeDB);
    ipcMain.handle('articles:update', async () => {
        return await updateArticles();
    });

    ipcMain.handle('articles:get', () => {
        return getArticles();
    });

    async function areProcessesRunningWindows(targetPaths: string[]): Promise<Record<string, boolean>> {
        return new Promise((resolve) => {
            // PowerShell command to get all running processes with their executable paths
            const ps = spawn('powershell.exe', [
                '-NoProfile', '-Command',
                'Get-CimInstance Win32_Process | Select-Object -Property ProcessId,ExecutablePath | ConvertTo-Json'
            ]);

            let stdout = '';
            ps.stdout.on('data', (data) => { stdout += data.toString(); });

            ps.on('close', () => {
                let processes: { ProcessId: number, ExecutablePath: string }[] = [];
                try {
                    processes = JSON.parse(stdout);
                } catch {
                    resolve(Object.fromEntries(targetPaths.map(p => [p, false])));
                    return;
                }
                // Normalize paths for comparison
                const runningPaths = new Set(
                    processes
                        .filter(p => p.ExecutablePath)
                        .map(p => p.ExecutablePath.toLowerCase())
                );
                const result: Record<string, boolean> = {};
                for (const path of targetPaths) {
                    result[path] = runningPaths.has(path.toLowerCase());
                }
                console.log(result)
                resolve(result);
            });
        });
    }

    ipcMain.handle("store:checkIsDeadForgeGameInLibrary", (_, id: string) => checkIsDeadForgeGameInLibrary(id))
    ipcMain.handle("store:addGameToLocalLibrary", async (_, game: DeadForgeGameObject) => await addDeadForgeGameToLocalLibrary(game))
    ipcMain.on("store:protocol-navigate", (_, url: string) => handleProtocolUrl(url, mainWindow));
    ipcMain.on("store:external-navigate", (_, url: string) => shell.openExternal(`https://deadcode.is-a.dev/DeadForgeRedirect?url=${encodeURIComponent(url)}`))
    ipcMain.handle("library:getDefaultGameInstallPath", (_, gameId: string) => path.join(app.getPath("userData"), "software", gameId))
    ipcMain.handle("library:startGameInstall", async (_, gameId: string, installPath: string) => {
        try {
            if (!mainWindow) {
                throw new Error('Main window not found');
            }
            const result = await installDeadForgeGame(gameId, installPath, mainWindow);
            return result;
        } catch (error) {
            console.error('Failed to install game:', error);
            return {
                success: false,
                error: {
                    message: error instanceof Error ? error.message : 'Unknown error occurred',
                    code: 'UNKNOWN_ERROR'
                }
            };
        }
    });

    ipcMain.handle('game:getDownloadSize', async (_, gameId: string) => {
        return await getGameDownloadSize(gameId);
    });

    ipcMain.handle('metrics:getGameMetrics', async (_event, { source, gameId }) => {
        return getGameMetrics(source, gameId);
    });
}