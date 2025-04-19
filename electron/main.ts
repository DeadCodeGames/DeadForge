import path from 'path'; import url from 'url';
import { app, BrowserWindow, Extension, ipcMain, nativeTheme, Tray } from 'electron';
import { ExtensionReference, InstallExtensionOptions } from 'electron-devtools-installer';
require("@electron/remote/main").initialize()
const windowStateKeeper = require('electron-window-state');
let installExtension: (extensionReference: ExtensionReference | string | Array<ExtensionReference | string>, options?: InstallExtensionOptions) => Promise<Extension[]>, REACT_DEVELOPER_TOOLS: ExtensionReference;
if (!app.isPackaged) {
    ({ default: installExtension, REACT_DEVELOPER_TOOLS } = require('electron-devtools-installer'));
}

let mainWindow: BrowserWindow | null = null;
let trayWindow: BrowserWindow | null = null;
let tray: Tray;


const createWindow = () => {
    let mainWindowState = windowStateKeeper({
        defaultHeight: 600,
        defaultWidth: 800,
        maximize: true
    })

    mainWindow = new BrowserWindow({
        minWidth: 555,
        minHeight: 350,
        height: mainWindowState.height,
        width: mainWindowState.width,
        frame: false,
        fullscreen: false,
        titleBarStyle: 'hidden',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: true,
            contextIsolation: true,
            devTools: app.isPackaged ? false : true,
            webviewTag: true
        }
    });

    mainWindow.loadURL(app.isPackaged ? `file://${path.join(__dirname, "../build/index.html#/library")}` : "http://localhost:3000#/library");
    if (!app.isPackaged) installExtension(REACT_DEVELOPER_TOOLS).then((ext) => Array.isArray(ext) ? ext.forEach(e => console.log(`Added Extension: ${e.name} (${e.id})`)) : console.log(`Added Extension: ${(ext as Extension).name!} (${(ext as Extension).id})`)).catch((err: Error) => console.log('An error occurred: ', err));

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
};

// App ready
app.whenReady().then(async () => {
    await new Promise((resolve) => setTimeout(() => {
        !app.isPackaged && console.warn("Sometimes, during development, the development server starts way too late, and the window page is an error instead.");
        !app.isPackaged && console.warn("This should not be an issue in prod, but is annoying in dev.");
        !app.isPackaged && console.warn("While refreshing the main window fixes it, you cannot really refresh the tray window because of how the IPC flow was designed.");
        !app.isPackaged && console.warn("For this reason, there is a 2.5s delay before creating the windows during dev.");
        createWindow();
        createTrayWindow();
        resolve(null);
    }, app.isPackaged ? 0 : 2500));

    tray = new Tray(path.join(__dirname, 'trayIcon.png'));
    let trayTimer: null | NodeJS.Timeout = null;
    let trayClickEvent = async () => {
        if (trayTimer) { clearTimeout(trayTimer); trayTimer = null; return; } else {
            await new Promise((resolve) => { trayTimer = setTimeout(() => { if (trayTimer === null) return; trayTimer = null; resolve(null) }, 500) });
        }
        if (!trayWindow) return;

        trayWindow.webContents.send('tray:getContentsHeight');

        await new Promise<void>((resolve) => {
            ipcMain.once('tray:contentsHeightResponse', (event, height) => {
                trayWindow!.setBounds({ height });
                resolve();
            });
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

// Store preload script
ipcMain.handle('store:preloadLink', () => {
    return url.pathToFileURL(path.join(__dirname, "store.preload.js")).href;
})

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
        ? `file://${path.join(__dirname, "../build/index.html#/tray")}`
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
            mainWindow?.restore();
            mainWindow?.focus();
        }
    })
};
