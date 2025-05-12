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
            onboardingFinished: (data: any) => void,
            fetchGames: () => Promise<[NormalizedGame[], NormalizedDLC[], NormalizedGameJoin[]]>,
            onGamesUpdate: (callback: (event: IpcRendererEvent, games: NormalizedGame[], dlcs: NormalizedDLC[], gameJoins: NormalizedGameJoin[]) => void) => void,
            removeGamesUpdateListener: (callback: (event: IpcRendererEvent, games: NormalizedGame[], dlcs: NormalizedDLC[], gameJoins: NormalizedGameJoin[]) => void) => void
        };
        Process: {
            platform: 'aix' | 'darwin' | 'freebsd' | 'linux' | 'openbsd' | 'sunos' | 'win32';
            username: string;
            versions: {
                chrome: string;
                node: string;
                electron: string;
                deadforge: string;
            }
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

export type LaunchOption = {
    name: string;
    executable: string;
    arguments: string | string[];
}

interface Media {
    headerUrl?: string | Record<string, Record<string, string>>
    capsuleUrl?: string | Record<string, Record<string, string>>;
}

interface GameMedia extends Media {
    iconUrl?: string;
    logoUrl?: string | Record<string, Record<string, string>>;
    heroUrl?: string | Record<string, Record<string, string>>;
}

export interface NormalizedSoftware {
    id: string | Record<string, string>;
    source: 'steam' | 'epic' | 'itch' | 'osu' | 'deadforge';
    name: string | Record<string, string>;
    sizeBytes?: number;
    media?: Media;
    raw?: any;
    type: string
}

export interface NormalizedGame extends NormalizedSoftware {
    installPath?: string;
    launchOptions?: LaunchOption[];
    media?: GameMedia;
}

export interface NormalizedDLC extends NormalizedSoftware {
    parentGameId: string;
}

export interface NormalizedGameJoin {
    id: number;
    clients: Record<string, NormalizedGame>;
    defaultClient: string;
    preferences: Record<string, any>;
}

export interface NormalizedPseudoGameJoin {
    id: string;
    source: Record<string, NormalizedGame>
    defaultClient: string;
    preferences: Record<string, any>;
    type: "GameJoin";
}

export const steamLanguageMap: Record<string, string> = {
    "ar": "arabic",
    "bg": "bulgarian",
    "zh-CN": "schinese",
    "zh-TW": "tchinese",
    "cs": "czech",
    "da": "danish",
    "nl": "dutch",
    "en": "english",
    "fi": "finnish",
    "fr": "french",
    "de": "german",
    "el": "greek",
    "hu": "hungarian",
    "id": "indonesian",
    "it": "italian",
    "ja": "japanese",
    "ko": "koreana",
    "no": "norwegian",
    "pl": "polish",
    "pt": "portuguese",
    "pt-BR": "brazilian",
    "ro": "romanian",
    "ru": "russian",
    "es": "spanish",
    "es-419": "latam",
    "sv": "swedish",
    "th": "thai",
    "tr": "turkish",
    "uk": "ukrainian",
    "vi": "vietnamese"
}

export const steamLanguageMapFallbacks: Record<string, string[]> = {
    "sk": ["cs", "en"],
}