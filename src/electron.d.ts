import { IpcRendererEvent } from 'electron'
declare global {
    interface Window {
        Electron: {
            isTray: boolean;
            storePreload: string;
            onTrayGetContentsHeight: (callback: (event: IpcRendererEvent) => void) => void;
            sendTrayChoice: (choice: string | object) => void;
            onTrayNavigate: (callback: (event: IpcRendererEvent, location: string) => void) => void;
            minimize: () => void;
            maximize: () => void;
            close: () => void;
            reload: () => void;
            isMaximized: () => Promise<boolean>;
            getPlatform: () => Promise<"Linux" | "Windows" | "Mac">;
            onMaximize: (callback: (event: IpcRendererEvent) => void) => void;
            onUnmaximize: (callback: (event: IpcRendererEvent) => void) => void;
            getPreferences: () => object;
            setPreferences: (preferences: object) => void;
        };
        Process: {
            platform: "linux" | "win32" | "darwin";
        },
        App: {
            isPackaged: boolean;
        }
    }
}