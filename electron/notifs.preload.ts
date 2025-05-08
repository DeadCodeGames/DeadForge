import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('Electron', {
    isTray: false,
    isSettingsWindow: false,
    isNotificationsWindow: false,
    onPreferencesUpdate: (callback: (newPrefs: object) => void) => ipcRenderer.on('preferences:update', callback),
    sendNotificationChoice: (choice: string | object) => ipcRenderer.send('notif:choice', choice),
    onNewNotification: (callback: () => void) => ipcRenderer.on('notif:new', callback),
    notificationRemoved: () => ipcRenderer.send('notif:removed'),
});
