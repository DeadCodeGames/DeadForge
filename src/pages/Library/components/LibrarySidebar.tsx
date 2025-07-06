import React, { useContext, useMemo, useRef, useState, memo, useCallback } from 'react';
import { getLocalizedGameName, LibraryContext, LibrarySidebarContext } from '../Library';
import { Link, useNavigate } from 'react-router-dom';
import { SiEpicgames, SiItchdotio, SiSteam } from '@icons-pack/react-simple-icons';
import DEADCODELogo from '@/components/CustomElements/DEADCODELogo';
import { Collection, Filters, NormalizedGame, NormalizedGameJoin, NormalizedPseudoGameJoin, Sorting, GameState } from '@/types';
import Tooltip from '@/components/CustomElements/Tooltip';
import LibrarySidebarContextMenu from '@/pages/Library/components/LibrarySidebarContextMenu';
import CollectionContextMenu from '@/pages/Library/components/CollectionContextMenu';
import CollectionNameEditor from '@/pages/Library/components/CollectionNameEditor';
import { cn } from '@/lib/utils';
import { chunkGamesByCategory } from '@/pages/Library/utils/LibraryHelpers';
import { format } from 'date-fns';
import i18n, { dateFNSResources } from '@/locales/i18n';
import { useTranslation } from 'react-i18next';

export const GetSourceIcon = memo(function GetSourceIcon({source, keyProp, size = 16, className}: {source: string, keyProp?: any, size?: number, className?: string}) {
    switch (source) {
        case "steam":
            return <SiSteam size={size} key={keyProp} className={cn("flex-shrink-0 pointer-events-none", className)} style={{ width: size, height: size }} />
        case "epic":
            return <SiEpicgames size={size} key={keyProp} className={cn("flex-shrink-0 pointer-events-none", className)} style={{ width: size, height: size }} />
        case "itch":
            return <SiItchdotio size={size} key={keyProp} className={cn("flex-shrink-0 pointer-events-none", className)} style={{ width: size, height: size }} />
        case "osu":
            return <img src={process.env.PUBLIC_URL + "/assets/osu!wordmark.svg"} key={keyProp} alt="osu!" className={cn("flex-shrink-0 pointer-events-none", className)} style={{ width: size, height: size }} />
        case "deadforge":
            return <DEADCODELogo key={keyProp} className={cn("flex flex-row justify-center text-sm flex-shrink-0 pointer-events-none", className)} style={{ width: size, height: size }} />
        default:
            return <div key={keyProp} className={cn("text-lg material-symbols flex-shrink-0 pointer-events-none", className)} style={{ width: size, height: size }}>question_mark</div>
    }
})

