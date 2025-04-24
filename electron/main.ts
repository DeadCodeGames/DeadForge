import path from 'path'; import url from 'url'; import fs from 'fs';
import { app, BrowserWindow, Extension, ipcMain, nativeTheme, Tray } from 'electron';
import { ExtensionReference, InstallExtensionOptions } from 'electron-devtools-installer';
let gotInstanceLock = app.requestSingleInstanceLock();
require("@electron/remote/main").initialize()
const windowStateKeeper = require('electron-window-state');
let installExtension: (extensionReference: ExtensionReference | string | Array<ExtensionReference | string>, options?: InstallExtensionOptions) => Promise<Extension[]>, REACT_DEVELOPER_TOOLS: ExtensionReference;
if (!app.isPackaged) {
    ({ default: installExtension, REACT_DEVELOPER_TOOLS } = require('electron-devtools-installer'));
}

let mainWindow: BrowserWindow | null = null;
let trayWindow: BrowserWindow | null = null;
let tray: Tray;
let initialLoad = true;

const FIRST_DEV_RUN = !app.isPackaged && Boolean(process.argv.find((s) => s === "--first-run"));

let initialPrefs: any;
try {
    initialPrefs = JSON.parse(fs.readFileSync(path.join(app.getPath("userData"), "preferences.json"), { encoding: "utf-8" }));
} catch (e) {
    console.log(e)
    initialPrefs = "";
}
console.log(initialPrefs)

const createWindow = () => {
    let mainWindowState = windowStateKeeper({
        defaultHeight: 600,
        defaultWidth: 900,
        maximize: true,
        fullscreen: true
    })

    mainWindow = new BrowserWindow({
        minWidth: 700,
        minHeight: 450,
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

    mainWindow.webContents.on("did-navigate", () => { if (!initialLoad) { app.relaunch(); app.quit() } else initialLoad = false; });
};

if (!gotInstanceLock && app.isPackaged) { app.quit(); } else
if (!gotInstanceLock || !app.isPackaged) { gotInstanceLock = app.requestSingleInstanceLock(); }
app.whenReady().then(async () => {
    await new Promise((resolve) => setTimeout(() => {
        FIRST_DEV_RUN && console.warn("Sometimes, during development, the development server starts way too late, and the window page is an error instead.");
        FIRST_DEV_RUN && console.warn("This ̶s̶h̶o̶u̶l̶d̶ ̶n̶o̶t̶ ̶b̶e̶ is not an issue in prod, but is annoying in dev.");
        FIRST_DEV_RUN && console.warn("While refreshing the main window fixes it, you cannot really refresh the tray window because of how the IPC flow was designed.");
        FIRST_DEV_RUN && console.warn("For this reason, there is a 2.5s delay before creating the windows on the first launch during dev. Any further refreshes caused by editing files in the electron/ folder have a delay of 0.");
        createWindow();
        createTrayWindow();
        resolve(null);
    }, !FIRST_DEV_RUN ? 0 : 2500));

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

ipcMain.handle('preferences:get', () => {
    let preferences: string;
    try {
        preferences = JSON.parse(fs.readFileSync(path.join(app.getPath('userData'), 'preferences.json'), 'utf-8'));
    } catch (err) {
        preferences = "";
    }
    return preferences;
});

ipcMain.handle('preferences:set', (event: Electron.IpcMainInvokeEvent, newPreferences: object) => {
    console.log(newPreferences)
    fs.writeFileSync(path.join(app.getPath('userData'), 'preferences.json'), JSON.stringify(newPreferences));
});

ipcMain.handle('app:reload', () => {
    app.relaunch(); app.exit(0)
});