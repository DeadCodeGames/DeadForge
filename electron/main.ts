import path from 'path'; import url from 'url';
import { app, BrowserWindow, Extension, ipcMain, nativeTheme } from 'electron';
import { ExtensionReference, InstallExtensionOptions } from 'electron-devtools-installer';
require("@electron/remote/main").initialize()
const windowStateKeeper = require('electron-window-state');
let installExtension: (extensionReference: ExtensionReference | string | Array<ExtensionReference | string>, options?: InstallExtensionOptions) => Promise<Extension[]>, REACT_DEVELOPER_TOOLS: ExtensionReference;
if (!app.isPackaged) {
    ({ default: installExtension, REACT_DEVELOPER_TOOLS } = require('electron-devtools-installer'));
}

let mainWindow: BrowserWindow | null = null;

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

    mainWindow.loadURL(app.isPackaged ? `file://${path.join(__dirname, "../build/index.html")}` : "http://localhost:3000");
    if (!app.isPackaged) installExtension(REACT_DEVELOPER_TOOLS).then((name) => console.log(`Added Extension: ${name}`)).catch((err: Error) => console.log('An error occurred: ', err));

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
};

// App ready
app.whenReady().then(createWindow);

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
    mainWindow?.close();
});

// Theme mode
ipcMain.handle('theme:get', () => {
    return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
});

// Store preload script
ipcMain.handle('store:preloadLink', () => {
    return url.pathToFileURL(path.join(__dirname, "store.preload.js")).href;
})