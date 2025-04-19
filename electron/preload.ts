import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('Electron', {
    isTray: false,
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    isMaximized: (): Promise<boolean> => ipcRenderer.invoke('window:isMaximized'),
    close: () => ipcRenderer.invoke('window:close'),

    onMaximize: (callback: () => void) => ipcRenderer.on('browser-window-maximize', callback),
    onUnmaximize: (callback: () => void) => ipcRenderer.on('browser-window-unmaximize', callback),

    getTheme: (): Promise<'light' | 'dark'> => ipcRenderer.invoke('theme:get'),
    getStorePreload: (): Promise<string> => ipcRenderer.invoke('store:preloadLink'),

    onTrayNavigate: (callback: () => void) => ipcRenderer.on('tray:navigate', callback),
});
