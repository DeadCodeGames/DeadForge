import path from 'path'; /* import url from 'url'; */ import fs from 'fs';
import { app, BrowserWindow, dialog, Extension, ipcMain, nativeTheme, Tray } from 'electron';
import { ExtensionReference, InstallExtensionOptions } from 'electron-devtools-installer';
import { Preferences, OldPreferences, defaultPreferences } from './preferences';
import * as SteamStuff from './mainHelpers/SteamStuff'; import * as EpicStuff from './mainHelpers/EpicStuff'; import * as ItchStuff from './mainHelpers/ItchStuff';
import { importBackup, exportBackup, validateBackup } from './mainHelpers/BackupStuff';
import { closeDB, initUserDB, insertPathIntoDB, removePathFromDB } from './mainHelpers/DataDB';
import { initWatchers } from './mainHelpers/WatchManager';
let gotInstanceLock = app.requestSingleInstanceLock();
const windowStateKeeper = require('electron-window-state');
let installExtension: (extensionReference: ExtensionReference | string | Array<ExtensionReference | string>, options?: InstallExtensionOptions) => Promise<Extension[]>, REACT_DEVELOPER_TOOLS: ExtensionReference;
if (!app.isPackaged) {
    ({ default: installExtension, REACT_DEVELOPER_TOOLS } = require('electron-devtools-installer'));
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

let mainWindow: BrowserWindow | null = null;
let trayWindow: BrowserWindow | null = null;
let settingsWindow: BrowserWindow | null = null;
let tray: Tray;
let initialLoad = true;

const FIRST_DEV_RUN = !app.isPackaged && Boolean(process.argv.find((s) => s === "--first-run"));

let legacyPreferencesAvailable = false, legacyPreferences: OldPreferences;

function migratePreferences(v1Prefs: OldPreferences, options?: { dryRun?: true }): undefined;
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

let initialPrefs: Preferences | OldPreferences;
try {
    initialPrefs = JSON.parse(fs.readFileSync(path.join(app.getPath("userData"), "preferences.json"), { encoding: "utf-8" }));
    if (isOldPreferences(initialPrefs)) {
        migratePreferences(initialPrefs, { dryRun: true });
        initialPrefs = defaultPreferences;
    }
} catch (e) {
    console.log(e);
    initialPrefs = defaultPreferences;
}


const createTray = () => {
    tray = new Tray(path.join(__dirname, 'trayIcon.png'));
    let trayTimer: null | NodeJS.Timeout = null;
    let trayClickEvent = async () => {
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
        trayWindow.isVisible() ? trayWindow.hide() : trayWindow.show();
    }

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
    let mainWindowState = windowStateKeeper({
        defaultHeight: 600,
        defaultWidth: 900,
        maximize: true,
        fullscreen: true
    })

    mainWindow = new BrowserWindow({
        minWidth: 700,
        minHeight: 725,
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
            devTools: app.isPackaged ? true : true,
            webviewTag: true,
            additionalArguments: [`--isPackaged=${app.isPackaged}`]
        }
    });

    mainWindowState.manage(mainWindow)

    mainWindow.loadURL(app.isPackaged ? `file://${path.join(__dirname, "../build/index.html")}#/${initialPrefs.defaultPage || "library"}` : `http://localhost:3000#/${initialPrefs.defaultPage || "library"}`);
    if (!app.isPackaged) installExtension(REACT_DEVELOPER_TOOLS).then((ext) => Array.isArray(ext) ? ext.forEach(e => console.log(`Added Extension: ${e.name} (${e.id})`)) : console.log(`Added Extension: ${(ext as Extension).name!} (${(ext as Extension).id})`)).catch((err: Error) => console.log('An error occurred: ', err));

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
    mainWindow.webContents.openDevTools();
    mainWindow.webContents.on("did-navigate", () => { if (!initialLoad) { app.relaunch(); app.quit() } else initialLoad = false; });

    mainWindow!.webContents.setWindowOpenHandler(({ url }) => {
        require('electron').shell.openExternal(url);
        return { action: 'deny' };
    });
};

if (!gotInstanceLock && app.isPackaged) { app.quit(); } else
    if (!gotInstanceLock || !app.isPackaged) { gotInstanceLock = app.requestSingleInstanceLock(); }
app.whenReady().then(async () => {
    initUserDB();
    initWatchers();
    await new Promise((resolve) => setTimeout(() => {
        FIRST_DEV_RUN && console.warn("Sometimes, during development, the development server starts way too late, and the window page is an error instead.");
        FIRST_DEV_RUN && console.warn("This ̶s̶h̶o̶u̶l̶d̶ ̶n̶o̶t̶ ̶b̶e̶ is not an issue in prod, but is annoying in dev.");
        FIRST_DEV_RUN && console.warn("While refreshing the main window fixes it, you cannot really refresh the tray window because of how the IPC flow was designed.");
        FIRST_DEV_RUN && console.warn("For this reason, there is a 2.5s delay before creating the windows on the first launch during dev. Any further refreshes caused by editing files in the electron/ folder have a delay of 0.");
        createWindow();
        createTrayWindow();
        resolve(null);
    }, !FIRST_DEV_RUN ? 0 : 2500));

    if (initialPrefs.useTray) createTray();
});

app.on('second-instance', () => {
    if (!app.isPackaged) { app.quit(); } else {
        mainWindow?.show();
        mainWindow?.focus();
    }
})

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
    trayWindow ? mainWindow?.hide() : mainWindow?.close();
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

    trayWindow.loadURL(trayURL);

    trayWindow.on('blur', () => trayWindow?.hide());
    trayWindow.on('closed', () => (trayWindow = null));

    type trayChoice = {
        type: 'exit'
    } | {
        type: 'navigate',
        destination: string
    }

    ipcMain.on("tray:choice", (event: Electron.IpcMainEvent, choice: trayChoice) => {
        trayWindow?.hide()
        if (choice.type === 'exit') app.quit();
        else if (choice.type === 'navigate') {
            mainWindow?.webContents.send("tray:navigate", choice.destination);
            mainWindow?.show();
            mainWindow?.focus();
        }
    })
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

    settingsWindow.loadURL(app.isPackaged ? `file://${path.join(__dirname, "../build/index.html")}#/settings` : `http://localhost:3000#/settings`);
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
    } catch (err) {
        preferences = defaultPreferences;
    }
    return {preferences, v1PrefsAvailable: legacyPreferencesAvailable || fs.existsSync(path.join(app.getPath('userData'), 'preferences.v1.json')), v1Prefs: legacyPreferences};
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

ipcMain.handle('backup:validate', async (_, path: string): Promise<[true, Preferences] | [false, {}]> => {
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
        if (data.steam.enabled && await SteamStuff.getInstalledSteamGames(path.join(data.steam.path, 'appcache', 'appinfo.vdf'), path.join(data.steam.path, 'steamapps', 'libraryfolders.vdf'))) {
            insertPathIntoDB('steam', data.steam.path);
        } else {
            removePathFromDB('steam');
        }
        if (data.epic.enabled && EpicStuff.getInstalledEpicGames(data.epic.path)) {
            insertPathIntoDB('epic', data.epic.path);
        } else {
            removePathFromDB('epic');
        }
        if (data.itchio.enabled && await ItchStuff.readItchDB(path.join(data.itchio.path, "db", "butler.db"))) {
            insertPathIntoDB('itchio', data.itchio.path);
        } else {
            removePathFromDB('itchio')
        }
    }
})

app.on('before-quit', closeDB);