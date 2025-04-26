import { contextBridge, ipcRenderer } from 'electron';
import { Preferences } from './preferences';
const path = require('path');
const { pathToFileURL } = require('url');

contextBridge.exposeInMainWorld('Electron', {
    isTray: false,
    isSettingsWindow: false,
    storePreload: pathToFileURL(path.join(__dirname, 'store.preload.js')).href,
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    isMaximized: (): Promise<boolean> => ipcRenderer.invoke('window:isMaximized'),
    close: () => ipcRenderer.invoke('window:close'),
    reload: () => ipcRenderer.invoke('app:reload'),

    onMaximize: (callback: () => void) => ipcRenderer.on('browser-window-maximize', callback),
    onUnmaximize: (callback: () => void) => ipcRenderer.on('browser-window-unmaximize', callback),

    getPreferences: (): Promise<Preferences | ""> => ipcRenderer.invoke('preferences:get'),
    setPreferences: (preferences: object, isSettingsOpen: boolean, fromSettingsWindow: boolean) => ipcRenderer.invoke('preferences:set', preferences, isSettingsOpen, fromSettingsWindow),
    onPreferencesUpdate: (callback: (newPrefs: object) => void) => ipcRenderer.on('preferences:update', callback),

    onTrayNavigate: (callback: () => void) => ipcRenderer.on('tray:navigate', callback),
    openSettingsWindow: () => ipcRenderer.send('window:openSettingsWindow'),
});

contextBridge.exposeInMainWorld('Process', {
    platform: process.platform
})

contextBridge.exposeInMainWorld('App', {
    isPackaged: process.argv.find((arg: string) => arg.startsWith('--isPackaged'))?.split('=')[1] === 'true' ? true : false
})