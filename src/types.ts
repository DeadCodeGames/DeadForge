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
            sendTrayResize: (width: number, height: number) => void;
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
            validateEpicExecutable: (executablePath: string) => Promise<boolean>,
            validateItchExecutable: (basePath: string) => Promise<string | null>,
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
            validateBackup: (path: string) => Promise<[true, Preferences] | [false, Record<never, never>]>,
            onboardingFinished: (data: any) => void,
            resetAllData: () => Promise<boolean>,
            restartApp: () => void,
            fetchGames: () => Promise<[NormalizedGame[], NormalizedDLC[], NormalizedGameJoin[], any[], any[]]>,
            onGamesUpdate: (callback: (event: IpcRendererEvent, games: NormalizedGame[], dlcs: NormalizedDLC[], gameJoins: NormalizedGameJoin[], curatedAssets: any[], customAssets: any[]) => void) => void,
            removeGamesUpdateListener: (callback: (event: IpcRendererEvent, games: NormalizedGame[], dlcs: NormalizedDLC[], gameJoins: NormalizedGameJoin[], curatedAssets: any[], customAssets: any[]) => void) => void,
            onGameProcessTerminated: (callback: (event: IpcRendererEvent, source: string, gameId: string) => void) => void,
            removeGameProcessTerminatedListener: (callback: (event: IpcRendererEvent, source: string, gameId: string) => void) => void,
            launchGame: (client: string, gameId: string | number, executable: string, args: string | string[]) => Promise<{success: boolean, error?: string}>,
            stopGame: (client: string, gameId: string | number) => Promise<{ success: boolean, error?: string }>,
            onTrayGameLaunch: (callback: (event: IpcRendererEvent, source: string, gameId: string, executable: string, args: string | string[]) => void) => void,
            onTrayGameStop: (callback: (event: IpcRendererEvent, source: string, gameId: string) => void) => void,
            checkRunningGames: (gameChecks: Array<{source: string, id: string}>) => Promise<Record<string, boolean>>,
            fetchCollections: () => Promise<{favourites: CollectionGame[], collections: Collection[]}>,
            sendCollections: (favourites: CollectionGame[], collections: Collection[]) => void,
            resolveDisplayPath: (path: string) => Promise<string>,
            fetchGameWarnings: (source: string, id: string) => Promise<{ success: boolean, data: GameWarning }>,
            saveMissingAssetsReport: (report: string) => void,
            updateArticles: () => Promise<{ success: boolean, error?: string }>,
            getArticles: () => Promise<ArticleList>,
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
    langUpdates: boolean,
    gameState: GameState
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

export interface Media {
    headerUrl?: string | Record<string, Record<string, string>>
    capsuleUrl?: string | Record<string, Record<string, string>>;
}

export interface GameMedia extends Media {
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
    lastPlayed?: number;
    totalPlayedFor?: number;
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

export const languageDisplayNames: Record<keyof typeof steamLanguageMap, string> = {
    ar: "العربية (Arabic)",
    bg: "Български (Bulgarian)",
    "zh-CN": "简体中文 (Simplified Chinese)",
    "zh-TW": "繁體中文 (Traditional Chinese)",
    cs: "Čeština (Czech)",
    da: "Dansk (Danish)",
    nl: "Nederlands (Dutch)",
    en: "English",
    fi: "Suomi (Finnish)",
    fr: "Français (French)",
    de: "Deutsch (German)",
    el: "Ελληνικά (Greek)",
    hu: "Magyar (Hungarian)",
    id: "Bahasa Indonesia (Indonesian)",
    it: "Italiano (Italian)",
    ja: "日本語 (Japanese)",
    ko: "한국어 (Korean)",
    no: "Norsk (Norwegian)",
    pl: "Polski (Polish)",
    pt: "Português (Portuguese)",
    "pt-BR": "Português (Brasil)",
    ro: "Română (Romanian)",
    ru: "Русский (Russian)",
    es: "Español (Spanish)",
    "es-419": "Español (Latin America)",
    sv: "Svenska (Swedish)",
    th: "ไทย (Thai)",
    tr: "Türkçe (Turkish)",
    uk: "Українська (Ukrainian)",
    vi: "Tiếng Việt (Vietnamese)",
}

export const steamLanguageMapFallbacks: Record<string, string[]> = {
    "sk": ["cs", "en"],
}

export type Filters = {
    search: string;
    launchable: boolean;
    favourite: boolean;
}

export type Sorting = {
    sort: "name" | "recent";
    direction: "asc" | "desc";
}

export type Collection = {
    id: string;
    name: string;
    games: CollectionGame[];
}

export type CollectionGame = {
    source: string;
    id: string;
}

export type GameState = {
    state: 'launching' | 'running' | 'stopping' | 'idle';
    gameId: string;
    source: string;
}

export type GameStates = Record<string, GameState>;

export interface GameMatch {
    source: string;
    id: string;
}

export interface GameNote {
    type: 'security_warning' | 'compatibility_warning' | 'content_warning';
    severity: 'low' | 'medium' | 'high' | 'none';
    title: string;
    description: string;
    recommendation?: string;
}

export interface GameWarning {
    matches: GameMatch[];
    notes: GameNote[];
}

export interface ArticleAuthor {
    name: string;
    link: string;
    profilePicture: string;
}

export interface Article {
    title: string;
    authors: ArticleAuthor[];
    bannerImage: string;
    assetsMap: Record<string, string>;
    content: string;
    publishDate: string;
    lastModified: string;
    tags: string[];
    slug: string;
}

export interface ArticleList {
    articles: Article[];
}