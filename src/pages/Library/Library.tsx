import i18n from '@/locales/i18n';
import { NormalizedGame, LaunchOption, steamLanguageMap, NormalizedDLC, NormalizedGameJoin } from '@/types';
import React, { createContext, useState, useLayoutEffect, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const LibraryContext = createContext<{
    games: NormalizedGame[];
    dlcs: NormalizedDLC[];
    gameJoins: NormalizedGameJoin[];
    collections: any[];
    lastVisitedLibraryLocation: string;
    setGames: React.Dispatch<React.SetStateAction<NormalizedGame[]>>;
    setDLCs: React.Dispatch<React.SetStateAction<NormalizedDLC[]>>;
    setGameJoins: React.Dispatch<React.SetStateAction<NormalizedGameJoin[]>>;
    setCollections: React.Dispatch<React.SetStateAction<any[]>>;
}>({
    games: [],
    dlcs: [],
    gameJoins: [],
    collections: [],
    lastVisitedLibraryLocation: '/library',
    setGames: () => { },
    setDLCs: () => { },
    setGameJoins: () => { },
    setCollections: () => { },
});

const LibraryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [games, setGames] = useState<NormalizedGame[]>([]);
    const [dlcs, setDLCs] = useState<NormalizedDLC[]>([]);
    const [gameJoins, setGameJoins] = useState<NormalizedGameJoin[]>([]);
    const [collections, setCollections] = useState<any[]>([]);
    const location = useLocation();
    // hack for persisting the library location when switching tabs
    const [lastVisitedLibraryLocation, setLastVisitedLibraryLocation] = useState<string>('/library');

    useLayoutEffect(() => {
        document.documentElement.setAttribute('data-location', location.pathname.replace(/(?<!^)\/$/, ''));
        // hack for persisting the library location when switching tabs
        if (location.pathname.replace(/(?<!^)\/$/, '').startsWith('/library')) {
            setLastVisitedLibraryLocation(location.pathname.replace(/(?<!^)\/$/, ''));
        }
    }, [location]);

    useEffect(() => {
        const fetchInitialGames = async () => {
            try {
                let [fetchedGames, fetchedDLCs, fetchedGameJoins] = await window.Electron.fetchGames();
                fetchedGames = fetchedGames.map(game => {
                    let name;
                    try {
                        name = JSON.parse(game.name as any as string);
                    } catch (error) {
                        name = game.name;
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
                    } catch (error) {
                        name = dlc.name;
                    }
                    return { ...dlc, name };
                });
                /*fetchedGames.push({
                    id: 'stable',
                    name: 'osu!',
                    source: 'osu',
                    installPath: 'C:\\Users\\kanskje\\AppData\\Local\\osu!',
                    media: {
                        logoUrl: `${process.env.PUBLIC_URL}/assets/osu!wordmark.svg`
                    },
                    launchOptions: [{
                        name: 'Test Option',
                        executable: 'test.exe',
                        arguments: 'test_arg'
                    }],
                    type: 'Game'
                });*/
                setGames(fetchedGames);
                setDLCs(fetchedDLCs);
                setGameJoins(fetchedGameJoins);
            } catch (error) {
                console.error('Failed to fetch games:', error);
            }
        };

        fetchInitialGames();

        const handleGamesUpdate = (_event: any, updatedGames: NormalizedGame[], updatedDLCs: NormalizedDLC[], updatedGameJoins: NormalizedGameJoin[]) => {
            updatedGames = updatedGames.map(game => {
                let name;
                try {
                    name = JSON.parse(game.name as any as string);
                } catch (error) {
                    name = game.name;
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
                } catch (error) {
                    name = dlc.name;
                }
                return { ...dlc, name };
            });
            /*updatedGames.push({
                id: 'osu-stable',
                name: 'osu!',
                source: 'osu',
                installPath: 'C:\\Users\\kanskje\\AppData\\Local\\osu!',
                media: {
                    logoUrl: `${process.env.PUBLIC_URL}/assets/osu!wordmark.svg`,
                    heroUrl: `${process.env.PUBLIC_URL}/assets/osu!hero.jpg`
                },
                launchOptions: [{
                    name: 'Test Option',
                    executable: 'test.exe',
                    arguments: 'test_arg'
                }],
                type: 'Game'
            });*/
            console.log(updatedGames, updatedDLCs, updatedGameJoins);
            setGames(updatedGames);
            setDLCs(updatedDLCs);
            setGameJoins(updatedGameJoins);
        };

        window.Electron.onGamesUpdate(handleGamesUpdate);

        return () => {
            window.Electron.removeGamesUpdateListener(handleGamesUpdate);
        };
    }, []);

    return (
        <LibraryContext.Provider value={{ games, dlcs, gameJoins, collections, lastVisitedLibraryLocation, setGames, setDLCs, setGameJoins, setCollections }}>
            {children}
        </LibraryContext.Provider>
    );
};

export function getLocalizedGameSuffix(defaultSuffix: string = "default") {
    return steamLanguageMap[Object.entries(steamLanguageMap).find(([key, value]) => i18n.language.startsWith(key.replace('-', '_')))?.[0] as string] || defaultSuffix;
}

export function getLocalizedGameName(game: NormalizedGame | NormalizedDLC, extraOptions?: "deprefix", games: NormalizedGame[] | NormalizedDLC[] = [], deprefixerGame?: NormalizedGame) {
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

// Export LibraryProvider as default
export default LibraryProvider;
