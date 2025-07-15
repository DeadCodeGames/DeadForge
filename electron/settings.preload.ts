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

    updatePrivacy: () => ipcRenderer.invoke('privacy:update'),
    fetchPrivacy: () => ipcRenderer.invoke('privacy:fetch'),
    // eslint-disable-next-line no-unused-vars
    onPrivacyUpdate: (callback: (_event: any, content: string) => void) => ipcRenderer.on('privacy:updated', callback),

    DEADFORGE_downloadUpdate: (includeBeta: boolean) => ipcRenderer.invoke('DEADFORGE:downloadUpdate', includeBeta),
    // eslint-disable-next-line no-unused-vars
    DEADFORGE_onUpdateProgress: (callback: (event: any, progress: { percent: number, version: string }) => void) => ipcRenderer.on('DEADFORGE:updateProgress', callback),
    // eslint-disable-next-line no-unused-vars
    DEADFORGE_onUpdateStateChange: (callback: (event: any, state: { state: string, version?: string, error?: string }) => void) => ipcRenderer.on('DEADFORGE:updateStateChange', callback),
    DEADFORGE_installUpdate: () => ipcRenderer.invoke('DEADFORGE:installUpdate'),
})

contextBridge.exposeInMainWorld('Process', {
    platform: process.platform,
    versions: {
        chrome: process.versions.chrome,
        node: process.versions.node,
        electron: process.versions.electron,
        deadforge: process.argv.find((arg: string) => arg.startsWith('--deadforgeVersion'))?.split('=')[1]
    }
})

contextBridge.exposeInMainWorld('App', {
    isPackaged: process.argv.find((arg: string) => arg.startsWith('--isPackaged'))?.split('=')[1] === 'true' ? true : false
})