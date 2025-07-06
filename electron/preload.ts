import { contextBridge, ipcRenderer } from 'electron';
import { OldPreferences, Preferences } from './preferences';
import { SteamGameObject } from './steamTypes';
import { Collection, CollectionGame, NormalizedDLC, NormalizedGame, NormalizedGameJoin } from './types';
const path = require('path');
const { pathToFileURL } = require('url');

contextBridge.exposeInMainWorld('Electron', {
    isTray: false,
    isSettingsWindow: false,
    isNotificationsWindow: false,
    storePreload: pathToFileURL(path.join(__dirname, 'store.preload.js')).href,
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    isMaximized: (): Promise<boolean> => ipcRenderer.invoke('window:isMaximized'),
    close: () => ipcRenderer.invoke('window:close'),
    reload: () => ipcRenderer.invoke('app:reload'),

    onMaximize: (callback: () => void) => ipcRenderer.on('browser-window-maximize', callback),
    onUnmaximize: (callback: () => void) => ipcRenderer.on('browser-window-unmaximize', callback),

    getPreferences: (): Promise<{preferences: Preferences, v1PrefsAvailable: boolean, legacyPrefs: OldPreferences | undefined}> => ipcRenderer.invoke('preferences:get'),
    setPreferences: (preferences: object, isSettingsOpen: boolean, fromSettingsWindow: boolean) => ipcRenderer.invoke('preferences:set', preferences, isSettingsOpen, fromSettingsWindow),
    // eslint-disable-next-line no-unused-vars
    onPreferencesUpdate: (callback: (event: Electron.IpcRendererEvent, newPrefs: Preferences) => void) => ipcRenderer.on('preferences:update', callback),

    onTrayNavigate: (callback: () => void) => ipcRenderer.on('tray:navigate', callback),
    openSettingsWindow: () => ipcRenderer.send('window:openSettingsWindow'),

    showOpenDialog: (options: any) => ipcRenderer.invoke("dialog:showOpenDialog", options),

    getSteamGamesData: (path: string): Promise<SteamLauncherData | null> => ipcRenderer.invoke('steam:getGamesData', path),
    getEpicGamesData: (path: string): Promise<any | null> => ipcRenderer.invoke('epic:getGamesData', path),
    getItchGamesData: (path: string): Promise<any | null> => ipcRenderer.invoke('itch:getGamesData', path),

    validateEpicExecutable: (executablePath: string): Promise<boolean> => ipcRenderer.invoke('validate:epicExecutable', executablePath),
    validateItchExecutable: (basePath: string): Promise<string | null> => ipcRenderer.invoke('validate:itchExecutable', basePath),

    exportBackup: (): Promise<string | { canceled: true }> => ipcRenderer.invoke('backup:export'),
    importBackup: (): Promise<[string, Preferences] | { canceled: true }> => ipcRenderer.invoke('backup:import'),
    validateBackup: (path: string): Promise<[true, Preferences] | [false, Record<never, never>]> => ipcRenderer.invoke('backup:validate', path),
    onboardingFinished: (data: any) => ipcRenderer.invoke('onboarding:finished', data),
    
    fetchGames: (): Promise<[NormalizedGame[], NormalizedDLC[], NormalizedGameJoin[], any[], any[]]> => ipcRenderer.invoke('games:fetch'),
    // eslint-disable-next-line no-unused-vars
    onGamesUpdate: (callback: (event: any, games: NormalizedGame[], dlcs: NormalizedDLC[], gameJoins: NormalizedGameJoin[]) => void) => ipcRenderer.on('games:update', callback),
    // eslint-disable-next-line no-unused-vars
    removeGamesUpdateListener: (callback: (event: any, games: NormalizedGame[], dlcs: NormalizedDLC[], gameJoins: NormalizedGameJoin[]) => void) => ipcRenderer.removeListener('games:update', callback),

    // Comprehensive game launch function that handles execution and lastPlayed update
    launchGame: (client: string, gameId: string | number, executable: string, args: string | string[]): Promise<{success: boolean, error?: string}> => 
        ipcRenderer.invoke('game:launch', client, gameId, executable, args),

    // Stop a running game
    stopGame: (client: string, gameId: string | number): Promise<{success: boolean, error?: string}> =>
        ipcRenderer.invoke('game:stop', client, gameId),

    // eslint-disable-next-line no-unused-vars
    onTrayGameLaunch: (callback: (event: any, source: string, gameId: string, executable: string, args: string | string[]) => void) => ipcRenderer.on('game:trayLaunch', callback),
    // eslint-disable-next-line no-unused-vars
    onTrayGameStop: (callback: (event: any, source: string, gameId: string) => void) => ipcRenderer.on('game:trayStop', callback),  

    // Check which games are currently running
    checkRunningGames: (gameChecks: Array<{source: string, id: string}>): Promise<Record<string, boolean>> =>
        ipcRenderer.invoke('games:checkRunning', gameChecks),

    fetchCollections: (): Promise<{favourites: CollectionGame[], collections: Collection[]}> => ipcRenderer.invoke('collections:fetch'),
    sendCollections: (favourites: CollectionGame[], collections: Collection[]) => ipcRenderer.invoke('collections:send', favourites, collections),

    // Game process termination handlers
    // eslint-disable-next-line no-unused-vars
    onGameProcessTerminated: (callback: (event: any, source: string, gameId: string) => void) => ipcRenderer.on('game:processTerminated', callback),
    // eslint-disable-next-line no-unused-vars
    removeGameProcessTerminatedListener: (callback: (event: any, source: string, gameId: string) => void) => ipcRenderer.removeListener('game:processTerminated', callback),

    // Resolves display paths for special constants (e.g., CONST_ITCHEXEC)
    resolveDisplayPath: (path: string): Promise<string> => ipcRenderer.invoke('path:resolveDisplayPath', path),

    fetchGameWarnings: (source: string, id: string): Promise<{success: boolean, data: any}> => ipcRenderer.invoke('fetch-game-warnings', { source, id }),

    selectCustomAsset: () => ipcRenderer.invoke('selectCustomAsset'),
    saveCustomAsset: (params: { source: string, gameId: string, assetType: 'hero' | 'logo', filePath: string }) => 
        ipcRenderer.invoke('saveCustomAsset', params),
    updateLogoPosition: (params: { source: string, gameId: string, position: { pinned_position: string, width_pct: number, height_pct: number } }) => 
        ipcRenderer.invoke('updateLogoPosition', params),
    saveMissingAssetsReport: (report: string) => ipcRenderer.invoke('saveMissingAssetsReport', report),

    // Add new handlers
    resetAllData: () => ipcRenderer.invoke('app:resetAllData'),
    restartApp: () => ipcRenderer.invoke('app:restart'),

    // Add article methods
    updateArticles: () => ipcRenderer.invoke('articles:update'),
    getArticles: async () => {
        interface RawArticle {
            title: string;
            authors: Array<{
                name: string;
                link: string;
                profilePicture: {
                    filePath: string;
                    remoteUrl: string;
                };
            }>;
            assetsMap: Record<string, string>;
            bannerImage: {
                filePath: string;
                remoteUrl: string;
            };
            content: string;
            publishDate: string;
            lastModified: string;
            tags: string[];
            slug: string;
        }

        const rawArticles = await ipcRenderer.invoke('articles:get') as { articles: RawArticle[] };

        return {
            articles: rawArticles.articles.map(article => ({
                title: article.title,
                authors: article.authors.map(author => ({
                    name: author.name,
                    link: author.link,
                    profilePicture: author.profilePicture.filePath
                })),
                assetsMap: article.assetsMap,
                bannerImage: article.bannerImage.filePath,
                content: article.content,
                publishDate: article.publishDate,
                lastModified: article.lastModified,
                tags: article.tags,
                slug: article.slug
            }))
        };
    },
    // eslint-disable-next-line no-unused-vars
    onProtocolNavigation: (callback: (event: any, protocolURL: string) => void) => ipcRenderer.on('protocol:navigate', callback),
    getDefaultInstallPath: (gameId: string) => ipcRenderer.invoke('library:getDefaultGameInstallPath', gameId),
    installGame: (gameId: string, installPath: string, reinstall?: boolean) => ipcRenderer.invoke('library:startGameInstall', gameId, installPath, reinstall),
    updateGame: (gameId: string) => ipcRenderer.invoke('library:startGameUpdate', gameId),
    getDownloadSize: (gameId: string) => ipcRenderer.invoke('game:getDownloadSize', gameId),

    // Game state change handler
    // eslint-disable-next-line no-unused-vars
    onGameStateChange: (callback: (event: any, source: string, gameId: string, state: string, progress?: number | string, extraNumberA?: number, extraNumberB?: number) => void) => 
        ipcRenderer.on('game:stateChange', callback),
    // eslint-disable-next-line no-unused-vars
    removeGameStateChangeListener: (callback: (event: any, source: string, gameId: string, state: string, progress?: number | string, extraNumberA?: number, extraNumberB?: number) => void) => 
        ipcRenderer.removeListener('game:stateChange', callback),

    getGameMetrics: (source: string, gameId: string) => ipcRenderer.invoke('metrics:getGameMetrics', { source, gameId }),
});

contextBridge.exposeInMainWorld('Process', {
    platform: process.platform,
    username: process.env.USERNAME || process.env.USER,
    versions: {
        chrome: process.versions.chrome,
        node: process.versions.node,
        electron: process.versions.electron,
        deadforge: process.argv.find((arg: string) => arg.startsWith('--deadforgeVersion'))?.split('=')[1]
    }
})

contextBridge.exposeInMainWorld('App', {
    isPackaged: process.argv.find((arg: string) => arg.startsWith('--isPackaged'))?.split('=')[1] === 'true' ? true : false
})

export type SteamLauncherData = {
    magic: string,
    e_universe: string,
    datasets: SteamGameObject[]
}