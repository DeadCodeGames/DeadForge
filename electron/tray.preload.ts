import { NormalizedGame } from "./types";

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
    onPreferencesUpdate: (callback: (newPrefs: object) => void) => ipcRenderer.on('preferences:update', callback),
    fetchGames: (): Promise<NormalizedGame[]> => ipcRenderer.invoke('games:fetch'),
    onGamesUpdate: (callback: (event: any, games: NormalizedGame[]) => void) => ipcRenderer.on('games:update', callback),
    removeGamesUpdateListener: (callback: (event: any, games: NormalizedGame[]) => void) => ipcRenderer.removeListener('games:update', callback),
});

contextBridge.exposeInMainWorld('Process', {
    platform: process.platform
})

contextBridge.exposeInMainWorld('App', {
    isPackaged: process.argv.find((arg: string) => arg.startsWith('--isPackaged'))?.split('=')[1] === 'true' ? true : false
})