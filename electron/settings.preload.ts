import { contextBridge, ipcRenderer } from 'electron';
import { NormalizedGame } from './types';

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
    onPreferencesUpdate: (callback: (newPrefs: object) => void) => ipcRenderer.on('preferences:update', callback),

    fetchGames: (): Promise<NormalizedGame[]> => ipcRenderer.invoke('games:fetch'),
    onGamesUpdate: (callback: (event: any, games: NormalizedGame[]) => void) => ipcRenderer.on('games:update', callback),
    removeGamesUpdateListener: (callback: (event: any, games: NormalizedGame[]) => void) => ipcRenderer.removeListener('games:update', callback),
})

contextBridge.exposeInMainWorld('Process', {
    platform: process.platform
})

contextBridge.exposeInMainWorld('App', {
    isPackaged: process.argv.find((arg: string) => arg.startsWith('--isPackaged'))?.split('=')[1] === 'true' ? true : false
})