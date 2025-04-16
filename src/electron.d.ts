import { IpcRendererEvent } from 'electron'
declare global {
    interface Window {
        Electron: {
            minimize: () => void;
            maximize: () => void;
            close: () => void;
            isMaximized: () => Promise<boolean>;
            getPlatform: () => Promise<"Linux" | "Windows" | "Mac">;
            onMaximize: (callback: (event: IpcRendererEvent) => void) => void;
            onUnmaximize: (callback: (event: IpcRendererEvent) => void) => void;
            getPreferences: () => object;
            updatePreferences: (preferences: object) => void;
            getStorePreload: () => Promise<string>;
        };
    }
}