import i18n from '@/locales/i18n';
import { NormalizedGame, LaunchOption, steamLanguageMap, NormalizedDLC, NormalizedGameJoin, Sorting, Filters, Collection, CollectionGame, GameMedia, Media, GameState, GameStates, steamLanguageMapFallbacks } from '@/types';
import React, { createContext, useState, useLayoutEffect, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { checkMissingAssets, formatReportForGitHub } from './utils/assetChecker';
import InstallModal from "./components/InstallModal";

export const LibraryContext = createContext<{
    games: NormalizedGame[];
    dlcs: NormalizedDLC[];
    gameJoins: NormalizedGameJoin[];
    curatedAssets: any[];
    customAssets: any[];
    collections: Collection[];
    favourites: CollectionGame[];
    lastVisitedLibraryLocation: string;
    gameStates: GameStates;
    launchTimestamps: Record<string, number>;
    setGames: React.Dispatch<React.SetStateAction<NormalizedGame[]>>;
    setDLCs: React.Dispatch<React.SetStateAction<NormalizedDLC[]>>;
    setGameJoins: React.Dispatch<React.SetStateAction<NormalizedGameJoin[]>>;
    setCollections: React.Dispatch<React.SetStateAction<Collection[]>>;
    setFavourites: React.Dispatch<React.SetStateAction<CollectionGame[]>>;
    // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
    setGameState: (gameId: string, source: string, state: GameState['state'], progress?: number | string, extraNumberA?: number, extraNumberB?: number) => void;
    installModalState: { isOpen: boolean, game: NormalizedGame | null };
    openInstallModal: (game: NormalizedGame) => void;
    closeInstallModal: () => void;
        }>({
            games: [],
            dlcs: [],
            gameJoins: [],
            curatedAssets: [],
            customAssets: [],
            collections: [],
            favourites: [],
            lastVisitedLibraryLocation: '/library',
            gameStates: {},
            launchTimestamps: {},
            setGames: () => { },
            setDLCs: () => { },
            setGameJoins: () => { },
            setCollections: () => { },
            setFavourites: () => { },
            setGameState: () => { },
            installModalState: { isOpen: false, game: null },
            openInstallModal: () => { },
            closeInstallModal: () => { },
        });

export const LibrarySidebarContext = createContext<{
    filters: Filters;
    sorting: Sorting;
    showFilters: boolean;
    sortingExpanded: boolean;
    filterExpanded: boolean;
    // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
    setShowFilters: (showFilters: boolean | ((prev: boolean) => boolean)) => void;
    // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
    setSortingExpanded: (sortingExpanded: boolean | ((prev: boolean) => boolean)) => void;
    // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
    setFilterExpanded: (filterExpanded: boolean | ((prev: boolean) => boolean)) => void;
    // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
    setFilters: (filters: Filters | ((prev: Filters) => Filters)) => void;
    // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
    setSorting: (sorting: Sorting | ((prev: Sorting) => Sorting)) => void;
        }>({
            filters: {
                search: "",
                launchable: false,
                favourite: false,
            },
            sorting: {
                sort: "name",
                direction: "asc",
            },
            showFilters: false,
            sortingExpanded: false,
            filterExpanded: false,
            setShowFilters: () => { },
            setSortingExpanded: () => { },
            setFilterExpanded: () => { },
            setFilters: () => { },
            setSorting: () => { },
        });

const LibrarySidebarContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [showFilters, setShowFilters] = useState<boolean>(false);
    const [sortingExpanded, setSortingExpanded] = useState<boolean>(false);
    const [filterExpanded, setFilterExpanded] = useState<boolean>(false);
    const [filters, setFilters] = useState<Filters>({
        search: "",
        launchable: false,
        favourite: false,
    });
    const [sorting, setSorting] = useState<Sorting>({
        sort: "name",
        direction: "asc",
    });
    
    return (
        <LibrarySidebarContext.Provider value={{ showFilters, setShowFilters, sortingExpanded, setSortingExpanded, filterExpanded, setFilterExpanded, filters, setFilters, sorting, setSorting }}>
            {children}
        </LibrarySidebarContext.Provider>
    );
}

const LibraryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [games, setGames] = useState<NormalizedGame[]>([]);
    const [dlcs, setDLCs] = useState<NormalizedDLC[]>([]);
    const [gameJoins, setGameJoins] = useState<NormalizedGameJoin[]>([]);
    const [curatedAssets, setCuratedAssets] = useState<any[]>([]);
    const [customAssets, setCustomAssets] = useState<any[]>([]);
    const [canSendCollections, setCanSendCollections] = useState<boolean>(false);
    const [favourites, setFavourites] = useState<CollectionGame[]>([]);
    const [collections, setCollections] = useState<Collection[]>([]);
    const [gameStates, setGameStates] = useState<GameStates>({});
    const [launchTimestamps, setLaunchTimestamps] = useState<Record<string, number>>({});
    const location = useLocation();
    // hack for persisting the library location when switching tabs
    const [lastVisitedLibraryLocation, setLastVisitedLibraryLocation] = useState<string>('/library');
    const [installModalState, setInstallModalState] = useState<{ isOpen: boolean, game: NormalizedGame | null }>({ isOpen: false, game: null });
    const openInstallModal = (game: NormalizedGame) => setInstallModalState({ isOpen: true, game });
    const closeInstallModal = () => setInstallModalState({ isOpen: false, game: null });

    const setGameState = (gameId: string, source: string, state: GameState['state'], progress?: number | string, extraA?: number, extraB?: number) => {
        setGameStates(prev => {
            const key = `${source}-${gameId}`;
            if (state === 'idle') {
                // Remove launch timestamp when game goes idle
                setLaunchTimestamps(prev => {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
                    const { [key]: _, ...rest } = prev;
                    return rest;
                });
                // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
                const { [key]: _, ...rest } = prev;
                return rest;
            }
            if (state === 'launching') {
                // Add launch timestamp when game starts launching
                setLaunchTimestamps(prev => ({
                    ...prev,
                    [key]: Date.now()
                }));
            }
            return {
                ...prev,
                [key]: { state, gameId, source, progress: !(progress === null || progress === undefined) ? progress : prev?.[key]?.progress, extraNumberA: extraA, extraNumberB: extraB }
            };
        });
    };

    useLayoutEffect(() => {
        document.documentElement.setAttribute('data-location', location.pathname.replace(/(?<!^)\/$/, ''));
        // hack for persisting the library location when switching tabs
        if (location.pathname.replace(/(?<!^)\/$/, '').startsWith('/library')) {
            setLastVisitedLibraryLocation(location.pathname.replace(/(?<!^)\/$/, ''));
        }
    }, [location]);

    useEffect(() => {
        if (window.Electron.isSettingsWindow || window.Electron.isNotificationsWindow) return;
        const fetchInitialGames = async () => {
            try {
                // eslint-disable-next-line prefer-const
                let [fetchedGames, fetchedDLCs, fetchedGameJoins, fetchedCuratedAssets, fetchedCustomAssets] = await window.Electron.fetchGames();
                fetchedGames = fetchedGames.map(game => {
                    let name;
                    try {
                        name = JSON.parse(game.name as any as string);
                    } catch {
                        name = game.name;
                    }
                    try {
                        if (game.source === "deadforge") console.log(game.media)
                        game.media = JSON.parse(game.media as any as string);
                    } catch {
                        game.media = game.media as GameMedia;
                    }
                    return {
                        ...game,
                        name,
                        launchOptions: JSON.parse(game.launchOptions as any as string) as LaunchOption[]
                    }
                });
                fetchedDLCs = fetchedDLCs.map(dlc => {
                    let name;
                    try {
                        name = JSON.parse(dlc.name as any as string);
                    } catch {
                        name = dlc.name;
                    }
                    try {
                        dlc.media = JSON.parse(dlc.media as any as string);
                    } catch {
                        dlc.media = dlc.media as Media;
                    }
                    return { ...dlc, name };
                });
                console.log(fetchedGames, fetchedDLCs, fetchedGameJoins, fetchedCuratedAssets, fetchedCustomAssets);
                setGames(fetchedGames);
                setDLCs(fetchedDLCs);
                setGameJoins(fetchedGameJoins);
                setCuratedAssets(fetchedCuratedAssets);
                setCustomAssets(fetchedCustomAssets);

                // Check which games are currently running
                const gameChecks = fetchedGames
                    .filter(game => game.launchOptions && game.launchOptions.length > 0)
                    .map(game => ({ source: game.source, id: game.id as string }));
                
                const runningStates = await window.Electron.checkRunningGames(gameChecks);
                
                // Update game states based on running processes
                Object.entries(runningStates).forEach(([key, isRunning]) => {
                    // Use a different separator (|) that won't conflict with negative numbers
                    const [source, gameId] = key.split('|');
                    if (isRunning) {
                        setGameState(gameId, source, 'running');
                    }
                });

                // Check for missing assets
                const missingAssetReports = await checkMissingAssets(fetchedGames, fetchedCuratedAssets);
                if (missingAssetReports.length > 0) {
                    const report = formatReportForGitHub(missingAssetReports);
                    const reportString = `---MISSING_ASSETS_REPORT_BEGIN---\n${report}\n---MISSING_ASSETS_REPORT_END---`;
                    console.warn(reportString);
                    window.Electron.saveMissingAssetsReport(reportString);
                }
            } catch (error) {
                console.error('Failed to fetch games:', error);
            }
        };

        fetchInitialGames();

        const handleGamesUpdate = async (_event: any, updatedGames: NormalizedGame[], updatedDLCs: NormalizedDLC[], updatedGameJoins: NormalizedGameJoin[], updatedCuratedAssets: any[], updatedCustomAssets: any[]) => {
            updatedGames = updatedGames.map(game => {
                let name;
                try {
                    name = JSON.parse(game.name as any as string);
                } catch {
                    name = game.name;
                }
                try {
                    game.media = JSON.parse(game.media as any as string);
                } catch {
                    game.media = game.media as GameMedia;
                }
                return {
                    ...game,
                    name,
                    launchOptions: JSON.parse(game.launchOptions as any as string) as LaunchOption[]
                }
            });
            updatedDLCs = updatedDLCs.map(dlc => {
                let name;
                try {
                    name = JSON.parse(dlc.name as any as string);
                } catch {
                    name = dlc.name;
                }
                try {
                    dlc.media = JSON.parse(dlc.media as any as string);
                } catch {
                    dlc.media = dlc.media as Media;
                }
                return { ...dlc, name };
            });
            console.log(updatedGames, updatedDLCs, updatedGameJoins, updatedCuratedAssets, updatedCustomAssets);
            setGames(updatedGames);
            setDLCs(updatedDLCs);
            setGameJoins(updatedGameJoins);
            setCuratedAssets(updatedCuratedAssets);
            setCustomAssets(updatedCustomAssets);

            // Check which games are currently running
            const gameChecks = updatedGames
                .filter(game => game.launchOptions && game.launchOptions.length > 0)
                .map(game => ({ source: game.source, id: game.id as string }));
            
            const runningStates = await window.Electron.checkRunningGames(gameChecks);
            
            // Update game states based on running processes
            Object.entries(runningStates).forEach(([key, isRunning]) => {
                // Use a different separator (|) that won't conflict with negative numbers
                const [source, gameId] = key.split('|');
                if (isRunning) {
                    setGameState(gameId, source, 'running');
                }
            });

            // Check for missing assets
            const missingAssetReports = await checkMissingAssets(updatedGames, updatedCuratedAssets);
            if (missingAssetReports.length > 0) {
                const report = formatReportForGitHub(missingAssetReports);
                const reportString = `---MISSING_ASSETS_REPORT_BEGIN---\n${report}\n---MISSING_ASSETS_REPORT_END---`;
                console.warn(reportString);
                window.Electron.saveMissingAssetsReport(reportString);
            }
        };

        // Add process termination listener
        const handleGameProcessTerminated = (_event: any, source: string, gameId: string) => {
            console.log(`Game process terminated: ${source}-${gameId}`);
            setGameState(gameId, source, 'idle');
        };

        window.Electron.onGamesUpdate(handleGamesUpdate);
        window.Electron.onGameProcessTerminated(handleGameProcessTerminated);

        const fetchCollections = async () => {
            try {
                const collections = await window.Electron.fetchCollections();
                setCollections(collections.collections);
                setFavourites(collections.favourites);
                setCanSendCollections(true);
            } catch (error) {
                console.error('Failed to fetch collections:', error);
                setCanSendCollections(true);
            }
        };

        fetchCollections();

        return () => {
            window.Electron.removeGamesUpdateListener(handleGamesUpdate);
            window.Electron.removeGameProcessTerminatedListener(handleGameProcessTerminated);
        };
    }, []);

    useEffect(() => {
        if (canSendCollections) {
            window.Electron.sendCollections(favourites, collections);
        }
    }, [collections, favourites, canSendCollections]);

    useEffect(() => {
        if (window.Electron.isTray) return;

        const handleTrayGameLaunch = (_event: any, source: string, gameId: string, executable: string, args: string | string[]) => {
            console.log(`Tray game launch: ${source}-${gameId}`);
            setGameState(gameId, source, 'launching');
            window.Electron.launchGame(source, gameId, executable, args).then(result => {
                if (result.success) {
                    setGameState(gameId, source, 'running');
                } else {
                    setGameState(gameId, source, 'idle');
                }
            });
        };

        const handleTrayGameStop = (_event: any, source: string, gameId: string) => {
            console.log(`Tray game stop: ${source}-${gameId}`);
            setGameState(gameId, source, 'stopping');
            window.Electron.stopGame(source, gameId).then(result => {
                if (result.success) {
                    setGameState(gameId, source, 'idle');
                } else {
                    setGameState(gameId, source, 'running');
                }
            });
        };

        const handleGameStateChange = (_event: any, source: string, gameId: string, state: GameState['state'], progress?: number | string, extraA?: number, extraB?: number) => {
            console.log(gameId, source, state, progress, extraA, extraB);
            setGameState(gameId, source, state, progress, extraA, extraB);
        };

        window.Electron.onTrayGameLaunch(handleTrayGameLaunch);
        window.Electron.onTrayGameStop(handleTrayGameStop);
        window.Electron.onGameStateChange(handleGameStateChange);

        return () => {
            window.Electron.onTrayGameLaunch(() => {});
            window.Electron.onTrayGameStop(() => {});
            window.Electron.removeGameStateChangeListener(handleGameStateChange);
        };
    }, []);

    return (
        <LibraryContext.Provider value={{ 
            games, 
            dlcs, 
            gameJoins,
            curatedAssets,
            customAssets,
            collections, 
            favourites, 
            lastVisitedLibraryLocation, 
            gameStates,
            launchTimestamps,
            setGames, 
            setDLCs, 
            setGameJoins, 
            setCollections, 
            setFavourites,
            setGameState,
            installModalState,
            openInstallModal,
            closeInstallModal
        }}>
            <LibrarySidebarContextProvider>
                {children}
            </LibrarySidebarContextProvider>
            <InstallModal
                isOpen={installModalState.isOpen}
                onClose={closeInstallModal}
                onInstall={async (installPath) => {
                    if (!installModalState.game) return;
                    try {
                        const gameId = typeof installModalState.game.id === "object" ? JSON.stringify(installModalState.game.id) : installModalState.game.id;
                        const result = await window.Electron.installGame(gameId, installPath, installModalState.game.updateAvailable === "reinstall");
                        if (!result.success) {
                            console.error("Failed to install game:", result.error);
                        } else {
                            console.log(result);
                            closeInstallModal();
                        }
                    } catch (error) {
                        console.error("Failed to install game:", error);
                    }
                }}
                game={installModalState.game as any}
            />
        </LibraryContext.Provider>
    );
};

