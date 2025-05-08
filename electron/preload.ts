import { contextBridge, ipcRenderer } from 'electron';
import { OldPreferences, Preferences } from './preferences';
import { SteamGameObject } from './steamTypes';
const path = require('path');
const { pathToFileURL } = require('url');

contextBridge.exposeInMainWorld('Electron', {
    isTray: false,
    isSettingsWindow: false,
    isNotificationsWindow: false,
    storePreload: pathToFileURL(path.join(__dirname, 'store.preload.js')).href,
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    isMaximized: (): Promise<boolean> => ipcRenderer.invoke('window:isMaximized'),
    close: () => ipcRenderer.invoke('window:close'),
    reload: () => ipcRenderer.invoke('app:reload'),

    onMaximize: (callback: () => void) => ipcRenderer.on('browser-window-maximize', callback),
    onUnmaximize: (callback: () => void) => ipcRenderer.on('browser-window-unmaximize', callback),

    getPreferences: (): Promise<{preferences: Preferences, v1PrefsAvailable: boolean, legacyPrefs: OldPreferences | undefined}> => ipcRenderer.invoke('preferences:get'),
    setPreferences: (preferences: object, isSettingsOpen: boolean, fromSettingsWindow: boolean) => ipcRenderer.invoke('preferences:set', preferences, isSettingsOpen, fromSettingsWindow),
    onPreferencesUpdate: (callback: (newPrefs: object) => void) => ipcRenderer.on('preferences:update', callback),

    onTrayNavigate: (callback: () => void) => ipcRenderer.on('tray:navigate', callback),
    openSettingsWindow: () => ipcRenderer.send('window:openSettingsWindow'),

    showOpenDialog: (options: any) => ipcRenderer.invoke("dialog:showOpenDialog", options),

    getSteamGamesData: (path: string): Promise<SteamLauncherData | null> => ipcRenderer.invoke('steam:getGamesData', path),
    getEpicGamesData: (path: string): Promise<any | null> => ipcRenderer.invoke('epic:getGamesData', path),
    getItchGamesData: (path: string): Promise<any | null> => ipcRenderer.invoke('itch:getGamesData', path),

    exportBackup: (): Promise<string | { canceled: true }> => ipcRenderer.invoke('backup:export'),
    importBackup: (): Promise<[string, Preferences] | { canceled: true }> => ipcRenderer.invoke('backup:import'),
    validateBackup: (path: string): Promise<[true, Preferences] | [false, {}]> => ipcRenderer.invoke('backup:validate', path),
    onboardingFinished: (data: any) => ipcRenderer.invoke('onboarding:finished', data),
});

contextBridge.exposeInMainWorld('Process', {
    platform: process.platform,
    username: process.env.USERNAME || process.env.USER,
})

contextBridge.exposeInMainWorld('App', {
    isPackaged: process.argv.find((arg: string) => arg.startsWith('--isPackaged'))?.split('=')[1] === 'true' ? true : false
})

export type SteamLauncherData = {
    magic: string,
    e_universe: string,
    datasets: SteamGameObject[]
}