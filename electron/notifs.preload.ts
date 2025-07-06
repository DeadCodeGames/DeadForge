import { contextBridge, ipcRenderer } from 'electron';
import { Preferences } from './preferences';
contextBridge.exposeInMainWorld('Electron', {
    isTray: false,
    isSettingsWindow: false,
    isNotificationsWindow: false,
    // eslint-disable-next-line no-unused-vars
    onPreferencesUpdate: (callback: (event: Electron.IpcRendererEvent, newPrefs: Preferences) => void) => ipcRenderer.on('preferences:update', callback),
    sendNotificationChoice: (choice: string | object) => ipcRenderer.send('notif:choice', choice),
    onNewNotification: (callback: () => void) => ipcRenderer.on('notif:new', callback),
    notificationRemoved: () => ipcRenderer.send('notif:removed')
});
