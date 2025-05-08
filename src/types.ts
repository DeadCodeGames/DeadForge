/// <reference types="navigation-api-types" />
import { IpcRendererEvent, FileFilter } from 'electron'
declare global {
    interface Window {
        Electron: {
            isTray: boolean;
            isSettingsWindow: boolean;
            isNotificationsWindow: boolean;
            storePreload: string;
            onTrayGetContentsHeight: (callback: (event: IpcRendererEvent) => void) => void;
            sendTrayChoice: (choice: string | object) => void;
            sendNotificationChoice: (choice: string | object) => void;
            onTrayNavigate: (callback: (event: IpcRendererEvent, location: string) => void) => void;
            minimize: () => void;
            maximize: () => void;
            close: () => void;
            reload: () => void;
            isMaximized: () => Promise<boolean>;
            getPlatform: () => Promise<"Linux" | "Windows" | "Mac">;
            onMaximize: (callback: (event: IpcRendererEvent) => void) => void;
            onUnmaximize: (callback: (event: IpcRendererEvent) => void) => void;
            getPreferences: () => Promise<{preferences: Preferences, v1PrefsAvailable: boolean, v1Prefs: OldPreferences}>;
            setPreferences: (preferences: object, isSettingsOpen: boolean, fromSettingsWindow: boolean) => void;
            onPreferencesUpdate: (callback: (e: any, newPrefs: object) => void) => void,
            openSettingsWindow: () => void;
            getSteamGamesData: (path: string) => Promise<SteamLauncherData | null>;
            getEpicGamesData: (path: string) => Promise<any | null>,
            getItchGamesData: (path: string) => Promise<any | null>,
            showOpenDialog: (options: {
                defaultPath?: string
                properties: Array<"openFile" | "openDirectory" | "multiSelections" | "showHiddenFiles" | "createDirectory" | "promptToCreate" | "noResolveAliases" | "treatPackageAsDirectory" | "dontAddToRecent">,
                filters?: FileFilter[]
            }) => Promise<{
                canceled: boolean
                filePaths: string[]
            }>,
            exportBackup: () => Promise<string | { canceled: true }>,
            importBackup: () => Promise<[string, Preferences] | { canceled: true }>,
            validateBackup: (backupPath: string) => Promise<[true, Preferences] | [false, {}]>,
            onboardingFinished: (data: any) => void
        };
        Process: {
            platform: 'aix' | 'darwin' | 'freebsd' | 'linux' | 'openbsd' | 'sunos' | 'win32';
            username: string;
        },
        App: {
            isPackaged: boolean;
        }
    }
}

export type Preferences = {
    initialSetupComplete: boolean,
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

export type OldPreferences = {
    colorScheme: string,
    discordRPC: boolean,
    startup: boolean,
    betaEnabled: boolean,
    closeToTray: boolean,
    menubarCollapsed: boolean,
    libraryStyle: string,
    librarySort: string,
    currentLibCollection: null | string
}

export type SteamLauncherData = {
    magic: string,
    e_universe: string,
    datasets: object[]
}