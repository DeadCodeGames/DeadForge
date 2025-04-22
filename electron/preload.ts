import { app, contextBridge, ipcRenderer } from 'electron';
const path = require('path');
const { pathToFileURL } = require('url');

contextBridge.exposeInMainWorld('Electron', {
    isTray: false,
    storePreload: pathToFileURL(path.join(__dirname, 'store.preload.js')).href,
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    isMaximized: (): Promise<boolean> => ipcRenderer.invoke('window:isMaximized'),
    close: () => ipcRenderer.invoke('window:close'),
    reload: () => ipcRenderer.invoke('app:reload'),

    onMaximize: (callback: () => void) => ipcRenderer.on('browser-window-maximize', callback),
    onUnmaximize: (callback: () => void) => ipcRenderer.on('browser-window-unmaximize', callback),

    getTheme: (): Promise<'light' | 'dark'> => ipcRenderer.invoke('theme:get'),
    getPreferences: (): Promise<object | ""> => ipcRenderer.invoke('preferences:get'),
    setPreferences: (preferences: object) => ipcRenderer.invoke('preferences:set', preferences),

    onTrayNavigate: (callback: () => void) => ipcRenderer.on('tray:navigate', callback),
});

contextBridge.exposeInMainWorld('Process', {
    platform: process.platform
})

contextBridge.exposeInMainWorld('App', {
    logIsPackaged: () => console.log(process.argv),
    isPackaged: process.argv.find((arg: string) => arg.startsWith('--isPackaged'))?.split('=')[1] === 'true' ? true : false
})