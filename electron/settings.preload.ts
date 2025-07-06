import { contextBridge, ipcRenderer } from 'electron';
import { Preferences } from './preferences';

contextBridge.exposeInMainWorld('Electron', {
    isTray: false,
    isSettingsWindow: true,
    isNotificationsWindow: false,
    minimize: () => ipcRenderer.invoke('settings:minimize'),
    maximize: () => ipcRenderer.invoke('settings:maximize'),
    isMaximized: (): Promise<boolean> => ipcRenderer.invoke('settings:isMaximized'),
    close: () => ipcRenderer.invoke('settings:close'),
    reload: () => ipcRenderer.invoke('app:reload'),

    onMaximize: (callback: () => void) => ipcRenderer.on('browser-window-maximize', callback),
    onUnmaximize: (callback: () => void) => ipcRenderer.on('browser-window-unmaximize', callback),

    getPreferences: (): Promise<object | ""> => ipcRenderer.invoke('preferences:get'),
    setPreferences: (preferences: object, isSettingsOpen: boolean, fromSettingsWindow: boolean) => ipcRenderer.invoke('preferences:set', preferences, isSettingsOpen, fromSettingsWindow),
    // eslint-disable-next-line no-unused-vars
    onPreferencesUpdate: (callback: (event: Electron.IpcRendererEvent, newPrefs: Preferences) => void) => ipcRenderer.on('preferences:update', callback),

    resetAllData: () => ipcRenderer.invoke('app:resetAllData'),
    restartApp: () => ipcRenderer.invoke('app:restart'),
})

contextBridge.exposeInMainWorld('Process', {
    platform: process.platform
})

contextBridge.exposeInMainWorld('App', {
    isPackaged: process.argv.find((arg: string) => arg.startsWith('--isPackaged'))?.split('=')[1] === 'true' ? true : false
})