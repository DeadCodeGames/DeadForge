import { Collection, CollectionGame, NormalizedGame } from "./types";

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('Electron', {
    isTray: true,
    isSettingsWindow: false,
    isNotificationsWindow: false,
    onTrayGetContentsHeight: (callback: () => Promise<number>) => {
        ipcRenderer.on('tray:getContentsHeight', async () => {
            const height = await callback();
            ipcRenderer.send('tray:contentsHeightResponse', height);
        });
    },
    sendTrayChoice: (choice: string | object) => ipcRenderer.send('tray:choice', choice),
    getPreferences: (): Promise<object | ""> => ipcRenderer.invoke('preferences:get'),
    // eslint-disable-next-line no-unused-vars
    onPreferencesUpdate: (callback: (newPrefs: object) => void) => ipcRenderer.on('preferences:update', callback),
    fetchGames: (): Promise<NormalizedGame[]> => ipcRenderer.invoke('games:fetch'),
    // eslint-disable-next-line no-unused-vars
    onGamesUpdate: (callback: (event: any, games: NormalizedGame[]) => void) => ipcRenderer.on('games:update', callback),
    // eslint-disable-next-line no-unused-vars
    removeGamesUpdateListener: (callback: (event: any, games: NormalizedGame[]) => void) => ipcRenderer.removeListener('games:update', callback),
    fetchCollections: (): Promise<{favourites: CollectionGame[], collections: Collection[]}> => ipcRenderer.invoke('collections:fetch'),
    sendCollections: (favourites: CollectionGame[], collections: Collection[]) => ipcRenderer.invoke('collections:send', favourites, collections),
    checkRunningGames: (gameChecks: Array<{ source: string, id: string }>): Promise<Record<string, boolean>> =>
        ipcRenderer.invoke('games:checkRunning', gameChecks),
    // eslint-disable-next-line no-unused-vars
    onGameProcessTerminated: (callback: (event: any, source: string, gameId: string) => void) => ipcRenderer.on('game:processTerminated', callback),
    // eslint-disable-next-line no-unused-vars
    removeGameProcessTerminatedListener: (callback: (event: any, source: string, gameId: string) => void) => ipcRenderer.removeListener('game:processTerminated', callback)
});

contextBridge.exposeInMainWorld('Process', {
    platform: process.platform
})

contextBridge.exposeInMainWorld('App', {
    isPackaged: process.argv.find((arg: string) => arg.startsWith('--isPackaged'))?.split('=')[1] === 'true' ? true : false
})