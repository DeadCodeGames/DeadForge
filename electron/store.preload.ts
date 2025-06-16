import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { DeadForgeGameObject } from './mainHelpers/DataDB';

contextBridge.exposeInMainWorld('Electron', {
    isTray: false,
    isSettingsWindow: false,
    isNotificationsWindow: false,
    getTheme: () => ipcRenderer.invoke('store:getTheme'),
    // eslint-disable-next-line no-unused-vars
    onThemeUpdate: (callback: (event: IpcRendererEvent, theme: string) => void) => ipcRenderer.on('store:themeUpdate', callback),
    checkIsDeadForgeGameInLibrary: (id: string) => ipcRenderer.invoke('store:checkIsDeadForgeGameInLibrary', id) as Promise<boolean>,
    addGameToLocalLibrary: (game: DeadForgeGameObject) => ipcRenderer.invoke('store:addGameToLocalLibrary', game) as Promise<boolean>,
    navigateUsingDeadForgeProtocol: (URL: string) => ipcRenderer.send("store:protocol-navigate", URL),
    navigateExternal: (URL: string) => ipcRenderer.send("store:external-navigate", URL)
});
