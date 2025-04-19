const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('Electron', {
    isTray: true,
    getTheme: (): Promise<'light' | 'dark'> => ipcRenderer.invoke('theme:get'),
    onTrayGetContentsHeight: (callback: () => Promise<number>) => {
        ipcRenderer.on('tray:getContentsHeight', async () => {
            const height = await callback(); // run the renderer-side logic
            ipcRenderer.send('tray:contentsHeightResponse', height);
        });
    },
    sendTrayChoice: (choice: string | object) => ipcRenderer.send('tray:choice', choice),
});
