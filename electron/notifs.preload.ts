import { contextBridge, ipcRenderer } from 'electron';
import { NormalizedGame } from './types';
contextBridge.exposeInMainWorld('Electron', {
    isTray: false,
    isSettingsWindow: false,
    isNotificationsWindow: false,
    // eslint-disable-next-line no-unused-vars
    onPreferencesUpdate: (callback: (newPrefs: object) => void) => ipcRenderer.on('preferences:update', callback),
    sendNotificationChoice: (choice: string | object) => ipcRenderer.send('notif:choice', choice),
    onNewNotification: (callback: () => void) => ipcRenderer.on('notif:new', callback),
    notificationRemoved: () => ipcRenderer.send('notif:removed'),
    fetchGames: (): Promise<NormalizedGame[]> => ipcRenderer.invoke('games:fetch'),
    // eslint-disable-next-line no-unused-vars
    onGamesUpdate: (callback: (event: any, games: NormalizedGame[]) => void) => ipcRenderer.on('games:update', callback),
    // eslint-disable-next-line no-unused-vars
    removeGamesUpdateListener: (callback: (event: any, games: NormalizedGame[]) => void) => ipcRenderer.removeListener('games:update', callback),
});
