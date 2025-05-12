import React, { useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { getLocalizedGameName, getLocalizedGameSuffix, LibraryContext } from '../Library';
import MatrixRain from '@/components/CustomElements/MatrixRain';
import { NormalizedGame, LaunchOption, NormalizedPseudoGameJoin, NormalizedGameJoin, NormalizedDLC } from '@/types';
import { cn } from '@/lib/utils';

function getLogoStyles(logoObj: any): React.CSSProperties {
    if (!logoObj || !logoObj.logo_position) return {};

    const { pinned_position, width_pct, height_pct, special } = logoObj.logo_position;

    const styles: React.CSSProperties = {
        width: `${width_pct}%`,
        height: `${height_pct}%`,
        position: 'absolute',
    };

    // Handle different pinned positions
    switch (pinned_position) {
        case 'BottomLeft':
            styles.bottom = '0';
            styles.left = '0';
            styles.objectPosition = 'bottom left';
            break;
        case 'CenterCenter':
            styles.top = '50%';
            styles.left = '50%';
            styles.transform = 'translate(-50%, -50%)';
            styles.objectPosition = 'center center';
            break;
        case 'UpperCenter':
            styles.top = '0';
            styles.left = '50%';
            styles.transform = 'translateX(-50%)';
            styles.objectPosition = 'top center';
            break;
        case 'BottomCenter':
            styles.bottom = '0';
            styles.left = '50%';
            styles.transform = 'translateX(-50%)';
            styles.objectPosition = 'bottom center';
            break;
        // Add other positions as needed
        default:
            styles.bottom = '0';
            styles.left = '0';
            styles.objectPosition = 'bottom left';
    }

    if (special === "osu") {
        styles.transform = undefined;
    }

    return styles;
}

function RenderDLCHeader({ game, dlc, dlcs }: { game: NormalizedGame, dlc: NormalizedDLC, dlcs: NormalizedDLC[] }): React.ReactNode {
    const [headerLoaded, setHeaderLoaded] = useState(false);
    const [headerError, setHeaderError] = useState(false);

    useEffect(() => {
        setHeaderError(false);
        setHeaderLoaded(false);
    }, [game.id, dlc.id]);

    if (!dlc.media?.headerUrl || headerError) {
        return (
            <div className="relative w-full aspect-[92/43] rounded-md overflow-hidden">
                <img
                    src={`local://${typeof game?.media?.headerUrl === "string" ? game.media.headerUrl : (game?.media?.headerUrl as any)?.image?.[getLocalizedGameSuffix(undefined)] || (game?.media?.headerUrl as any)?.image?.english}`}
                    alt={`${getLocalizedGameName(game)} header`}
                    className="absolute inset-0 w-full h-full object-cover"
                />
                <img
                    src={`${process.env.PUBLIC_URL}/assets/dlc_header.png`}
                    alt={`DLC Header Overlay`}
                    className="absolute inset-0 w-full h-full object-contain object-left-top"
                />
                <div className="absolute inset-0 p-2 pb-1 text-xs align-bottom flex flex-col justify-end bg-gradient-to-t from-0% to-75% dark:from-black/70 dark:to-night/0 from-fullMoon/70 to-fullMoon/0 opacity-0 hover:opacity-100 transition-opacity duration-300">
                    <span>{getLocalizedGameName(dlc, "deprefix", dlcs, game)}</span>
                </div>
            </div>
        );
    }

    return (
        <div className="relative w-full aspect-[92/43] rounded-md overflow-hidden">
            <img
                src={`local://${typeof dlc.media.headerUrl === "string" ? dlc.media.headerUrl : (dlc.media.headerUrl as any)?.[getLocalizedGameSuffix(undefined)] || (dlc.media.headerUrl as any)?.english}`}
                alt={`${getLocalizedGameName(dlc)} header`}
                className={`w-full h-full object-cover transition-opacity duration-300 ${headerLoaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => setHeaderLoaded(true)}
                onError={() => setHeaderError(true)}
            />
            <div className="absolute inset-0 p-2 pb-1 text-xs align-bottom flex flex-col justify-end bg-gradient-to-t from-0% to-75% dark:from-black/70 dark:to-night/0 from-fullMoon/70 to-fullMoon/0 opacity-0 hover:opacity-100 transition-opacity duration-300">
                <span>{getLocalizedGameName(dlc, "deprefix", dlcs, game)}</span>
            </div>
        </div>
    );
}

const LibraryGame: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { games, gameJoins, dlcs } = useContext(LibraryContext);
    const [currentGame, setCurrentGame] = useState<NormalizedGame | NormalizedPseudoGameJoin | null>(null);
    const [bannerLoaded, setBannerLoaded] = useState(false);
    const [bannerError, setBannerError] = useState(false);
    const [logoLoaded, setLogoLoaded] = useState(false);
    const [logoError, setLogoError] = useState(false);
    const [isLaunching, setIsLaunching] = useState(false);
    const [showAllDLCs, setShowAllDLCs] = useState(false);

    const isBannerDone = bannerLoaded || bannerError;
    const isLogoDone = logoLoaded || logoError;
    const isReady = isBannerDone && isLogoDone;

    const gameJoinsPopulated = gameJoins.map(join => {
        return {
            ...join,
            id: `join-${join.id}`,
            clients: Object.fromEntries(Object.entries(join.clients).map(([key, value]) => {
                return [key, games.find(game => String(game.id) === String(value) && game.source === key)];
            })) as unknown as Record<'steam' | 'epic' | 'itch' | 'osu' | 'deadforge', NormalizedGame>
        } as unknown as NormalizedGameJoin
    })

    function transformGameJoinIntoUsableFormat(join: NormalizedGameJoin): NormalizedPseudoGameJoin {
        return {
            id: String(join.id),
            source: join.clients as unknown as Record<'steam' | 'epic' | 'itch' | 'osu' | 'deadforge', NormalizedGame>,
            type: "GameJoin",
            defaultClient: join.defaultClient,
            preferences: join.preferences,
        }
    }

    function resolveDefaultGameVendor(game: NormalizedGame | NormalizedPseudoGameJoin): NormalizedGame {
        if (((game): game is NormalizedPseudoGameJoin => game?.type === "GameJoin")(game)) {
            return game.source[game.defaultClient];
        }
        return game;
    }

    const resolveAllGameVendors = useCallback((game: NormalizedGame | NormalizedPseudoGameJoin): NormalizedGame => {
        if (((game): game is NormalizedPseudoGameJoin => game?.type === "GameJoin")(game)) {
            const sourceKeys = Object.keys(game.source);
            const sourceString = sourceKeys.join(",") as unknown as 'steam' | 'epic' | 'itch' | 'osu' | 'deadforge';
            const defaultClient = game.source[game.defaultClient];

            return {
                id: typeof game.id === "string" ? game.id : JSON.stringify(Object.fromEntries(Object.entries(game.source).map(([key, value]) => [key, value.id]))),
                source: sourceString,
                name: JSON.stringify(defaultClient.name),
                type: defaultClient.type,
                installPath: JSON.stringify(Object.fromEntries(Object.entries(game.source).map(([key, val]) => [key, val.installPath]))),
                launchOptions: Object.entries(game.source).map(([key, val]) => val.launchOptions).flat().filter(Boolean) as LaunchOption[],
            };
        }
        return game;
    }, []);

    useEffect(() => {
        // Reset states only when ID changes
        setLogoError(false);
        setLogoLoaded(false);
        setBannerError(false);
        setBannerLoaded(false);
        setShowAllDLCs(false);

        // Rest of the effect remains unchanged
        if (id && [...games.filter(game => !gameJoinsPopulated.some(join => (join?.clients?.[game.source as keyof typeof join.clients] as NormalizedGame)?.id === game.id)), ...gameJoinsPopulated.map(transformGameJoinIntoUsableFormat)].length > 0) {
            let game = [...games.filter(game => !gameJoinsPopulated.some(join => (join?.clients?.[game.source as keyof typeof join.clients] as NormalizedGame)?.id === game.id)), ...gameJoinsPopulated.map(transformGameJoinIntoUsableFormat)].find(g => (`${g.source}-${g.id}` === id && g.type !== "GameJoin") || (g.id === id && g.type === "GameJoin")) as NormalizedGame | NormalizedPseudoGameJoin;
            const logo = resolveDefaultGameVendor(game)?.media?.logoUrl, hero = resolveDefaultGameVendor(game)?.media?.heroUrl;
            if (game) {
                if (game.source === "steam") {
                    if (game.media) {
                        if (logo) {
                            try {
                                if (typeof logo === "string") {
                                    game.media.logoUrl = JSON.parse(logo) as Record<string, Record<string, string>>;
                                }
                            } catch (error) {
                                game.media.logoUrl = (logo as string).replaceAll('%USERDATA%', 'CONST_USERDATA')
                            }
                        }
                        if (hero) {
                            try {
                                if (typeof hero === "string") {
                                    game.media.heroUrl = JSON.parse(hero) as Record<string, Record<string, string>>;
                                }
                            } catch (error) {
                                game.media.heroUrl = (hero as string).replaceAll('%USERDATA%', 'CONST_USERDATA')
                            }
                        }
                    }
                }
                setCurrentGame(game);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    // Add a separate effect to update the current game when games array changes
    useEffect(() => {
        if (id && [...games.filter(game => !gameJoinsPopulated.some(join => (join?.clients?.[game.source as keyof typeof join.clients] as NormalizedGame)?.id === game.id)), ...gameJoinsPopulated.map(transformGameJoinIntoUsableFormat)].length > 0 && currentGame) {
            let updatedGame = [...games.filter(game => !gameJoinsPopulated.some(join => (join?.clients?.[game.source as keyof typeof join.clients] as NormalizedGame)?.id === game.id)), ...gameJoinsPopulated.map(transformGameJoinIntoUsableFormat)].find(g => `${g.source}-${g.id}` === id);
            if (updatedGame && JSON.stringify(updatedGame) !== JSON.stringify(currentGame)) {
                // Process the game data same as in the original effect
                const logo = resolveDefaultGameVendor(updatedGame)?.media?.logoUrl, hero = resolveDefaultGameVendor(updatedGame)?.media?.heroUrl;
                if (updatedGame.source === "steam") {
                    if (updatedGame.media) {
                        if (logo) {
                            try {
                                if (typeof logo === "string") {
                                    updatedGame.media.logoUrl = JSON.parse(logo) as Record<string, Record<string, string>>;
                                }
                            } catch (error) {
                                updatedGame.media.logoUrl = (logo as string).replaceAll('%USERDATA%', 'CONST_USERDATA')
                            }
                        }
                        if (hero) {
                            try {
                                if (typeof hero === "string") {
                                    updatedGame.media.heroUrl = JSON.parse(hero) as Record<string, Record<string, string>>;
                                }
                            } catch (error) {
                                updatedGame.media.heroUrl = (hero as string).replaceAll('%USERDATA%', 'CONST_USERDATA')
                            }
                        }
                    }
                }
                setCurrentGame(updatedGame);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [games, gameJoins, id, currentGame]);

    const launchGame = async (game: NormalizedGame, option?: LaunchOption) => {
        if (!game.launchOptions || game.launchOptions.length === 0) return;

        const launchOption = option || game.launchOptions[0];
        setIsLaunching(true);

        try {
            console.log(`Launching ${game.name} with option: ${launchOption.name}`);
            console.log(`Executable: ${launchOption.executable}`);
            console.log(`Arguments: ${Array.isArray(launchOption.arguments) ? launchOption.arguments.join(' ') : launchOption.arguments}`);

            // This is where the actual launch would happen
            // window.Electron.execGame(game.id, launchOption.executable, launchOption.arguments);
            await new Promise(resolve => setTimeout(resolve, 1500));
        } catch (error) {
            console.error('Failed to launch game:', error);
        } finally {
            setIsLaunching(false);
        }
    };

    function renderGameLogo(game: NormalizedGame) {
        const fallback = <h1 className="text-6xl font-bold dark:text-notQuiteWhite text-notQuiteBlack drop-shadow-lg">{getLocalizedGameName(game)}</h1>;
        if (!game.media?.logoUrl) return fallback;

        const logoObj = game.media.logoUrl;
        const isObj = (logoObj: any): logoObj is Record<string, Record<string, string>> => typeof logoObj === "object" && logoObj !== null && "image" in logoObj;

        if (logoError) {
            return fallback;
        }

        if (game.source === "osu") {
            return (
                <div style={{ aspectRatio: '1/1', height: '75%', position: 'absolute', top: '50%', left: '50%', objectPosition: 'center center' }} className="relative -translate-x-1/2 -translate-y-1/2 scale-100 hover:scale-110 transition-transform duration-200 w-fit h-fit">
                    <img
                        src={`${process.env.PUBLIC_URL}/assets/osu!logo.svg`}
                        alt={`${getLocalizedGameName(game)} logo base`}
                        className="osuLogoBase absolute inset-0 w-full h-full object-contain"
                        onLoad={() => setLogoLoaded(true)}
                        onError={() => setLogoError(true)}
                    />
                    <img
                        src={`${process.env.PUBLIC_URL}/assets/osu!logoWhite.svg`}
                        alt={`${getLocalizedGameName(game)} logo outlines`}
                        className="osuLogoOutlines absolute inset-0 w-full h-full object-contain"
                        onLoad={() => setLogoLoaded(true)}
                        onError={() => setLogoError(true)}
                    />
                </div>
            );
        }

        if (isObj(logoObj)) {
            const logoImage = logoObj.image[getLocalizedGameSuffix("")] || Object.values(logoObj.image || {})[0];
            const logoStyles = getLogoStyles(logoObj);

            if (!logoImage) return fallback;

            return (
                <img
                    src={`local://${logoImage}?fallback=delocalized&delocalized=${encodeURIComponent(logoObj.image["english"].replaceAll("\\", "/")).replaceAll("%2F", "/")}`}
                    alt={`${getLocalizedGameName(game)} logo`}
                    style={logoStyles}
                    className="object-scale-down"
                    onLoad={() => setLogoLoaded(true)}
                    onError={() => setLogoError(true)}
                />
            );
        } else {
            return (
                <img
                    src={`local://${logoObj}?fallback=delocalized`}
                    alt={`${getLocalizedGameName(game)} logo`}
                    className="object-scale-down"
                    onLoad={() => setLogoLoaded(true)}
                    onError={() => setLogoError(true)}
                />
            )
        }
    }

    function renderBannerContent(game: NormalizedGame) {
        if (!game.media?.heroUrl || bannerError) {
            return (
                <div className="relative w-full h-full">
                    <MatrixRain fontSize={16} />
                    <div className="absolute inset-0 bg-gradient-to-t from-0% to-75% dark:from-black/70 dark:to-night/0 from-fullMoon/70 to-fullMoon/0"></div>
                </div>
            );
        }

        let overlayUrl;
        if (game.type === "Demo") {
            overlayUrl = `${process.env.PUBLIC_URL}/assets/demo_header.png`;
        } else if (game.type === "Mod") {
            overlayUrl = `${process.env.PUBLIC_URL}/assets/mod_header.png`;
        } else if (game.type === "Tool") {
            overlayUrl = `${process.env.PUBLIC_URL}/assets/tool_header.png`;
        }


        // Otherwise, show the hero image
        return (
            <div className="relative w-full h-full">
                {
                    overlayUrl && (
                        <img
                            src={overlayUrl}
                            alt={`${getLocalizedGameName(game)} banner`}
                            className="absolute top-0 left-0 h-3/4 object-cover object-left-top"
                        />
                    )
                }
                <img
                    src={game.source === "osu" ? (game.media.heroUrl as string) : `local://${typeof game.media.heroUrl === "string" ? game.media.heroUrl : (game.media.heroUrl as any)?.image?.[getLocalizedGameSuffix(undefined)] || (game.media.heroUrl as any)?.image?.english}`}
                    alt={`${getLocalizedGameName(game)} banner`}
                    className={`w-full h-full object-cover transition-opacity duration-300 ${bannerLoaded ? 'opacity-100' : 'opacity-0'}`}
                    onLoad={() => setBannerLoaded(true)}
                    onError={() => setBannerError(true)}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-0% to-75% dark:from-black/70 dark:to-night/0 from-fullMoon/70 to-fullMoon/0"></div>
            </div>
        );
    }

    const resolvedVendors = useMemo(() => {
        if (!currentGame) return null;
        return resolveAllGameVendors(currentGame);
    }, [currentGame, resolveAllGameVendors]);

    if (!currentGame) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-2xl dark:text-gray-200 text-gray-800">Loading game...</p>
            </div>
        );
    }

    return (
        <div className="h-full w-full overflow-y-auto flex-1">
            {/* Banner section with logo or title */}
            <div className="relative w-full h-80 border-0 border-b border-notQuiteBlack/10 dark:border-notQuiteWhite/10 border-solid" style={{ display: isReady ? 'block' : 'none' }}>
                {renderBannerContent(resolveDefaultGameVendor(currentGame))}

                {/* Logo or title */}
                <div className="absolute bottom-4 left-5 flex items-end w-[calc(100%-2.5rem)] h-[calc(100%-2rem)]">
                    {renderGameLogo(resolveDefaultGameVendor(currentGame))}
                </div>

                {/* Play button */}
                <div className="absolute bottom-8 right-10">
                    <button
                        onClick={() => launchGame(resolveDefaultGameVendor(currentGame))}
                        disabled={!resolveDefaultGameVendor(currentGame).launchOptions || resolveDefaultGameVendor(currentGame).launchOptions?.length === 0 || isLaunching}
                        className={`
                            font-bold py-2 pr-4 pl-3 rounded-full flex items-center space-x-2 transition-all duration-200
                            ${isLaunching ? 'bg-gray-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 hover:scale-105'}
                            text-white shadow-lg
                        `}
                    >
                        <span className="material-symbols">
                            {isLaunching ? 'hourglass_top' : 'play_arrow'}
                        </span>
                        <span>{isLaunching ? 'Launching...' : 'Play'}</span>
                    </button>
                </div>
            </div>

            {/* Game details section */}
            <div className="p-10" style={{ display: isReady ? 'block' : 'none' }}>
                <div className="grid grid-cols-1 xl:grid-cols-7 gap-y-8 xl:gap-x-8">
                    {/* Left column - Game info */}
                    <div className="col-span-1 md:col-span-4 flex flex-col gap-y-6">
                        <h2 className="text-3xl font-bold dark:text-white text-gray-900">{getLocalizedGameName(resolveDefaultGameVendor(currentGame))}</h2>

                        {/* Source badge */}
                        <div className="flex items-center gap-x-2">
                            {resolvedVendors?.source.split(",").map(source =>
                                <span key={source} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                    {source.toUpperCase()}
                                </span>)
                            }
                        </div>

                        {/* Installation info */}
                        {resolveDefaultGameVendor(currentGame).installPath && (
                            <div className="mt-4">
                                <h3 className="text-lg font-medium dark:text-gray-200 text-gray-800">Installation Directory</h3>
                                <p className="text-sm dark:text-gray-400 text-gray-600 mt-1 whitespace-pre-wrap">{
                                    resolveAllGameVendors(currentGame)?.installPath?.[0]! === "{" ? Object.entries(JSON.parse(resolveAllGameVendors(currentGame)?.installPath!)).map(([key, val]: [string, unknown]) => `${(val as string).replace("/", "\\")}`).join("\n") : resolveAllGameVendors(currentGame)?.installPath
                                }
                                </p>
                            </div>
                        )}

                        {/* Size info */}
                        {resolveDefaultGameVendor(currentGame).sizeBytes && (
                            <div className="mt-4">
                                <h3 className="text-lg font-medium dark:text-gray-200 text-gray-800">Size</h3>
                                <p className="text-sm dark:text-gray-400 text-gray-600 mt-1">
                                    {((resolveDefaultGameVendor(currentGame)?.sizeBytes || 0) / (1024 * 1024 * 1024)).toFixed(2)} GB
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Right column - Launch options */}
                    <div className="col-span-1 md:col-span-3 flex flex-col gap-y-6">
                        {dlcs.filter(dlc => dlc.parentGameId === resolveDefaultGameVendor(currentGame).id).length > 0 && (
                            <div>
                                <h3 className="text-xl font-semibold dark:text-white text-gray-900 mb-4">DLCs</h3>
                                <div className="relative">
                                    <ul className={cn("grid grid-cols-2 gap-2", !showAllDLCs && "pb-4")}>
                                        {dlcs
                                            .filter(dlc => dlc.parentGameId === resolvedVendors?.id)
                                            .slice(0, showAllDLCs ? undefined : 6)
                                            .map(dlc => (
                                                <li key={dlc.id as string}>
                                                    <RenderDLCHeader
                                                        game={resolveDefaultGameVendor(currentGame)}
                                                        dlc={dlc}
                                                        dlcs={dlcs.filter(dlc => dlc.parentGameId === resolvedVendors?.id)}
                                                    />
                                                </li>
                                            ))}
                                    </ul>
                                    {dlcs.filter(dlc => dlc.parentGameId === resolvedVendors?.id).length > 6 && (
                                        <div
                                            className={cn(
                                                "absolute flex flex-col justify-end items-center bottom-0 left-0 right-0 h-8 transition-all pointer-events-none",
                                                !showAllDLCs && "bg-gradient-to-t from-night to-transparent dark:from-night dark:to-transparent  mb-4",
                                                showAllDLCs && "bg-none"
                                            )}
                                        >
                                            <button
                                                onClick={() => setShowAllDLCs(!showAllDLCs)}
                                                className="w-fit h-fit my-4 px-2 py-1.5 rounded-lg text-center text-sm font-medium text-night dark:text-fullMoon hover:text-black dark:hover:text-white bg-transparent hover:bg-fullMoon/50 dark:hover:bg-night/50 transition-colors pointer-events-auto"
                                            >
                                                {showAllDLCs ? 'Show Less' : 'Show More'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        {resolveAllGameVendors(currentGame).launchOptions && (resolveAllGameVendors(currentGame)?.launchOptions?.length || 0) > 0 && (
                            <div>
                                <h3 className="text-xl font-semibold dark:text-white text-gray-900 mb-4">Launch Options</h3>
                                <div className="space-y-3">
                                    {resolveAllGameVendors(currentGame).launchOptions?.map((option, index) => (
                                        <button
                                            key={index}
                                            onClick={() => launchGame(resolveAllGameVendors(currentGame), option)}
                                            disabled={isLaunching}
                                            className={`
                                                w-[calc(100%-32px)] text-left px-4 py-3 rounded-lg transition-colors duration-150
                                                ${isLaunching ? 'bg-gray-200 dark:bg-gray-700 cursor-not-allowed' : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'}
                                            `}
                                        >
                                            <div className="font-medium dark:text-white text-gray-900">{option.name}</div>
                                            <div className="text-sm dark:text-gray-400 text-gray-600 truncate">{option.executable} {option.arguments}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Loading state */}
            <div className="flex items-center justify-center h-full" style={{ display: isReady ? 'none' : 'flex' }}>
                <div className="text-4xl dark:text-gray-200 text-gray-800 font-uniSansCAPS font-bold">Loading</div>
            </div>
        </div>
    );
};

export default LibraryGame;