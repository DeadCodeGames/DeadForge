import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('Electron', {
    isTray: false,
    isSettingsWindow: false,
});
