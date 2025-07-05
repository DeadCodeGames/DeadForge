import type React from "react"
import type { JSX } from "react"
import { useState, useContext, useCallback, useMemo, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import type { NormalizedGame, NormalizedPseudoGameJoin } from "@/types"
import { getLocalizedGameName, getLocalizedGameSuffix, LibraryContext } from "../Library"
import { resolveDefaultGameVendor } from "../utils/LibraryHelpers"
import { cn } from "@/lib/utils"
import LibrarySidebarContextMenu from "./LibrarySidebarContextMenu"

interface GameCardProps {
  game: NormalizedGame | NormalizedPseudoGameJoin
  size?: "small" | "medium" | "large" | "homepage"
  showTitle?: boolean
  useCapsule?: boolean
  isFavorite?: boolean
  children?: React.ReactNode
}

const FavouritesRibbon = () => (
    <div className="absolute -right-7 -top-1 w-20 h-8 bg-red-500 rotate-45 flex items-center justify-center z-10">
        <span className="material-symbols text-white text-sm -rotate-45 scale-95 translate-y-0.5">favorite</span>
    </div>
)

export const getImageUrlCandidates = (
    resolvedGame: NormalizedGame,
    useCapsule: boolean,
    curatedAssets: any[],
    customAssets: any[]
): string[] => {
    if (!resolvedGame.media) return [];

    const gameId = String(resolvedGame.id);
    const gameSource = resolvedGame.source;
    const mediaType = useCapsule ? 'capsuleUrl' : 'headerUrl';
    const suffix = getLocalizedGameSuffix();
    const defaultSuffix = 'english';

    // Helper to extract URL from media data for a given language
    const getUrlFromMediaData = (mediaData: any, lang: string): string | null => {
        if (!mediaData) return null;
        if (typeof mediaData === 'string') return mediaData;
        if (typeof mediaData === 'object' && mediaData.image && typeof mediaData.image === 'string') return mediaData.image;
        if (mediaData.image?.[lang]) return mediaData.image[lang];
        if (mediaData[lang]) return mediaData[lang];
        return null;
    };
    // Helper to extract any available URL from media data
    const getAnyUrlFromMediaData = (mediaData: any): string | null => {
        if (!mediaData) return null;
        if (typeof mediaData === 'string') return mediaData;
        if (typeof mediaData === 'object' && mediaData.image && typeof mediaData.image === 'string') return mediaData.image;
        if (mediaData.image) {
            const firstImage = Object.values(mediaData.image)[0];
            if (firstImage) return firstImage as string;
        }
        const firstValue = Object.values(mediaData)[0];
        if (firstValue) return firstValue as string;
        return null;
    };
    // Helper to normalize the URL for local://
    const normalizeUrl = (url: string): string => {
        if (url.startsWith("CONST_USERDATA")) {
            return `local://${url}`;
        }
        if (url.startsWith('%USERDATA%')) {
            return `local://${url.replace('%USERDATA%', 'CONST_USERDATA')}`;
        }
        if (/^[A-Za-z]:\\/.test(url) || url.startsWith('\\\\')) {
            return `local://${url}`;
        }
        // For relative paths from other sources
        if (!url.startsWith('local://') && !url.startsWith('http')) {
            return `local://CONST_USERDATA/game_assets/${gameSource}_${gameId}.${url}`;
        }
        return url;
    };
    // Helper for Steam cache path
    const getSteamCacheUrl = (officialCurrentUrl: string): string | null => {
        const allMediaUrls = Object.values(resolvedGame.media || {}).flatMap(url => {
            if (typeof url === 'string') return [url];
            if (url?.image) return Object.values(url.image);
            return [];
        });
        const steamCachePath = allMediaUrls.find(url =>
            typeof url === 'string' &&
            url.includes('Steam\\appcache\\librarycache') &&
            url.includes(resolvedGame.id.toString())
        );
        if (steamCachePath && typeof steamCachePath === 'string') {
            const basePath = steamCachePath.split(resolvedGame.id.toString())[0] + resolvedGame.id.toString() + '\\';
            return `local://${basePath}${officialCurrentUrl}`;
        }
        return null;
    };

    // 1. Custom asset (current language)
    const customAsset = customAssets.find(asset => String(asset.id) === String(gameId) && asset.source === gameSource)?.media?.[mediaType];
    const customCurrentUrl = getUrlFromMediaData(customAsset, suffix);
    // 2. Curated asset (current language)
    const curatedAsset = curatedAssets.find(asset => String(asset.id) === String(gameId) && asset.source === gameSource)?.media?.[mediaType];
    const curatedCurrentUrl = getUrlFromMediaData(curatedAsset, suffix);
    console.log(customAssets, curatedAssets);
    // 3. Official asset (current language)
    const officialAsset = resolvedGame.media[mediaType];
    const officialCurrentUrl = getUrlFromMediaData(officialAsset, suffix);
    // 4. Custom asset (default language)
    const customDefaultUrl = getUrlFromMediaData(customAsset, defaultSuffix);
    // 5. Curated asset (default language)
    const curatedDefaultUrl = getUrlFromMediaData(curatedAsset, defaultSuffix);
    // 6. Official asset (default language)
    const officialDefaultUrl = getUrlFromMediaData(officialAsset, defaultSuffix);
    // 7. Any custom asset
    const customAnyUrl = getAnyUrlFromMediaData(customAsset);
    // 8. Any curated asset
    const curatedAnyUrl = getAnyUrlFromMediaData(curatedAsset);
    // 9. Any official asset
    const officialAnyUrl = getAnyUrlFromMediaData(officialAsset);

    // Compose the list in order, normalizing URLs and handling Steam special case
    const candidates: string[] = [];
    if (customCurrentUrl) candidates.push(normalizeUrl(customCurrentUrl.replaceAll("%USERDATA%", "CONST_USERDATA")));
    if (curatedCurrentUrl) candidates.push(normalizeUrl(curatedCurrentUrl.replaceAll("%USERDATA%", "CONST_USERDATA")));
    if (officialCurrentUrl) {
        if (resolvedGame.source === 'steam') {
            const steamUrl = getSteamCacheUrl(officialCurrentUrl);
            if (steamUrl) candidates.push(steamUrl);
        }
        candidates.push(normalizeUrl(officialCurrentUrl));
    }
    if (customDefaultUrl) candidates.push(normalizeUrl(customDefaultUrl.replaceAll("%USERDATA%", "CONST_USERDATA")));
    if (curatedDefaultUrl) candidates.push(normalizeUrl(curatedDefaultUrl.replaceAll("%USERDATA%", "CONST_USERDATA")));
    if (officialDefaultUrl) {
        if (resolvedGame.source === 'steam') {
            const steamUrl = getSteamCacheUrl(officialDefaultUrl);
            if (steamUrl) candidates.push(steamUrl);
        }
        candidates.push(normalizeUrl(officialDefaultUrl));
    }
    if (customAnyUrl) candidates.push(normalizeUrl(customAnyUrl.replaceAll("%USERDATA%", "CONST_USERDATA")));
    if (curatedAnyUrl) candidates.push(normalizeUrl(curatedAnyUrl.replaceAll("%USERDATA%", "CONST_USERDATA")));
    if (officialAnyUrl) {
        if (resolvedGame.source === 'steam') {
            const steamUrl = getSteamCacheUrl(officialAnyUrl);
            if (steamUrl) candidates.push(steamUrl);
        }
        candidates.push(normalizeUrl(officialAnyUrl));
    }
    console.log(resolvedGame.name, [...new Set(candidates.filter(Boolean))])
    // Remove duplicates and falsy
    return [...new Set(candidates.filter(Boolean))];
};

const GameCard: React.FC<GameCardProps> = ({ game, size = "medium", showTitle = true, useCapsule = false, isFavorite = false, children }): JSX.Element => {
    const navigate = useNavigate()
    const [headerLoaded, setHeaderLoaded] = useState(false)
    const [headerError, setHeaderError] = useState(false)
    const [candidateIndex, setCandidateIndex] = useState(0)
    const resolvedGame = resolveDefaultGameVendor(game)
    const { collections, favourites, customAssets, curatedAssets, setCollections, setFavourites, gameStates, setGameState, games } = useContext(LibraryContext)

    // Context menu state
    const [contextMenu, setContextMenu] = useState<{
        visible: boolean;
        x: number;
        y: number;
    }>({
        visible: false,
        x: 0,
        y: 0
    });

    const handleClick = useCallback(() => {
        const gameId = game.type === "GameJoin" ? game.id : `${game.source}-${game.id}`
        navigate(`/library/game/${gameId}`)
    }, [game.id, game.type, game.source, navigate])

    // Context menu handlers
    const handleContextMenu = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({
            visible: true,
            x: e.clientX,
            y: e.clientY
        });
    }, [])

    const closeContextMenu = useCallback(() => {
        setContextMenu(prev => ({ ...prev, visible: false }));
    }, [])

    const getAspectRatio = useCallback(() => {
        if (useCapsule) {
            return "!aspect-[2/3]"
        }
        switch (size) {
            case "small":
                return "!aspect-[92/43]"
            case "large":
                return "!aspect-[92/43]"
            default:
                return "!aspect-[92/43]"
        }
    }, [size, useCapsule])

    const getCardSize = useCallback(() => {
        if (useCapsule) {
            switch (size) {
                case "small":
                    return "w-24"
                case "large":
                    return "w-64"
                case "homepage":
                    return "h-full"
                default:
                    return "w-36"
            }
        }
        switch (size) {
            case "small":
                return "w-32"
            case "large":
                return "w-80"
            case "homepage":
                return "w-[13.5rem]"
            default:
                return "w-48"
        }
    }, [size, useCapsule])

    useEffect(() => {
        setHeaderError(false);
        setCandidateIndex(0);
    }, [resolvedGame, useCapsule, curatedAssets, customAssets])

    const imageUrlCandidates = useMemo(() => getImageUrlCandidates(resolvedGame, useCapsule, curatedAssets, customAssets), [resolvedGame, useCapsule, curatedAssets, customAssets])
    const imageUrl = imageUrlCandidates[candidateIndex] || '';

    if (!imageUrl || headerError) {
        return (
            <>
                <div
                    className={cn(
                        "relative rounded-md overflow-hidden cursor-pointer group transition-transform hover:scale-95",
                        getCardSize(),
                        getAspectRatio(),
                    )}
                    style={{
                        contentVisibility: "auto"
                    }}
                    onClick={handleClick}
                    onContextMenu={handleContextMenu}
                    data-title={getLocalizedGameName(resolvedGame)}
                >
                    {isFavorite && <FavouritesRibbon />}
                    <div className="w-full h-full bg-gradient-to-br from-night/80 to-night/60 text-fullMoon dark:from-fullMoon/30 dark:to-fullMoon/10 flex items-center justify-center">
                        <div className="text-center p-2">
                            <span className="material-symbols text-2xl opacity-50 mb-1 block">videogame_asset</span>
                            <span className="text-[11px] font-medium opacity-75 line-clamp-2 leading-4">{getLocalizedGameName(resolvedGame)}</span>
                        </div>
                    </div>
                    {resolvedGame.type && ["Demo", "Mod", "Tool"].includes(resolvedGame.type) && (
                        <img
                            src={`${process.env.PUBLIC_URL}/assets/${resolvedGame.type.toLowerCase()}_header.png`}
                            alt={`${resolvedGame.type} overlay`}
                            className="absolute inset-0 w-full h-full object-contain object-left-top"
                            loading="eager"
                            fetchPriority="high"
                            draggable={false}
                        />
                    )}
                
                    {children}
                </div>
                {contextMenu.visible && (
                    <LibrarySidebarContextMenu
                        x={contextMenu.x}
                        y={contextMenu.y}
                        onClose={closeContextMenu}
                        game={game}
                        collections={collections}
                        favourites={favourites}
                        setCollections={setCollections}
                        setFavourites={setFavourites}
                        gameStates={gameStates}
                        setGameState={setGameState}
                        games={games}
                    />
                )}
            </>
        )
    }

    return (
        <>
            <div
                className={cn(
                    "relative rounded-md overflow-hidden cursor-pointer group transition-transform hover:scale-95",
                    getCardSize(),
                    getAspectRatio(),
                    "after:absolute after:bottom-0 after:left-0 after:w-[calc(100%-1rem)] after:p-2 after:max-h-8 after:min-h-4 after:line-clamp-2 after:text-xs after:opacity-0 hover:after:opacity-100 after:transition-opacity after:duration-300 after:content-[attr(data-title)] after:bg-gradient-to-t after:from-black/80 after:to-transparent after:text-white after:rounded-tl-md"
                )}
                style={{
                    contentVisibility: "auto"
                }}
                onClick={handleClick}
                onContextMenu={handleContextMenu}
                data-title={getLocalizedGameName(resolvedGame)}
            >
                {isFavorite && <FavouritesRibbon />}
                <img
                    src={imageUrl}
                    alt={`${getLocalizedGameName(resolvedGame)} ${useCapsule ? "capsule" : "header"}`}
                    className={cn(
                        "w-full h-full object-cover transition-opacity duration-300",
                        !headerLoaded ? "opacity-0" : "opacity-100",
                    )}
                    onLoad={() => setHeaderLoaded(true)}
                    onError={() => {
                        if (candidateIndex < imageUrlCandidates.length - 1) {
                            setCandidateIndex(idx => idx + 1);
                        } else {
                            setHeaderError(true);
                        }
                    }}
                    loading="eager"
                    fetchPriority="high"
                    draggable={false}
                />

                {resolvedGame.type && ["Demo", "Mod", "Tool"].includes(resolvedGame.type) && (
                    <img
                        src={`${process.env.PUBLIC_URL}/assets/${resolvedGame.type.toLowerCase()}_header.png`}
                        alt={`${resolvedGame.type} overlay`}
                        className="absolute inset-0 w-full h-full object-contain object-left-top"
                        loading="eager"
                        fetchPriority="high"
                        draggable={false}
                    />
                )}

                {showTitle && (
                    <div className="absolute inset-0 p-2 pb-1 text-xs flex flex-col justify-end bg-gradient-to-t from-0% to-50% dark:from-night dark:to-night/0 from-fullMoon to-fullMoon/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <span className="line-clamp-2">{getLocalizedGameName(resolvedGame)}</span>
                    </div>
                )}
                
                { children }
            </div>
            {contextMenu.visible && (
                <LibrarySidebarContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    onClose={closeContextMenu}
                    game={game}
                    collections={collections}
                    favourites={favourites}
                    setCollections={setCollections}
                    setFavourites={setFavourites}
                    gameStates={gameStates}
                    setGameState={setGameState}
                    games={games}
                />
            )}
        </>
    )
}

export default GameCard