export function getLocalizedGameSuffix(defaultSuffix: string = "default") {
    const lang = i18n.language;
    // Try direct match
    const direct = Object.entries(steamLanguageMap).find(([key]) => lang.startsWith(key.replace('-', '_')))?.[0] as string;
    if (direct && steamLanguageMap[direct]) {
        return steamLanguageMap[direct];
    }
    // Try fallbacks
    const fallbackKeys = Object.keys(steamLanguageMapFallbacks);
    const fallbackKey = fallbackKeys.find(key => lang.startsWith(key.replace('-', '_')));
    if (fallbackKey) {
        for (const fb of steamLanguageMapFallbacks[fallbackKey]) {
            if (steamLanguageMap[fb]) {
                return steamLanguageMap[fb];
            }
        }
    }
    return defaultSuffix;
}

export function getLocalizedGameName(game: NormalizedGame | NormalizedDLC, extraOptions?: "deprefix", games: NormalizedGame[] | NormalizedDLC[] = [], deprefixerGame?: NormalizedGame) {
    if (!game) return "";
    if (typeof game.name === 'string' && extraOptions !== "deprefix") return game.name;
    const suffix = getLocalizedGameSuffix();
    if (extraOptions === "deprefix") {
        const removeCommonPrefix = (list: string[], test: string): string => {
            if (deprefixerGame) {
                const gameName = getLocalizedGameName(deprefixerGame), defaultGameName = (typeof deprefixerGame.name === 'string' ? deprefixerGame.name : deprefixerGame.name["default"]);
        
                if (gameName) {
                    const cleanedPrefix = gameName.trim();

                    const prefixMatch = test.startsWith(cleanedPrefix)
                        ? test.slice(cleanedPrefix.length).match(/^[:\-–—|>~\s]+/)
                        : null;
        
                    const totalPrefixLength = cleanedPrefix.length + (prefixMatch?.[0].length ?? 0);
        
                    return test.startsWith(cleanedPrefix)
                        ? test.slice(totalPrefixLength)
                        : test;
                }

                if (defaultGameName) {
                    const cleanedPrefix = defaultGameName.trim();

                    const prefixMatch = test.startsWith(cleanedPrefix)
                        ? test.slice(cleanedPrefix.length).match(/^[:\-–—|>~\s]+/)
                        : null;
                
                    const totalPrefixLength = cleanedPrefix.length + (prefixMatch?.[0].length ?? 0);
        
                    return test.startsWith(cleanedPrefix)
                        ? test.slice(totalPrefixLength)
                        : test;
                }
            }
        
            if (list.length === 0) return test;

            let prefix = list[0];
            for (let i = 1; i < list.length; i++) {
                let j = 0;
                while (j < prefix.length && j < list[i].length && prefix[j] === list[i][j]) {
                    j++;
                }
                prefix = prefix.slice(0, j);
                if (prefix === '') break;
            }

            const safeChars = [' ', '-', '_', ':', '|', '>'];
            let safeIndex = -1;
            for (let i = prefix.length - 1; i >= 0; i--) {
                if (safeChars.includes(prefix[i])) {
                    safeIndex = i + 1; // Keep the delimiter
                    break;
                }
            }
        
            const safePrefix = safeIndex >= 0 ? prefix.slice(0, safeIndex) : '';
            
            // Step 3: Remove the safe prefix from the test string
            return test.startsWith(safePrefix) ? test.slice(safePrefix.length) : test;
        };
        
        return removeCommonPrefix(games.map(game => typeof game.name === 'string' ? game.name : (game.name[suffix] || game.name["default"])), typeof game.name === 'string' ? game.name : (game.name[suffix] || game.name["default"]));
    } else if (typeof game.name === 'string') {
        return game.name;
    } else {
        return game.name[suffix] || game.name["default"];
    }
}

// Components
export { default as LibrarySidebar } from './components/LibrarySidebar';
export { default as LibraryLayout } from './components/LibraryLayout';

// Views
export { default as LibraryHome } from './views/LibraryHome';
export { default as LibraryGame } from './views/LibraryGame';
export { default as LibraryCollections } from './views/LibraryCollections';
export { default as LibraryCollection } from './views/LibraryCollection';
export { default as LibraryAll } from './views/LibraryAll';
export { default as LibraryFavourites } from './views/LibraryFavourites';
export { default as LibraryRecent } from './views/LibraryRecent';

// Export LibraryProvider as default
export default LibraryProvider;
