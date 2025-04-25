/// <reference types="navigation-api-types" />
import { IpcRendererEvent } from 'electron'
declare global {
    interface Window {
        Electron: {
            isTray: boolean;
            isSettingsWindow: boolean;
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
            getPreferences: () => Preferences | "";
            setPreferences: (preferences: object, isSettingsOpen: boolean, fromSettingsWindow: boolean) => void;
            onPreferencesUpdate: (callback: (e:any, newPrefs: object) => void) => void,
            openSettingsWindow: () => void;
        };
        Process: {
            platform: 'aix' | 'darwin' | 'freebsd' | 'linux' | 'openbsd' | 'sunos' | 'win32';
        },
        App: {
            isPackaged: boolean;
        }
    }
}

export type Preferences = {
    theme: string,
    sidebarCollapsed: boolean,
    windowFrame: string,
    showThemeButton: boolean,
    language: string,
    defaultPage: string,
    useSettingsWindow: boolean,
    useTray: boolean,
    autoStart: boolean,
    autoUpdate: boolean,
    betaUpdates: boolean,
    langUpdates: boolean
}