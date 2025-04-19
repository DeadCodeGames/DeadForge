import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('Electron', {
    isTray: false,
    getTheme: (): Promise<'light' | 'dark'> => ipcRenderer.invoke('theme:get'),
});