const LibrarySidebar: React.FC = () => {
    const { games, gameJoins, gameStates, setGameState, customAssets, curatedAssets } = useContext(LibraryContext);
    const { filters, sorting, showFilters, sortingExpanded, filterExpanded, setShowFilters, setSortingExpanded, setFilterExpanded, setFilters, setSorting } = useContext(LibrarySidebarContext);
    const { collections, favourites, setCollections, setFavourites } = useContext(LibraryContext);
    const { t } = useTranslation();

    // Get the current date-fns locale for the current i18n language
    const dateFnsLocale = dateFNSResources[i18n.language as keyof typeof dateFNSResources] || dateFNSResources['en_001'];

    // Game context menu state
    const [contextMenu, setContextMenu] = useState<{
        visible: boolean;
        x: number;
        y: number;
        game: NormalizedGame | NormalizedPseudoGameJoin | null;
    }>({
        visible: false,
        x: 0,
        y: 0,
        game: null
    });

    // Collection context menu state
    const [collectionContextMenu, setCollectionContextMenu] = useState<{
        visible: boolean;
        x: number;
        y: number;
        collection: {
            id: string;
            name: string;
            isExpanded: boolean;
            isFavorites: boolean;
            isUserDefined: boolean;
            isTimeBasedCollection: boolean;
        } | null;
    }>({
        visible: false,
        x: 0,
        y: 0,
        collection: null
    });

    // Refs for collection checkboxes
    const collectionCheckboxRefs = useRef<Record<string, HTMLInputElement | null>>({});
    
    // State for tracking which collection is being renamed
    const [editingCollectionId, setEditingCollectionId] = useState<string | null>(null);

    const handleFilterChange = useCallback((filter: keyof Filters, value: boolean | string) => {
        setFilters(prev => ({ ...prev, [filter]: value }));
    }, [setFilters, filters])

    const handleSortChange = useCallback((sort: keyof Sorting) => {
        let newValue;
        switch (sort) {
            case "sort":
                newValue = sorting.sort === "name" ? "recent" : "name";
                break;
            case "direction":
                newValue = sorting.direction === "asc" ? "desc" : "asc";
                break;
            default:
                return;
        }
        setSorting(prev => ({ ...prev, [sort]: newValue }));
    }, [setSorting, sorting])

    const getSortingIcon = useCallback((sort: keyof Sorting) => {
        const icons: Record<keyof Sorting, Record<string, string>> = {
            "sort": {
                "name": "sort_by_alpha",
                "recent": "history"
            },
            "direction": {
                "asc": "arrow_upward",
                "desc": "arrow_downward"
            }
        }
        return icons[sort][sorting[sort]];
    }, [sorting])

    const gameJoinsPopulated = useMemo(() => gameJoins.map(join => {
        return {
            ...join,
            id: `join-${join.id}`,
            clients: Object.fromEntries(Object.entries(join.clients).map(([key, value]) => {
                return [key, games.find(game => String(game.id) === String(value) && game.source === key)];
            })) as unknown as Record<'steam' | 'epic' | 'itch' | 'osu' | 'deadforge', NormalizedGame>
        } as unknown as NormalizedGameJoin
    }), [gameJoins, games])

    // Helper function to remove "The" from the beginning of names
    const removeLeadingTheAndA = useCallback((name: string) => {
        return name.replace(/^(The|A)\s+/gmi, '').trim();
    }, []);

    const sortByName = useCallback((a: NormalizedGame | NormalizedPseudoGameJoin, b: NormalizedGame | NormalizedPseudoGameJoin) => {
        const nameA = typeof a.source === 'string' ? getLocalizedGameName(a) : getLocalizedGameName(a.source[a.defaultClient]);
        const nameB = typeof b.source === 'string' ? getLocalizedGameName(b) : getLocalizedGameName(b.source[b.defaultClient]);
        const cleanNameA = removeLeadingTheAndA(nameA);
        const cleanNameB = removeLeadingTheAndA(nameB);
        return sorting.direction === "asc" ? cleanNameA.localeCompare(cleanNameB) : cleanNameB.localeCompare(cleanNameA);
    }, [sorting, removeLeadingTheAndA])

    const sortCollectionsByName = useCallback((a: Collection["name"], b: Collection["name"]) => {
        return a.localeCompare(b);
    }, [])

    const sortByRecent = useCallback((a: NormalizedGame | NormalizedPseudoGameJoin, b: NormalizedGame | NormalizedPseudoGameJoin) => {
        // Get lastPlayed values
        const lastPlayedA = typeof a.source === 'string' 
            ? a.lastPlayed || 0
            : Math.max(...Object.values(a.source).map(client => client?.lastPlayed || 0));
        
        const lastPlayedB = typeof b.source === 'string'
            ? b.lastPlayed || 0
            : Math.max(...Object.values(b.source).map(client => client?.lastPlayed || 0));
        
        // If timestamps are equal (e.g., both never played), sort by name as a fallback
        if (lastPlayedA === lastPlayedB) {
            const nameA = typeof a.source === 'string' ? getLocalizedGameName(a) : getLocalizedGameName(a.source[a.defaultClient]);
            const nameB = typeof b.source === 'string' ? getLocalizedGameName(b) : getLocalizedGameName(b.source[b.defaultClient]);
            return sorting.direction === "asc" ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
        }
        
        // When direction is ascending, older (smaller timestamps) games go last
        // When direction is descending, newer (larger timestamps) games go last
        if (sorting.direction === "desc") {
            return lastPlayedA - lastPlayedB;
        } else {
            return lastPlayedB - lastPlayedA;
        }
    }, [sorting])

    const filterOutBySearch = useCallback((game: NormalizedGame | NormalizedPseudoGameJoin) => {
        if (typeof game.source === 'string') {
            if (typeof game.name === 'string') {
                return game.name.toLowerCase().includes(filters.search.toLowerCase());
            }
            return Object.values(game.name).some(name => name.toLowerCase().includes(filters.search.toLowerCase()));
        }
        return Object.values(game.source).some(client =>
            typeof client.name === 'string' ? client.name.toLowerCase().includes(filters.search.toLowerCase()) : Object.values(client.name).some(name => name.toLowerCase().includes(filters.search.toLowerCase()))
        );
    }, [filters.search])

    const filterOutUnplayableGames = useCallback((game: NormalizedGame | NormalizedPseudoGameJoin) => {
        if (((g): g is NormalizedPseudoGameJoin => g.type === "GameJoin")(game)) {
            return Object.values(game.source).some(client => (client?.launchOptions || []).length > 0);
        }
        return (game?.launchOptions || []).length > 0;
    }, [])

    const filterOutUnfavouritedGames = useCallback((game: NormalizedGame | NormalizedPseudoGameJoin) => {
        if (typeof game.source === 'string') {
            return favourites.some(favourite => favourite.id === game.id && favourite.source === game.source);
        }
        return favourites.some(favourite => favourite.id === game.id && game.type === "GameJoin");
    }, [favourites])

    const transformGameJoinIntoUsableFormat = useCallback((join: NormalizedGameJoin): NormalizedPseudoGameJoin => {
        return {
            id: String(join.id),
            source: join.clients as unknown as Record<'steam' | 'epic' | 'itch' | 'osu' | 'deadforge', NormalizedGame>,
            type: "GameJoin",
            defaultClient: join.defaultClient,
            preferences: join.preferences,
        }
    }, [])

    const handleGameContextMenu = useCallback((e: React.MouseEvent, game: NormalizedGame | NormalizedPseudoGameJoin) => {
        e.preventDefault();
        setContextMenu({
            visible: true,
            x: e.clientX,
            y: e.clientY,
            game
        });
    }, [])

    const closeContextMenu = useCallback(() => {
        setContextMenu(prev => ({ ...prev, visible: false }));
    }, [])

    // Collection context menu handlers
    const handleCollectionContextMenu = useCallback((e: React.MouseEvent, name: string, isUserDefined: boolean = false, isFavorites: boolean = false, isTimeBasedCollection: boolean = false) => {
        e.preventDefault();
        // Find the actual collection ID if it's a user-defined collection
        let collectionId = name; // Default to using name as ID
        
        if (isUserDefined && !isFavorites) {
            // Find the collection with this name to get the correct ID
            const collection = collections.find(c => c.name === name);
            if (collection) {
                collectionId = collection.id;
            }
        }
        
        // Check if the checkbox is checked
        const checkbox = collectionCheckboxRefs.current[name]; // Still use name for the checkbox ref
        const isExpanded = checkbox ? !checkbox.checked : false;
        
        setCollectionContextMenu({
            visible: true,
            x: e.clientX,
            y: e.clientY,
            collection: {
                id: collectionId,
                name,
                isExpanded,
                isFavorites,
                isUserDefined,
                isTimeBasedCollection
            }
        });
    }, [collections])

    const closeCollectionContextMenu = useCallback(() => {
        setCollectionContextMenu(prev => ({ ...prev, visible: false }));
    }, [])

    const handleToggleCollectionExpand = useCallback((id: string) => {
        // For expand/collapse, we need to find the checkbox by name
        // Since collections in the UI are identified by name, not ID
        const collectionName = id === "Favourites" ? "Favourites" :
            id === "Uncategorized" ? "Uncategorized" :
                collections.find(c => c.id === id)?.name || id;
        
        const checkbox = collectionCheckboxRefs.current[collectionName];
        if (checkbox) {
            checkbox.checked = !checkbox.checked;
            // Trigger a change event to ensure any listeners update
            const event = new Event('change', { bubbles: true });
            checkbox.dispatchEvent(event);
        }
        closeCollectionContextMenu();
    }, [collections])

    const handleRenameCollection = useCallback((id: string) => {
        const collectionName = collections.find(c => c.id === id)?.name || id;
        setEditingCollectionId(collectionName);
        closeCollectionContextMenu();
    }, [collections])

    const saveCollectionName = useCallback((id: string, newName: string) => {
        if (newName && newName.trim() !== '') {
            // Find the proper collection ID from our collections array
            const collection = collections.find(c => c.name === id);
            if (collection) {
                setCollections(prev => prev.map(c => 
                    c.id === collection.id ? { ...c, name: newName.trim() } : c
                ));
            }
        }
        setEditingCollectionId(null);
    }, [collections, setCollections])

    const handleDeleteCollection = useCallback((id: string) => {
        // Since we now store the actual collection ID, we can directly delete by ID
        setCollections(prev => prev.filter(collection => collection.id !== id));
        closeCollectionContextMenu();
    }, [collections, setCollections])

    const handleClearFavorites = useCallback(() => {
        setFavourites([]);
        closeCollectionContextMenu();
    }, [setFavourites, closeCollectionContextMenu])

    const getGameState = useCallback((game: NormalizedGame | NormalizedPseudoGameJoin): Exclude<GameState['state'], 'idle'> | null => {
        // For regular games, use source-id format
        // For game joins, check all possible client states
        const gameIds = typeof game.source === 'string' 
            ? [`${game.source}-${game.id}`] 
            : Object.entries(game.source).map(([source, client]) => `${source}-${client.id}`);

        // Find the first non-idle state among all possible game IDs
        const activeState = gameIds
            .map(id => gameStates[id]?.state)
            .find(state => state && state !== 'idle') as Exclude<GameState['state'], 'idle'> | undefined;

        return activeState || null;
    }, [gameStates])

    const getGameStateIndicator = useCallback((game: NormalizedGame | NormalizedPseudoGameJoin) => {
        const activeState = getGameState(game);

        if (!activeState) return null;

        const stateClasses: Record<Exclude<GameState['state'], 'idle'>, string> = {
            launching: 'text-blue-400 animate-pulse',
            running: 'text-green-500',
            stopping: 'text-blue-400 animate-pulse',
            preparing: 'text-blue-400 animate-pulse',
            downloading: 'text-blue-400 animate-pulse',
            downloadingPatch: 'text-blue-400 animate-pulse',
            installing: 'text-blue-400 animate-pulse',
            applyingPatch: 'text-blue-400 animate-pulse',
            finishing: 'text-blue-400 animate-pulse',
            checking: 'text-neutral-400 animate-pulse'
        };

        const stateIcons: Record<Exclude<GameState['state'], 'idle'>, string> = {
            launching: 'hourglass_top',
            running: 'check_circle',
            stopping: 'stop_circle',
            preparing: 'settings',
            downloading: 'downloading',
            downloadingPatch: 'downloading',
            installing: 'install_desktop',
            applyingPatch: 'healing',
            finishing: 'sports_score',
            checking: 'hourglass_top'
        };

        // Since we know activeState is not null and is one of the valid states,
        // we can safely use it to index our records
        return (
            <span className={cn("material-symbols ml-auto mr-1 text-sm z-10", stateClasses[activeState])}>
                {stateIcons[activeState]}
            </span>
        );
    }, [getGameState])

    const getGameStateGradient = useCallback((game: NormalizedGame | NormalizedPseudoGameJoin): string => {
        const activeState = getGameState(game);

        const gradientColors: Record<GameState['state'], string> = {
            launching: 'to-transparent from-blue-500/50',
            running: 'to-transparent from-green-500/50',
            stopping: 'to-transparent from-blue-500/50',
            preparing: 'to-transparent from-blue-500/50',
            downloading: 'text-blue-400 bg-gradient-to-l from-blue-500/50 to-transparent',
            downloadingPatch: 'text-blue-400 bg-gradient-to-l from-blue-500/50 to-transparent',
            installing: 'text-blue-400 bg-gradient-to-l from-blue-500/50 to-transparent',
            applyingPatch: 'text-blue-400 bg-gradient-to-l from-blue-500/50 to-transparent',
            finishing: 'to-transparent from-blue-500/50',
            idle: 'to-transparent from-transparent',
            checking: 'to-transparent from-neutral-500/50'
        };
        
        if (!activeState) return cn('absolute inset-0 bg-gradient-to-l from-0% to-75% transition-[opacity,background-image] duration-200', gradientColors.idle);

        return cn('absolute inset-0 bg-gradient-to-l from-0% to-75% transition-[opacity,background-image] duration-200', gradientColors[activeState]);
    }, [getGameState])

    const getGameIcon = useCallback((game: NormalizedGame | NormalizedPseudoGameJoin): string => {
        if (game.source === "osu") {
            return `${process.env.PUBLIC_URL}/assets/osu!logo.svg`;
        }

        const gameId = typeof game.source === 'string' ? String(game.id) : String(game.source[game.defaultClient].id);
        const gameSource = typeof game.source === 'string' ? game.source : game.defaultClient;

        // Try custom assets first
        if (customAssets.find(asset => asset.id === gameId && asset.source === gameSource)?.media?.iconUrl) {
            return `local://${customAssets.find(asset => asset.id === gameId && asset.source === gameSource)?.media?.iconUrl.replaceAll("%USERDATA%", "CONST_USERDATA")}?fallback=defaultIcon`;
        }

        // Then try curated assets
        if (curatedAssets.find(asset => asset.id === gameId && asset.source === gameSource)?.media?.iconUrl) {
            return `local://${curatedAssets.find(asset => asset.id === gameId && asset.source === gameSource)?.media?.iconUrl.replaceAll("%USERDATA%", "CONST_USERDATA")}?fallback=defaultIcon`;
        }

        // Finally fall back to official assets
        const iconUrl = typeof game.source === 'string' 
            ? game.media?.iconUrl 
            : game.source[game.defaultClient].media?.iconUrl;

        return `local://${iconUrl?.replaceAll("%USERDATA%", "CONST_USERDATA")}?fallback=defaultIcon`;
    }, [customAssets, curatedAssets])

    // Add this function before the return statement to categorize games by last played time
    const categorizeGamesByLastPlayedTime = useCallback((games: (NormalizedGame | NormalizedPseudoGameJoin)[]) => {
        const now = Math.floor(Date.now() / 1000); // Current timestamp in seconds
        const currentYear = new Date().getFullYear();
        const oneDay = 24 * 60 * 60; // Seconds in a day
        const recentThreshold = now - (28 * oneDay); // 28 days ago
        
        const categorized: Record<string, (NormalizedGame | NormalizedPseudoGameJoin)[]> = {
            "what the actual fuck how lol": [], // Games with future timestamps
            "Recent": [],
            "Never Played": []
        };
        
        games.forEach(game => {
            // Get lastPlayed timestamp for the game
            const lastPlayed = typeof game.source === 'string' 
                ? game.lastPlayed || 0
                : Math.max(...Object.values(game.source).map(client => client?.lastPlayed || 0));
            
            if (lastPlayed > now) {
                // Game was apparently played in the future!
                categorized["what the actual fuck how lol"].push(game);
            } else if (lastPlayed === 0) {
                // Game was never played
                categorized["Never Played"].push(game);
            } else if (lastPlayed >= recentThreshold) {
                // Played within last 28 days
                categorized["Recent"].push(game);
            } else {
                const lastPlayedDate = new Date(lastPlayed * 1000);
                const lastPlayedYear = lastPlayedDate.getFullYear();
                // Use date-fns to get localized month and month-year
                const lastPlayedMonth = format(lastPlayedDate, 'LLLL', { locale: dateFnsLocale });
                const lastPlayedMonthYear = format(lastPlayedDate, 'LLLL yyyy', { locale: dateFnsLocale });
                
                if (lastPlayedYear === currentYear) {
                    // Played this year but not recently
                    const categoryName = lastPlayedMonth;
                    if (!categorized[categoryName]) {
                        categorized[categoryName] = [];
                    }
                    categorized[categoryName].push(game);
                } else {
                    // Played before this year
                    const categoryName = lastPlayedMonthYear;
                    if (!categorized[categoryName]) {
                        categorized[categoryName] = [];
                    }
                    categorized[categoryName].push(game);
                }
            }
        });
        
        return categorized;
    }, [dateFnsLocale])

    const navigate = useNavigate();

    const sidebarItems = useMemo(() => {
        const gamesJoined = [...games.filter(game => !gameJoinsPopulated.some(join => (join?.clients?.[game.source as keyof typeof join.clients] as NormalizedGame)?.id === game.id)), ...gameJoinsPopulated.map(transformGameJoinIntoUsableFormat)];
        const filteredGames = gamesJoined
            .filter(g => !filters.launchable || filterOutUnplayableGames(g))
            .filter(g => !filters.favourite || filterOutUnfavouritedGames(g))
            .filter(g => !filters.search.length || filterOutBySearch(g))
            .sort(sorting.sort === "name" ? sortByName : sortByRecent);

        // Use different categorization based on sorting method
        let categorizedGames;
        if (sorting.sort === "recent") {
            categorizedGames = categorizeGamesByLastPlayedTime(filteredGames);
        } else {
            categorizedGames = chunkGamesByCategory(filteredGames, collections, favourites);
        }
        const hasGames = Object.values(categorizedGames).some(games => games.length > 0);

        if (!hasGames) {
            return (
                <li className="text-center text-white/50 flex flex-col items-center justify-center w-full h-full empty-placeholder gap-1">
                    <DEADCODELogo className="text-5xl -mb-2" />
                    {gamesJoined.length > 0 ?
                        <>
                            <span>{t("library.sidebar.empty.emptyAfterFilters")}</span>
                            {filters.search.length > 0 && <span className="flex flex-row items-center gap-1.5 text-white max-w-72 text-sm"><span className="material-symbols">search</span><span className="text-ellipsis overflow-hidden whitespace-nowrap pr-1">{filters.search}</span></span>}
                            <span className="flex flex-row items-center gap-2 text-white">
                                {filters.favourite && <span className="material-symbols ms-filled dark:text-red-400 text-red-500">favorite</span>}
                                {filters.launchable && <span className="material-symbols ms-filled dark:text-green-400 text-green-500">play_circle</span>}
                            </span>
                        </>
                        :
                        <span>{t("library.sidebar.empty.emptyLibrary")}</span>
                    }
                </li>
            );
        }

        // Render games by category
        return (() => {
            let entries = Object.entries(categorizedGames);
            
            // Different ordering based on sorting method and direction
            if (sorting.sort === "recent") {
                // For time-based categories, we need custom ordering logic
                // Special categories
                const recent = entries.find(([cat]) => cat === "Recent");
                const neverPlayed = entries.find(([cat]) => cat === "Never Played");
                const futureGames = entries.find(([cat]) => cat === "what the actual fuck how lol");
                
                // Current year months (no space, not special)
                const currentYearMonths = entries.filter(([cat]) => 
                    !cat.includes(" ") && 
                    cat !== "Recent" && 
                    cat !== "Never Played" &&
                    cat !== "what the actual fuck how lol"
                );
                // Previous years (format: "Month Year")
                const previousYears = entries.filter(([cat]) => 
                    cat.includes(" ") && 
                    cat !== "Recent" && 
                    cat !== "Never Played" &&
                    cat !== "what the actual fuck how lol"
                );
                // Sort months by their order in the year using their month index
                currentYearMonths.sort((a, b) => {
                    // Parse month index from localized month name
                    const getMonthIndex = (monthName: string) => {
                        for (let i = 0; i < 12; i++) {
                            const d = new Date(2000, i, 1);
                            if (format(d, 'LLLL', { locale: dateFnsLocale }) === monthName) return i;
                        }
                        return -1;
                    };
                    const monthA = getMonthIndex(a[0]);
                    const monthB = getMonthIndex(b[0]);
                    return sorting.direction === "desc" ? monthA - monthB : monthB - monthA;
                });
                // Sort previous years by year and then by month
                previousYears.sort((a, b) => {
                    const [monthA, yearA] = a[0].split(" ");
                    const [monthB, yearB] = b[0].split(" ");
                    if (yearA !== yearB) {
                        return sorting.direction === "desc" 
                            ? parseInt(yearA) - parseInt(yearB) 
                            : parseInt(yearB) - parseInt(yearA);
                    } else {
                        // If same year, sort by month index
                        const getMonthIndex = (monthName: string) => {
                            for (let i = 0; i < 12; i++) {
                                const d = new Date(2000, i, 1);
                                if (format(d, 'LLLL', { locale: dateFnsLocale }) === monthName) return i;
                            }
                            return -1;
                        };
                        const monthIndexA = getMonthIndex(monthA);
                        const monthIndexB = getMonthIndex(monthB);
                        return sorting.direction === "desc" 
                            ? monthIndexA - monthIndexB 
                            : monthIndexB - monthIndexA;
                    }
                });
                // Assemble categories in appropriate order based on sort direction
                if (sorting.direction === "desc") {
                    entries = [
                        ...(neverPlayed ? [neverPlayed] : []),
                        ...previousYears,
                        ...currentYearMonths,
                        ...(recent ? [recent] : []),
                        ...(futureGames ? [futureGames] : [])
                    ];
                } else {
                    entries = [
                        ...(futureGames ? [futureGames] : []),
                        ...(recent ? [recent] : []),
                        ...currentYearMonths,
                        ...previousYears,
                        ...(neverPlayed ? [neverPlayed] : [])
                    ];
                }
            } else {
                // For normal collection-based categories, keep the existing sorting logic
                const favorites = entries.find(([cat]) => cat === "Favourites");
                const collections = entries.filter(([cat]) => cat !== "Favourites" && cat !== "Uncategorized");
                const uncategorized = entries.find(([cat]) => cat === "Uncategorized");
                
                collections.sort((a, b) => sortCollectionsByName(a[0], b[0]));
                
                entries = [
                    ...(favorites ? [favorites] : []),
                    ...collections,
                    ...(uncategorized ? [uncategorized] : [])
                ];
            }
            
            return entries.filter(([,games]) => games.length > 0).map(([category, categoryGames]) => {
                const isFavourites = category === "Favourites";
                const isUncategorized = category === "Uncategorized";
                const isUserDefined = !isFavourites && !isUncategorized;
                const isRecent = category === "Recent" && sorting.sort === "recent";
                const isNeverPlayed = category === "Never Played" && sorting.sort === "recent";
                const isImpossible = category === "what the actual fuck how lol" && sorting.sort === "recent";
                if (isFavourites) { category = t("library.shared.favourites") }
                else if (isUncategorized) { category = t("library.sidebar.uncategorized") }
                else if (isRecent) { category = t("library.sidebar.recent") }
                else if (isNeverPlayed) { category = t("library.sidebar.neverPlayed") }
                else if (isImpossible) { category = t("library.sidebar.wtflolhow") }

                return (
                    <div key={category} className="flex flex-col gap-0.5 group/category last:*:mb-2">
                        {/* Category header */}
                        <li>
                            <label
                                className="flex flex-row items-center gap-2 py-1.5 px-2.5 bg-notQuiteBlack/10 dark:bg-notQuiteWhite/10 hover:bg-notQuiteBlack/20 dark:hover:bg-notQuiteWhite/20 rounded-md mb-2 first:mt-0 cursor-pointer transition-colors duration-200 ease-in-out"
                                onContextMenu={(e) => {
                                    handleCollectionContextMenu(
                                        e,
                                        category,
                                        isUserDefined,
                                        isFavourites,
                                        sorting.sort === "recent"
                                    );
                                }}
                            >
                                <span className="font-medium">
                                    {editingCollectionId === category ? (
                                        <CollectionNameEditor
                                            initialName={category}
                                            onSave={(newName) => saveCollectionName(category, newName)}
                                            onCancel={() => setEditingCollectionId(null)}
                                        />
                                    ) : (
                                        category
                                    )}
                                </span>
                                <label className="ml-auto text-sm text-notQuiteBlack dark:text-notQuiteWhite material-symbols has-[input:checked]:after:content-['add'] has-[input:not(:checked)]:after:content-['remove']">
                                    <input
                                        type="checkbox"
                                        className="hidden"
                                        ref={(el: HTMLInputElement | null) => {
                                            collectionCheckboxRefs.current[category] = el;
                                        }}
                                    />
                                </label>
                            </label>
                        </li>

                        {/* Category games */}
                        {categoryGames.map((game) => (
                            <Link
                                draggable={false}
                                to={`/library/game/${typeof game.source === "object" ? "" : `${game.source}-`}${game.id}`}
                                onClick={(e) => {if (e.shiftKey || e.ctrlKey) {navigate(`/library/game/${typeof game.source === "object" ? "" : `${game.source}-`}${game.id}`)}}}
                                key={`${category}-${typeof game.source === "object" ? "join" : game.source}-${game.id}`}
                                className="no-underline no-user-drag m-0 group-has-[input:checked]/category:hidden"
                            >
                                <li
                                    className="flex flex-row items-center gap-2 p-1.5 rounded-md hover:bg-white/25 transition-colors duration-200 m-0 relative overflow-hidden group/game-item"
                                    onContextMenu={(e) => handleGameContextMenu(e, game)}
                                >
                                    <div className={getGameStateGradient(game)} />
                                    <div className="flex flex-row items-center gap-2 flex-1">
                                        <img
                                            draggable={false}
                                            src={getGameIcon(game)}
                                            alt={typeof game.source === 'string' ? getLocalizedGameName(game) : getLocalizedGameName(game.source[game.defaultClient])}
                                            className="w-6 h-6 no-user-drag rounded-[4px]"
                                        />
                                        {typeof game.source === 'object' ?
                                            Object.entries(game.source).map(([source], index) => <GetSourceIcon source={source} key={index} keyProp={index} className={source === "deadforge" ? "-translate-y-0.5" : ""} />)
                                            : <GetSourceIcon source={game.source as string} key={0} keyProp={0}  className={game.source === "deadforge" ? "-translate-y-0.5" : ""} />}
                                        <span className="truncate">
                                            {typeof game.source === 'string' ? getLocalizedGameName(game) : getLocalizedGameName(game.source[game.defaultClient])}
                                        </span>
                                        {getGameStateIndicator(game)}
                                    </div>
                                </li>
                            </Link>
                        ))}
                    </div>
                );
            });
        })();
    }, [sorting, editingCollectionId, collections, favourites, gameJoinsPopulated, gameJoins, games, filters, filterExpanded, sortingExpanded, categorizeGamesByLastPlayedTime, chunkGamesByCategory, sortCollectionsByName, handleCollectionContextMenu, saveCollectionName, setEditingCollectionId, transformGameJoinIntoUsableFormat, filterOutBySearch, filterOutUnplayableGames, filterOutUnfavouritedGames, sortByName, sortByRecent, getLocalizedGameName, getGameStateIndicator, getGameStateGradient, getGameIcon, GetSourceIcon, DEADCODELogo, cn, dateFnsLocale])

    return (
        <div className="flex flex-col w-[24rem] border-0 border-r border-notQuiteBlack/10 dark:border-notQuiteWhite/10 border-solid">
            <div className="px-4 flex flex-col justify-center mb-2 gap-2 group has-[#filter-games:checked]:mb-11 transition-[margin-bottom] duration-300 ease-in-out">
                <div className="flex flex-row items-center gap-2 first:*:rounded-tl-xl z-[2] dark:bg-night bg-fullMoon pt-4 relative">
                    <Link to="/library" className="text-md text-center text-notQuiteBlack bg-notQuiteBlack/10 hover:bg-notQuiteBlack/20 dark:text-notQuiteWhite dark:bg-notQuiteWhite/10 hover:dark:bg-notQuiteWhite/20 flex-1 py-1 rounded-md transition-colors duration-200 m-0 no-underline max-w-[152px] overflow-clip whitespace-nowrap">{t("library.sidebar.homeButton")}</Link>
                    <Link to="/library/collections" className="text-md text-center text-notQuiteBlack bg-notQuiteBlack/10 hover:bg-notQuiteBlack/20 dark:text-notQuiteWhite dark:bg-notQuiteWhite/10 hover:dark:bg-notQuiteWhite/20 flex-1 py-1 rounded-md transition-colors duration-200 m-0 no-underline max-w-[152px] overflow-clip whitespace-nowrap">{t("library.shared.collections")}</Link>
                    <label htmlFor="filter-games" className="flex material-symbols text-notQuiteBlack dark:text-notQuiteWhite bg-notQuiteBlack/10 hover:bg-notQuiteBlack/20 dark:bg-notQuiteWhite/10 hover:dark:bg-notQuiteWhite/20 p-1 aspect-square rounded-md transition-colors duration-200 m-0 no-underline cursor-pointer relative z-0 group/filter-button">
                        filter_list
                        <input type="checkbox" id="filter-games" className="hidden" checked={showFilters} onChange={() => setShowFilters(!showFilters)} />
                        <div className='flex flex-col gap-0.5 absolute w-fit h-fit top-1/2 -translate-y-1/2 right-0 opacity-0 scale-75 group-has-[#filter-games:not(:checked)]/filter-button:group-hover/filter-button:opacity-100 group-has-[#filter-games:not(:checked)]/filter-button:group-hover/filter-button:scale-100 group-has-[#filter-games:not(:checked)]/filter-button:group-hover/filter-button:translate-x-[calc(100%+0.5rem)] transition-[transform,opacity] duration-300 ease-in-out bg-night dark:bg-fullMoon text-notQuiteWhite dark:text-notQuiteBlack text-center rounded-lg p-1 max-w-48'>
                            {filters.search.length > 0 && <span className="inline-flex flex-row items-center align-middle gap-0.5"><span className="flex flex-row items-center justify-center align-middle material-symbols aspect-square text-xs h-fit">search</span><span className="text-xs font-notoSans text-ellipsis overflow-hidden whitespace-nowrap pr-1">{filters.search}</span></span>}
                            <div className='flex flex-row items-center align-middle gap-0.5'>
                                {filters.favourite && <span className="flex flex-row items-center align-middle material-symbols aspect-square text-xs h-fit ms-filled">favorite</span>}
                                {filters.launchable && <span className="flex flex-row items-center align-middle material-symbols aspect-square text-xs h-fit ms-filled">play_circle</span>}
                                <span className="flex flex-row items-center align-middle material-symbols aspect-square text-xs h-fit">{getSortingIcon("sort")}</span>
                                <span className="flex flex-row items-center align-middle material-symbols aspect-square text-xs h-fit">{getSortingIcon("direction")}</span>
                            </div>
                        </div>
                    </label>
                    <div className="absolute -bottom-1.5 w-[22rem] h-1.5 dark:bg-gradient-to-b dark:from-night dark:to-transparent" />
                </div>
                <div className="pt-4 flex flex-row items-center justify-end gap-2 absolute group-has-[#filter-games:checked]:translate-y-[calc(2.5rem)] scale-95 group-has-[#filter-games:checked]:scale-100 w-[22rem] z-0 transition-transform duration-300 ease-in-out group/library-filters">
                    <div className="flex flex-row items-center gap-2 bg-notQuiteBlack/10 hover:bg-notQuiteBlack/20 dark:bg-notQuiteWhite/10 hover:dark:bg-notQuiteWhite/20 p-1 rounded-md transition-colors duration-200 m-0 no-underline w-full relative">
                        <span className={cn("material-symbols transition-[transform,width] duration-200 ease-in-out absolute", filters.search.length > 0 && "scale-75 -translate-x-1/2 -translate-y-1/2")}>search</span>
                        <input type="text" id="filter-search" className={cn("bg-transparent outline-none border-none w-full pl-8 pr-2 transition-[padding-left,padding-right] duration-200 ease-in-out", filters.search.length > 0 && "pl-2 pr-8")} value={filters.search} onChange={e => handleFilterChange("search", e.target.value)} minLength={0} maxLength={64} />
                        <span className={cn("material-symbols cursor-pointer text-lg aspect-square leading-none p-0.5 hover:bg-notQuiteBlack/20 dark:hover:bg-notQuiteWhite/20 rounded-md transition-[color,background-color,border-color,text-decoration-color,fill,stroke,transform] duration-200 scale-0 absolute right-1.5", filters.search.length > 0 && "scale-100")} onClick={() => handleFilterChange("search", "")}>clear</span>
                    </div>
                    <div className="flex flex-row items-center justify-end gap-1.5 material-symbols text-notQuiteBlack dark:text-notQuiteWhite bg-notQuiteBlack/10 hover:bg-notQuiteBlack/20 dark:bg-notQuiteWhite/10 hover:dark:bg-notQuiteWhite/20 p-1 rounded-md transition-[color,background-color,border-color,text-decoration-color,fill,stroke,max-width] duration-200 m-0 h-6 no-underline cursor-pointer max-w-6 has-[#filter-expanded:checked]:max-w-[6rem] w-fit flex-shrink-0 overflow-hidden ease-in-out">
                        <Tooltip containerClassName="flex" content={
                            <div className="flex flex-col gap-1">
                                <strong>{t("library.sidebar.filters.favouriteStatus.description")}</strong>
                                <span className="flex flex-row items-center gap-1"><span className="material-symbols">favorite</span>{t("library.sidebar.filters.favouriteStatus.unfiltered")}</span>
                                <span className="flex flex-row items-center gap-1"><span className="material-symbols dark:text-red-400 text-red-500 ms-filled">favorite</span>{t("library.sidebar.filters.favouriteStatus.favourites")}</span>
                            </div>
                        } position="right" alignment="start">
                            <label htmlFor="filter-favourite" className="aspect-square text-xl leading-none p-0.5 hover:bg-notQuiteBlack/20 dark:hover:bg-notQuiteWhite/20 rounded-md transition-colors duration-200 cursor-pointer dark:has-[#filter-favourite:checked]:text-red-400 has-[#filter-favourite:checked]:text-red-500 filled-when-checked">
                                favorite
                                <input type="checkbox" id="filter-favourite" className="hidden" checked={filters.favourite} onChange={() => handleFilterChange("favourite", !filters.favourite)} />
                            </label>
                        </Tooltip>
                        <Tooltip containerClassName="flex" content={
                            <div className="flex flex-col gap-1">
                                <strong>{t("library.sidebar.filters.launchability.description")}</strong>
                                <span className="flex flex-row items-center gap-1"><span className="material-symbols">play_circle</span>{t("library.sidebar.filters.launchability.unfiltered")}</span>
                                <span className="flex flex-row items-center gap-1"><span className="material-symbols dark:text-green-400 text-green-500 ms-filled">play_circle</span>{t("library.sidebar.filters.launchability.launchable")}</span>
                            </div>
                        } position="right" alignment="start">
                            <label htmlFor="filter-launchable" className="aspect-square text-xl leading-none p-0.5 hover:bg-notQuiteBlack/20 dark:hover:bg-notQuiteWhite/20 rounded-md transition-colors duration-200 cursor-pointer dark:has-[#filter-launchable:checked]:text-green-400 has-[#filter-launchable:checked]:text-green-500 filled-when-checked">
                                play_circle
                                <input type="checkbox" id="filter-launchable" className="hidden" checked={filters.launchable} onChange={() => handleFilterChange("launchable", !filters.launchable)} />
                            </label>
                        </Tooltip>
                        <label htmlFor="filter-expanded" className="aspect-square text-xl leading-none p-0.5 hover:bg-notQuiteBlack/20 dark:hover:bg-notQuiteWhite/20 rounded-md transition-colors duration-200 cursor-pointer">
                            filter_alt
                            <input type="checkbox" id="filter-expanded" className="hidden" checked={filterExpanded} onChange={() => setFilterExpanded(!filterExpanded)} />
                        </label>
                    </div>
                    <div className="flex flex-row items-center justify-end gap-1.5 material-symbols text-notQuiteBlack dark:text-notQuiteWhite bg-notQuiteBlack/10 hover:bg-notQuiteBlack/20 dark:bg-notQuiteWhite/10 hover:dark:bg-notQuiteWhite/20 p-1 rounded-md transition-[color,background-color,border-color,text-decoration-color,fill,stroke,max-width] duration-200 m-0 h-6 no-underline cursor-pointer max-w-6 has-[#sort-expanded:checked]:max-w-[6rem] w-fit flex-shrink-0 overflow-hidden ease-in-out">
                        <Tooltip containerClassName="flex" content={
                            <div className="flex flex-col gap-1">
                                <strong>{t("library.sidebar.sorting.types.description")}</strong>
                                <span className="flex flex-row items-center gap-1"><span className="material-symbols">sort_by_alpha</span>{t("library.sidebar.sorting.types.title")}</span>
                                <span className="flex flex-row items-center gap-1"><span className="material-symbols">history</span>{t("library.sidebar.sorting.types.recent")}</span>
                            </div>
                        } position="right" alignment="start">
                            <button className="aspect-square text-xl leading-none p-0.5 hover:bg-notQuiteBlack/20 dark:hover:bg-notQuiteWhite/20 rounded-md transition-colors duration-200"
                                onClick={() => handleSortChange("sort")}
                            >
                                {getSortingIcon("sort")}
                            </button>
                        </Tooltip>
                        <Tooltip containerClassName="flex" content={
                            <div className="flex flex-col gap-1">
                                <strong>{t("library.sidebar.sorting.direction.description")}</strong>
                                <span className="flex flex-row items-center gap-1"><span className="material-symbols">arrow_upward</span>{t("library.sidebar.sorting.direction.asc")}</span>
                                <span className="flex flex-row items-center gap-1"><span className="material-symbols">arrow_downward</span>{t("library.sidebar.sorting.direction.desc")}</span>
                            </div>
                        } position="right" alignment="start">
                            <button className="aspect-square text-xl leading-none p-0.5 hover:bg-notQuiteBlack/20 dark:hover:bg-notQuiteWhite/20 rounded-md transition-colors duration-200"
                                onClick={() => handleSortChange("direction")}
                            >
                                {getSortingIcon("direction")}
                            </button>
                        </Tooltip>
                        <label htmlFor="sort-expanded" className="aspect-square text-xl leading-none p-0.5 hover:bg-notQuiteBlack/20 dark:hover:bg-notQuiteWhite/20 rounded-md transition-colors duration-200 cursor-pointer">
                            sort
                            <input type="checkbox" id="sort-expanded" className="hidden" checked={sortingExpanded} onChange={() => setSortingExpanded(!sortingExpanded)} />
                        </label>
                    </div>
                </div>
            </div>
            <ul className={cn("overflow-y-auto flex flex-col gap-0.5 scrollbar-gutter-both-edges px-2", /* pb-4 */ "pb-2", "pt-4 mt-2 border-0 border-t border-solid border-night/20 dark:border-fullMoon/20 has-[.empty-placeholder]:justify-center has-[.empty-placeholder]:items-center has-[.empty-placeholder]:h-full")}>
                {sidebarItems}
            </ul>
            {contextMenu.visible && contextMenu.game && (
                <LibrarySidebarContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    onClose={closeContextMenu}
                    game={contextMenu.game}
                    collections={collections}
                    favourites={favourites}
                    setCollections={setCollections}
                    setFavourites={setFavourites}
                    gameStates={gameStates}
                    setGameState={setGameState}
                    games={games}
                />
            )}
            {collectionContextMenu.visible && collectionContextMenu.collection && (
                <CollectionContextMenu
                    x={collectionContextMenu.x}
                    y={collectionContextMenu.y}
                    onClose={closeCollectionContextMenu}
                    collection={collectionContextMenu.collection}
                    onToggleExpand={handleToggleCollectionExpand}
                    onRename={handleRenameCollection}
                    onDelete={handleDeleteCollection}
                    onClearFavorites={collectionContextMenu.collection.isFavorites ? handleClearFavorites : undefined}
                />
            )}
            {/* <div className="px-4 py-2.5 flex flex-row items-center justify-around gap-2 mx-4 rounded-t-xl bg-notQuiteBlack/10 dark:bg-notQuiteWhite/10 -bottom-[2.1875rem] hover:-translate-y-[2.1875rem] transition-transform backdrop-blur-3xl duration-200 fixed w-[20rem]">
                <div className="flex flex-row items-center gap-2 hover:bg-notQuiteBlack/20 dark:hover:bg-notQuiteWhite/20 p-1 rounded-md transition-colors duration-200 m-0 no-underline">
                    <span className="material-symbols">add</span>
                    <span className="text-sm mr-1">Add Games</span>
                </div>
                <div className="flex flex-row items-center gap-2 hover:bg-notQuiteBlack/20 dark:hover:bg-notQuiteWhite/20 p-1 rounded-md transition-colors duration-200 m-0 no-underline">
                    <span className="material-symbols rotate-45">link</span>
                    <span className="text-sm mr-1">Link Games</span>
                </div>
            </div> */}
        </div>
    );
};

export default LibrarySidebar; 