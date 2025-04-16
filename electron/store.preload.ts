import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('Electron', {
    getTheme: (): Promise<'light' | 'dark'> => ipcRenderer.invoke('theme:get'),
});
