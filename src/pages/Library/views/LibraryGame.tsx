import type React from "react"
import { useContext, useEffect, useState, useMemo, useCallback, useRef, lazy } from "react"
import { useParams } from "react-router-dom"
import { getLocalizedGameName, getLocalizedGameSuffix, LibraryContext } from "../Library"
import type {
    NormalizedGame,
    LaunchOption,
    NormalizedPseudoGameJoin,
    NormalizedGameJoin,
    NormalizedDLC,
    Collection,
    GameWarning,
} from "@/types"
import { cn } from "@/lib/utils"
// import { SiSteam, SiEpicgames, SiItchdotio } from '@icons-pack/react-simple-icons';
import Tooltip from "@/components/CustomElements/Tooltip"
import { GetSourceIcon } from "../components/LibrarySidebar"
import ContextMenu, { type MenuItemType } from "@/components/CustomElements/ContextMenu"
import { getLauncherName } from "../utils/LibraryHelpers"
import { useTranslation } from "react-i18next"
import { Trans } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { formatDistanceToNowStrict, formatDistance, formatDistanceStrict, format } from 'date-fns';
import i18n, { dateFNSResources } from '@/locales/i18n';
const GameWarningComponent = lazy(() => import("@/pages/Library/components/GameWarning"))
// const GameSettingsModal = lazy(() => import("@/pages/Library/components/GameSettingsModal"))
const MatrixRain = lazy(() => import("@/components/CustomElements/MatrixRain"))

export function getLogoStyles(game: NormalizedGame, curatedAssets: any[], customAssets: any[]): React.CSSProperties {
    const gameId = String(game.id);
    const gameSource = game.source;

    // Helper function to extract logo object from media data
    const getLogoFromMediaData = (mediaData: any): any => {
        if (!mediaData?.logoUrl) return null;
        return mediaData.logoUrl;
    };

    // Try each asset source with priority
    const customAsset = customAssets.find(asset => asset.id === gameId && asset.source === gameSource);
    const curatedAsset = curatedAssets.find(asset => asset.id === gameId && asset.source === gameSource);

    const customLogo = getLogoFromMediaData(customAsset?.media);
    const curatedLogo = getLogoFromMediaData(curatedAsset?.media);
    const officialLogo = getLogoFromMediaData(game.media);

    // Use the first available logo object with priority
    const logoObj = customLogo || curatedLogo || officialLogo;

    if (!logoObj) return { width: "50%", height: "50%", position: "absolute", bottom: 0, left: 0, objectPosition: "bottom left" }
    if (!logoObj.logo_position) return { width: "50%", height: "50%", position: "absolute", bottom: 0, left: 0, objectPosition: "bottom left" }

    const { pinned_position, width_pct, height_pct, special } = logoObj.logo_position

    const styles: React.CSSProperties = {
        width: `${width_pct}%`,
        height: `${height_pct}%`,
        position: "absolute",
    }

    // Handle different pinned positions
    switch (pinned_position) {
        default:
        case "BottomLeft":
            styles.bottom = "0"
            styles.left = "0"
            styles.objectPosition = "bottom left"
            break
        case "CenterCenter":
            styles.top = "50%"
            styles.left = "50%"
            styles.transform = "translate(-50%, -50%)"
            styles.objectPosition = "center center"
            break
        case "UpperCenter":
            styles.top = "0"
            styles.left = "50%"
            styles.transform = "translateX(-50%)"
            styles.objectPosition = "top center"
            break
        case "BottomCenter":
            styles.bottom = "0"
            styles.left = "50%"
            styles.transform = "translateX(-50%)"
            styles.objectPosition = "bottom center"
            break
    }

    if (special === "osu") {
        styles.transform = undefined
    }

    return styles
}

const RenderDLCHeader = ({
    game,
    dlc,
    dlcs,
    curatedAssets,
    customAssets,
}: {
    game: NormalizedGame;
    dlc: NormalizedDLC;
    dlcs: NormalizedDLC[];
    curatedAssets: any[];
    customAssets: any[];
}): React.ReactNode => {
    const [headerLoaded, setHeaderLoaded] = useState(false)
    const [headerError, setHeaderError] = useState(false)

    // Helper function to get URL from media data with priority
    const getHeaderUrl = (targetGame: NormalizedGame | NormalizedDLC): string | null => {
        const gameId = String(targetGame.id);
        const gameSource = targetGame.source || game.source;
        const suffix = getLocalizedGameSuffix();
        const defaultSuffix = 'english';

        const getUrlFromMediaData = (mediaData: any): string | null => {
            if (!mediaData?.headerUrl) return null;
            if (typeof mediaData.headerUrl === 'string') return mediaData.headerUrl;
            return mediaData.headerUrl;
        };

        const customAsset = customAssets.find(asset => asset.id === gameId && asset.source === gameSource);
        const curatedAsset = curatedAssets.find(asset => asset.id === gameId && asset.source === gameSource);

        // Get all header objects
        const customHeaderObj = getUrlFromMediaData(customAsset?.media);
        const curatedHeaderObj = getUrlFromMediaData(curatedAsset?.media);
        const officialHeaderObj = getUrlFromMediaData(targetGame.media);

        // Helper to check specific language in an object
        const getLanguageUrl = (obj: any, lang: string): string | null => {
            if (!obj) return null;
            if (typeof obj === 'string') return obj;
            if (obj.image?.[lang]) return obj.image[lang];
            if (typeof obj.image === 'string') return obj.image;
            if (obj[lang]) return obj[lang];
            return null;
        };

        // Try current language across all sources
        const customCurrentLang = getLanguageUrl(customHeaderObj, suffix);
        if (customCurrentLang) return customCurrentLang;

        const curatedCurrentLang = getLanguageUrl(curatedHeaderObj, suffix);
        if (curatedCurrentLang) return curatedCurrentLang;

        const officialCurrentLang = getLanguageUrl(officialHeaderObj, suffix);
        if (officialCurrentLang) return officialCurrentLang;

        // Try default language across all sources
        const customDefaultLang = getLanguageUrl(customHeaderObj, defaultSuffix);
        if (customDefaultLang) return customDefaultLang;

        const curatedDefaultLang = getLanguageUrl(curatedHeaderObj, defaultSuffix);
        if (curatedDefaultLang) return curatedDefaultLang;

        const officialDefaultLang = getLanguageUrl(officialHeaderObj, defaultSuffix);
        if (officialDefaultLang) return officialDefaultLang;

        // Try any language as last resort
        const getFallbackUrl = (obj: any): string | null => {
            if (!obj) return null;
            if (typeof obj === 'string') return obj;
            if (obj.image) {
                const firstImage = Object.values(obj.image)[0];
                if (firstImage) return firstImage as string;
            }
            const firstValue = Object.values(obj)[0];
            if (firstValue) return firstValue as string;
            return null;
        };

        const customFallback = getFallbackUrl(customHeaderObj);
        if (customFallback) return customFallback;

        const curatedFallback = getFallbackUrl(curatedHeaderObj);
        if (curatedFallback) return curatedFallback;

        const officialFallback = getFallbackUrl(officialHeaderObj);
        if (officialFallback) return officialFallback;

        // Instead of setting error state, just return null
        return null;
    };

    // Use useEffect to handle URL fetching and error states
    useEffect(() => {
        const dlcHeaderUrl = getHeaderUrl(dlc);
        const gameHeaderUrl = getHeaderUrl(game);

        if (!(dlcHeaderUrl || gameHeaderUrl)) {
            setHeaderError(true);
            setHeaderLoaded(false)
        } else {
            setHeaderError(false);
            setHeaderLoaded(true);
        }
    }, [game.id, dlc.id, dlc, game]);

    const dlcHeaderUrl = getHeaderUrl(dlc);
    const gameHeaderUrl = getHeaderUrl(game);

    if (!dlcHeaderUrl || headerError) {
        return (
            <div className="relative w-full aspect-[92/43] rounded-md overflow-hidden">
                <img
                    src={`local://${gameHeaderUrl}`}
                    alt={`${getLocalizedGameName(game)} header`}
                    className="absolute inset-0 w-full h-full object-cover"
                    draggable={false}
                />
                <img
                    src={`${process.env.PUBLIC_URL}/assets/dlc_header.png`}
                    alt={`DLC Header Overlay`}
                    className="absolute inset-0 w-full h-full object-contain object-left-top"
                    draggable={false}
                />
                <div className="absolute inset-0 p-2 pb-1 text-xs align-bottom flex flex-col justify-end bg-gradient-to-t from-0% to-75% dark:from-black/70 dark:to-night/0 from-fullMoon/70 to-fullMoon/0 opacity-0 hover:opacity-100 transition-opacity duration-300">
                    <span>{getLocalizedGameName(dlc, "deprefix", dlcs, game)}</span>
                </div>
            </div>
        )
    }

    return (
        <div className="relative w-full aspect-[92/43] rounded-md overflow-hidden">
            <img
                src={`local://${dlcHeaderUrl}`}
                alt={`${getLocalizedGameName(dlc)} header`}
                className={`w-full h-full object-cover transition-opacity duration-300 ${headerLoaded ? "opacity-100" : "opacity-0"}`}
                onLoad={() => setHeaderLoaded(true)}
                onError={() => setHeaderError(true)}
                draggable={false}
            />
            <div className="absolute inset-0 p-2 pb-1 text-xs align-bottom flex flex-col justify-end bg-gradient-to-t from-0% to-75% dark:from-black/70 dark:to-night/0 from-fullMoon/70 to-fullMoon/0 opacity-0 hover:opacity-100 transition-opacity duration-300">
                <span>{getLocalizedGameName(dlc, "deprefix", dlcs, game)}</span>
            </div>
        </div>
    )
}

function useResolvedPath(executable: string) {
    const [resolvedPath, setResolvedPath] = useState(executable)
    const mounted = useRef(true)

    useEffect(() => {
        window.Electron.resolveDisplayPath(executable).then((path) => {
            if (mounted.current) setResolvedPath(path)
        })
        return () => {
            mounted.current = false
        }
    }, [executable])

    return resolvedPath
}

// Component to display resolved path
const ResolvedPath: React.FC<{ executable: string }> = ({ executable }) => {
    const resolvedPath = useResolvedPath(executable)
    return <>{resolvedPath}</>
}

// Helper functions moved outside of render scope
function getLogoUrlFromData(
    game: NormalizedGame,
    customAssets: any[],
    curatedAssets: any[],
    suffix: string,
    defaultSuffix: string = 'english'
): { url: string | null; logoObj: any } {
    console.log(game);
    const gameId = String(game.id);
    const gameSource = game.source;

    const customAsset = customAssets.find(asset => asset.id === gameId && asset.source === gameSource);
    const curatedAsset = curatedAssets.find(asset => asset.id === gameId && asset.source === gameSource);

    const getUrlFromMediaData = (mediaData: any): string | null => {
        if (!mediaData?.logoUrl) return null;
        if (typeof mediaData.logoUrl === 'string') return mediaData.logoUrl;
        return mediaData.logoUrl;
    };

    const customLogoObj = getUrlFromMediaData(customAsset?.media);
    const curatedLogoObj = getUrlFromMediaData(curatedAsset?.media);
    const officialLogoObj = getUrlFromMediaData(game.media);

    const getLanguageUrl = (obj: any, lang: string): string | null => {
        if (!obj) return null;
        if (typeof obj === 'string') return obj;
        if (obj.image?.[lang]) return obj.image[lang];
        if (typeof obj.image === 'string') return obj.image;
        if (obj[lang]) return obj[lang];
        return null;
    };

    console.log(customLogoObj, curatedLogoObj, officialLogoObj)

    // Try current language across all sources
    const customCurrentLang = getLanguageUrl(customLogoObj, suffix);
    if (customCurrentLang) return { url: customCurrentLang, logoObj: customLogoObj };

    const curatedCurrentLang = getLanguageUrl(curatedLogoObj, suffix);
    if (curatedCurrentLang) return { url: curatedCurrentLang, logoObj: curatedLogoObj };

    const officialCurrentLang = getLanguageUrl(officialLogoObj, suffix);
    if (officialCurrentLang) return { url: officialCurrentLang, logoObj: officialLogoObj };

    // Try default language across all sources
    const customDefaultLang = getLanguageUrl(customLogoObj, defaultSuffix);
    if (customDefaultLang) return { url: customDefaultLang, logoObj: customLogoObj };

    const curatedDefaultLang = getLanguageUrl(curatedLogoObj, defaultSuffix);
    if (curatedDefaultLang) return { url: curatedDefaultLang, logoObj: curatedLogoObj };

    const officialDefaultLang = getLanguageUrl(officialLogoObj, defaultSuffix);
    if (officialDefaultLang) return { url: officialDefaultLang, logoObj: officialLogoObj };

    // Try any language as last resort
    const getFallbackUrl = (obj: any): string | null => {
        if (!obj) return null;
        if (typeof obj === 'string') return obj;
        if (obj.image) {
            const firstImage = Object.values(obj.image)[0];
            if (firstImage) return firstImage as string;
        }
        const firstValue = Object.values(obj)[0];
        if (firstValue) return firstValue as string;
        return null;
    };

    const customFallback = getFallbackUrl(customLogoObj);
    if (customFallback) return { url: customFallback, logoObj: customLogoObj };

    const curatedFallback = getFallbackUrl(curatedLogoObj);
    if (curatedFallback) return { url: curatedFallback, logoObj: curatedLogoObj };

    const officialFallback = getFallbackUrl(officialLogoObj);
    if (officialFallback) return { url: officialFallback, logoObj: officialLogoObj };

    return { url: null, logoObj: null };
}

function getHeroUrlFromData(
    game: NormalizedGame,
    customAssets: any[],
    curatedAssets: any[],
    suffix: string,
    defaultSuffix: string = 'english'
): string | null {
    const gameId = String(game.id);
    const gameSource = game.source;

    const getUrlFromMediaData = (mediaData: any): string | null => {
        if (!mediaData?.heroUrl) return null;
        if (typeof mediaData.heroUrl === 'string') return mediaData.heroUrl;
        return mediaData.heroUrl;
    };

    const customAsset = customAssets.find(asset => asset.id === gameId && asset.source === gameSource);
    const curatedAsset = curatedAssets.find(asset => asset.id === gameId && asset.source === gameSource);

    const customHeroObj = getUrlFromMediaData(customAsset?.media);
    const curatedHeroObj = getUrlFromMediaData(curatedAsset?.media);
    const officialHeroObj = getUrlFromMediaData(game.media);

    const getLanguageUrl = (obj: any, lang: string): string | null => {
        if (!obj) return null;
        if (typeof obj === 'string') return obj;
        if (obj.image?.[lang]) return obj.image[lang];
        if (typeof obj.image === 'string') return obj.image;
        if (obj[lang]) return obj[lang];
        return null;
    };

    // Try current language across all sources
    const customCurrentLang = getLanguageUrl(customHeroObj, suffix);
    if (customCurrentLang) return customCurrentLang;

    const curatedCurrentLang = getLanguageUrl(curatedHeroObj, suffix);
    if (curatedCurrentLang) return curatedCurrentLang;

    const officialCurrentLang = getLanguageUrl(officialHeroObj, suffix);
    if (officialCurrentLang) return officialCurrentLang;

    // Try default language across all sources
    const customDefaultLang = getLanguageUrl(customHeroObj, defaultSuffix);
    if (customDefaultLang) return customDefaultLang;

    const curatedDefaultLang = getLanguageUrl(curatedHeroObj, defaultSuffix);
    if (curatedDefaultLang) return curatedDefaultLang;

    const officialDefaultLang = getLanguageUrl(officialHeroObj, defaultSuffix);
    if (officialDefaultLang) return officialDefaultLang;

    // Try any language as last resort
    const getFallbackUrl = (obj: any): string | null => {
        if (!obj) return null;
        if (typeof obj === 'string') return obj;
        if (obj.image) {
            const firstImage = Object.values(obj.image)[0];
            if (firstImage) return firstImage as string;
        }
        const firstValue = Object.values(obj)[0];
        if (firstValue) return firstValue as string;
        return null;
    };

    const customFallback = getFallbackUrl(customHeroObj);
    if (customFallback) return customFallback;

    const curatedFallback = getFallbackUrl(curatedHeroObj);
    if (curatedFallback) return curatedFallback;

    const officialFallback = getFallbackUrl(officialHeroObj);
    if (officialFallback) return officialFallback;

    return null;
}

// Pure render function for game logo
const GameLogo = ({
    game,
    logoUrl,
    logoObj,
    onLoad,
    onError,
    curatedAssets,
    customAssets
}: {
    game: NormalizedGame;
    logoUrl: string | null;
    logoObj: any;
    onLoad: () => void;
    onError: () => void;
    curatedAssets: any[];
    customAssets: any[];
}) => {
    const fallback = (
        <h1 className="text-6xl font-bold dark:text-notQuiteWhite text-notQuiteBlack drop-shadow-lg">
            {getLocalizedGameName(game)}
        </h1>
    );

    if (!logoUrl) return fallback;

    if (game.source === "osu") {
        return (
            <div
                style={{
                    aspectRatio: "1/1",
                    height: "75%",
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    objectPosition: "center center",
                }}
                className="relative -translate-x-1/2 -translate-y-1/2 scale-100 hover:scale-110 transition-transform duration-200 w-fit h-fit"
            >
                <img
                    src={`${process.env.PUBLIC_URL}/assets/osu!logo.svg`}
                    alt={`${getLocalizedGameName(game)} logo base`}
                    className="osuLogoBase absolute inset-0 w-full h-full object-contain"
                    onLoad={onLoad}
                    onError={onError}
                    draggable={false}
                />
                <img
                    src={`${process.env.PUBLIC_URL}/assets/osu!logoWhite.svg`}
                    alt={`${getLocalizedGameName(game)} logo outlines`}
                    className="osuLogoOutlines absolute inset-0 w-full h-full object-contain"
                    onLoad={onLoad}
                    onError={onError}
                    draggable={false}
                />
            </div>
        );
    }

    if (logoObj && typeof logoObj === 'object') {
        const logoStyles = getLogoStyles(game, curatedAssets, customAssets);
        const fallbackLogoImage = logoObj.image?.["english"]
            ? logoObj.image["english"].replaceAll("\\", "/").replaceAll("%2F", "/")
            : Object.values(logoObj.image || {})[0];

        return (
            <img
                src={`local://${logoUrl?.replace("%USERDATA%", "CONST_USERDATA")}?fallback=delocalized&delocalized=${encodeURIComponent(fallbackLogoImage)}`}
                alt={`${getLocalizedGameName(game)} logo`}
                style={logoStyles}
                className="object-scale-down max-w-full max-h-full"
                onLoad={onLoad}
                onError={onError}
                draggable={false}
            />
        );
    }

    return (
        <img
            src={`local://${logoUrl}?fallback=delocalized`}
            alt={`${getLocalizedGameName(game)} logo`}
            className="object-scale-down max-w-full max-h-full"
            onLoad={onLoad}
            onError={onError}
            draggable={false}
        />
    );
}

// Pure render function for banner content
const BannerContent = ({
    game,
    heroUrl,
    bannerLoaded,
    bannerBlurReady,
    onBlurLoad,
    onLoad,
    onError
}: {
    game: NormalizedGame;
    heroUrl: string | null;
    bannerLoaded: boolean;
    bannerBlurReady: boolean;
    onBlurLoad: () => void;
    onLoad: () => void;
    onError: () => void;
}) => {
    let overlayUrl;
    if (game.type === "Demo") {
        overlayUrl = `${process.env.PUBLIC_URL}/assets/demo_header.png`;
    } else if (game.type === "Mod") {
        overlayUrl = `${process.env.PUBLIC_URL}/assets/mod_header.png`;
    } else if (game.type === "Tool") {
        overlayUrl = `${process.env.PUBLIC_URL}/assets/tool_header.png`;
    }

    if (!heroUrl) {
        return (
            <div className="relative w-full h-full">
                {overlayUrl && (
                    <img
                        src={overlayUrl}
                        alt={`${getLocalizedGameName(game)} banner`}
                        className="absolute top-0 left-0 h-3/4 object-cover object-left-top z-[1]"
                        draggable={false}
                    />
                )}
                <MatrixRain fontSize={16} />
                <div className="absolute inset-0 bg-gradient-to-t from-0% via-[33%] to-[67%] dark:from-black/70 dark:via-night/20 dark:to-night/0 from-white/70 via-white/25 to-fullMoon/0"></div>
            </div>
        );
    }

    const imageUrl = game.source === "osu"
        ? heroUrl
        : `local://${heroUrl?.replace("%USERDATA%", "CONST_USERDATA")}`;

    return (
        <div className="relative w-full h-full">
            {overlayUrl && (
                <img
                    src={overlayUrl}
                    alt={`${getLocalizedGameName(game)} banner`}
                    className="absolute top-0 left-0 h-3/4 object-cover object-left-top z-[1]"
                    draggable={false}
                />
            )}
            {bannerLoaded && (
                <img
                    src={imageUrl}
                    alt={`${getLocalizedGameName(game)} banner background`}
                    className={`w-full h-full object-cover blur-0 transition-[filter,opacity] duration-[15s,300ms] delay-[3s,0ms] ${bannerBlurReady ? "opacity-100 blur-[64px]" : "opacity-0"}`}
                    onLoad={onBlurLoad}
                    draggable={false}
                />
            )}
            <img
                src={imageUrl}
                alt={`${getLocalizedGameName(game)} banner`}
                className={`w-full h-full object-cover transition-opacity duration-1000 absolute -translate-y-full ${bannerLoaded ? "opacity-100" : "opacity-0"}`}
                onLoad={onLoad}
                onError={onError}
                draggable={false}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-0% via-[33%] to-[67%] dark:from-black/70 dark:via-night/20 dark:to-night/0 from-white/70 via-white/25 to-fullMoon/0"></div>
        </div>
    );
}

const LibraryGame: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const {
        games,
        gameJoins,
        dlcs,
        gameStates,
        setGameState,
        launchTimestamps,
        collections,
        favourites,
        setFavourites,
        setCollections,
        customAssets,
        curatedAssets,
        openInstallModal,
    } = useContext(LibraryContext)
    const [currentGame, setCurrentGame] = useState<NormalizedGame | NormalizedPseudoGameJoin | null>(null)
    const [bannerLoaded, setBannerLoaded] = useState(false)
    const [bannerError, setBannerError] = useState(false)
    const [bannerBlurReady, setBannerBlurReady] = useState(false)
    const [logoLoaded, setLogoLoaded] = useState(false)
    const [logoError, setLogoError] = useState(false)
    const [showAllDLCs, setShowAllDLCs] = useState(false)
    const [isCheckingStatus, setIsCheckingStatus] = useState(false)
    const [launchTimeExceeded, setLaunchTimeExceeded] = useState(false)
    const [selectedLaunchOption, setSelectedLaunchOption] = useState<LaunchOption | null>(null)
    const [showLaunchOptions, setShowLaunchOptions] = useState(false)
    const [showCollectionMenu, setShowCollectionMenu] = useState(false)
    const [collectionMenuPosition, setCollectionMenuPosition] = useState({ x: 0, y: 0 })
    const [newCollectionName, setNewCollectionName] = useState("")
    const [isCreatingCollection, setIsCreatingCollection] = useState(false)
    const newCollectionInputRef = useRef<HTMLInputElement>(null)
    const launchButtonRef = useRef<HTMLDivElement>(null)
    const collectionsButtonRef = useRef<HTMLLabelElement>(null)
    const isBannerDone = bannerLoaded || bannerError
    const isLogoDone = logoLoaded || logoError
    const isReady = isBannerDone && isLogoDone
    const [warnings, setWarnings] = useState<GameWarning | null>(null)
    const [isLoadingWarnings, setIsLoadingWarnings] = useState(false)
    const [warningsError, setWarningsError] = useState<string | null>(null)
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [metrics, setMetrics] = useState<{ lastPlayed: number, totalPlayedFor: number }>({ lastPlayed: 0, totalPlayedFor: 0 });

    // Get the current game state
    const gameStateKey = currentGame
        ? `${resolveDefaultGameVendor(currentGame).source}-${typeof currentGame.id === "object" ? JSON.stringify(currentGame.id) : currentGame.id}`
        : undefined
    const currentGameState = gameStateKey ? gameStates[gameStateKey] : undefined

    // For game joins, check if any of the joined games are in a specific state
    const isGameJoin = currentGame?.type === "GameJoin"
    const gameJoinStates = useMemo(() => {
        if (!isGameJoin || !currentGame) return null

        // Get all sources from the join
        const joinGame = currentGame as NormalizedPseudoGameJoin
        const sourceEntries = Object.entries(joinGame.source)

        // Check state for each source
        return sourceEntries.map(([source, game]) => {
            const gameId = typeof game.id === "object" ? JSON.stringify(game.id) : game.id
            const stateKey = `${source}-${gameId}`
            return {
                source,
                gameId,
                state: gameStates[stateKey]?.state || "idle",
            }
        })
    }, [currentGame, gameStates, isGameJoin])

    // If this is a game join, determine the overall state based on any active processes
    const isLaunching = isGameJoin
        ? (gameJoinStates?.some((state) => state.state === "launching") ?? false)
        : currentGameState?.state === "launching"

    const isRunning = isGameJoin
        ? (gameJoinStates?.some((state) => state.state === "running") ?? false)
        : currentGameState?.state === "running"

    const isStopping = isGameJoin
        ? (gameJoinStates?.some((state) => state.state === "stopping") ?? false)
        : currentGameState?.state === "stopping"
    
    const isChecking = isGameJoin
        ? (gameJoinStates?.some((state) => state.state === "checking") ?? false)
        : currentGameState?.state === "checking"
    
    const isPreparing = isGameJoin
        ? (gameJoinStates?.some((state) => state.state === "preparing") ?? false)
        : currentGameState?.state === "preparing"

    const isDownloading = isGameJoin
        ? (gameJoinStates?.some((state) => state.state === "downloading") ?? false)
        : currentGameState?.state === "downloading"

    const isDownloadingPatch = isGameJoin
        ? (gameJoinStates?.some((state) => state.state === "downloadingPatch") ?? false)
        : currentGameState?.state === "downloadingPatch"

    const isInstalling = isGameJoin
        ? (gameJoinStates?.some((state) => state.state === "installing") ?? false)
        : currentGameState?.state === "installing"
    
    const isApplyingPatch = isGameJoin
        ? (gameJoinStates?.some((state) => state.state === "applyingPatch") ?? false)
        : currentGameState?.state === "applyingPatch"
    
    const isFinishingUp = isGameJoin
        ? (gameJoinStates?.some((state) => state.state === "finishing") ?? false)
        : currentGameState?.state === "finishing"
    
    const downloadProgress = currentGameState?.progress;
    const extraNumberA = currentGameState?.extraNumberA;
    const extraNumberB = currentGameState?.extraNumberB;

    // Check if the game has been launching for more than 30 seconds
    // Use the key of the game being launched if it's a join
    const activeGameStateKey = useMemo(() => {
        if (isGameJoin && isLaunching && gameJoinStates) {
            const launchingState = gameJoinStates.find((state) => state.state === "launching")
            if (launchingState) {
                return `${launchingState.source}-${launchingState.gameId}`
            }
        }
        return gameStateKey
    }, [isGameJoin, isLaunching, gameJoinStates, gameStateKey])

    const launchStartTime = activeGameStateKey ? launchTimestamps[activeGameStateKey] : undefined
    const hasBeenLaunchingLong =
        isLaunching && (launchTimeExceeded || (launchStartTime && Date.now() - launchStartTime > 10000))

    // Effect to handle the launch time check
    useEffect(() => {
        let timeoutId: ReturnType<typeof setTimeout> | null = null

        if (isLaunching && launchStartTime && !launchTimeExceeded) {
            const timeToWait = Math.max(0, 10000 - (Date.now() - launchStartTime))
            timeoutId = setTimeout(() => {
                setLaunchTimeExceeded(true)
            }, timeToWait)
        } else if (!isLaunching && launchTimeExceeded) {
            setLaunchTimeExceeded(false)
        }

        return () => {
            if (timeoutId) {
                clearTimeout(timeoutId)
            }
        }
    }, [isLaunching, launchStartTime, launchTimeExceeded])

    // Effect to automatically stop launching after 3 minutes
    useEffect(() => {
        if (!isLaunching || !launchStartTime) return;
        const timeout = setTimeout(async () => {
            // Stop launching after 3 minutes (180000 ms)
            if (isGameJoin && gameJoinStates) {
                // For game joins, stop any launching processes
                const launchingGames = gameJoinStates.filter((state) => state.state === "launching");
                for (const game of launchingGames) {
                    setGameState(game.gameId, game.source, "stopping");
                    await window.Electron.stopGame(game.source, game.gameId);
                }
            } else if (currentGame) {
                // For single games
                const gameToStop = resolveDefaultGameVendor(currentGame);
                const gameId = typeof gameToStop.id === "object" ? JSON.stringify(gameToStop.id) : gameToStop.id;
                setGameState(gameId, gameToStop.source, "stopping");
                await window.Electron.stopGame(gameToStop.source, gameId);
            }
        }, 180000); // 3 minutes
        return () => clearTimeout(timeout);
    }, [isLaunching, launchStartTime, isGameJoin, gameJoinStates, currentGame, setGameState]);

    // Determine source from selected launch option
    const selectedOptionSource = useMemo(() => {
        if (!selectedLaunchOption || !currentGame) return ""

        const optionPath = selectedLaunchOption.executable.toLowerCase()
        if (optionPath.includes("steam")) return "steam"
        if (optionPath.includes("epic") || optionPath.includes("egs")) return "epic"
        if (optionPath.includes("itch")) return "itch"

        // Default to the game's default source if we can't determine
        return resolveDefaultGameVendor(currentGame).source || ""
    }, [selectedLaunchOption, currentGame])

    // Check if source launcher is running
    const needsLauncher: boolean = !!currentGame && ["steam", "epic"].includes(selectedOptionSource)
    const launcherState = needsLauncher ? gameStates[`${selectedOptionSource}-${"-1"}`] : undefined
    const isLauncherRunning = launcherState?.state === "running"

    const gameJoinsPopulated = gameJoins.map((join) => {
        return {
            ...join,
            id: `join-${join.id}`,
            clients: Object.fromEntries(
                Object.entries(join.clients).map(([key, value]) => {
                    return [key, games.find((game) => String(game.id) === String(value) && game.source === key)]
                }),
            ) as unknown as Record<NormalizedGame["source"], NormalizedGame>,
        } as unknown as NormalizedGameJoin
    })

    function transformGameJoinIntoUsableFormat(join: NormalizedGameJoin): NormalizedPseudoGameJoin {
        return {
            id: String(join.id),
            source: join.clients as unknown as Record<NormalizedGame["source"], NormalizedGame>,
            type: "GameJoin",
            defaultClient: join.defaultClient,
            preferences: join.preferences,
        }
    }

    function resolveDefaultGameVendor(game: NormalizedGame | NormalizedPseudoGameJoin): NormalizedGame {
        if (((game): game is NormalizedPseudoGameJoin => game?.type === "GameJoin")(game)) {
            return game.source[game.defaultClient]
        }
        return game
    }

    const resolveAllGameVendors = useCallback((game: NormalizedGame | NormalizedPseudoGameJoin): NormalizedGame => {
        if (((game): game is NormalizedPseudoGameJoin => game?.type === "GameJoin")(game)) {
            const sourceKeys = Object.keys(game.source)
            const sourceString = sourceKeys.join(",") as unknown as NormalizedGame["source"]
            const defaultClient = game.source[game.defaultClient]

            return {
                id:
                    typeof game.id === "string"
                        ? game.id
                        : JSON.stringify(Object.fromEntries(Object.entries(game.source).map(([key, value]) => [key, value.id]))),
                source: sourceString,
                name: JSON.stringify(defaultClient.name),
                type: defaultClient.type,
                installPath: JSON.stringify(
                    Object.fromEntries(Object.entries(game.source).map(([key, val]) => [key, val.installPath])),
                ),
                launchOptions: Object.entries(game.source)
                    .flatMap(([,val]) => val.launchOptions)
                    .filter(Boolean) as LaunchOption[],
            }
        }
        return game
    }, [])

    useEffect(() => {
        // Reset states only when ID changes
        setLogoError(false)
        setLogoLoaded(false)
        setBannerError(false)
        setBannerLoaded(false)
        setBannerBlurReady(false)
        setShowAllDLCs(false)

        // Rest of the effect remains unchanged
        if (
            id &&
            [
                ...games.filter(
                    (game) =>
                        !gameJoinsPopulated.some(
                            (join) => (join?.clients?.[game.source as keyof typeof join.clients] as NormalizedGame)?.id === game.id,
                        ),
                ),
                ...gameJoinsPopulated.map(transformGameJoinIntoUsableFormat),
            ].length > 0
        ) {
            const game = [
                ...games.filter(
                    (game) =>
                        !gameJoinsPopulated.some(
                            (join) => (join?.clients?.[game.source as keyof typeof join.clients] as NormalizedGame)?.id === game.id,
                        ),
                ),
                ...gameJoinsPopulated.map(transformGameJoinIntoUsableFormat),
            ].find(
                (g) => (`${g.source}-${g.id}` === id && g.type !== "GameJoin") || (g.id === id && g.type === "GameJoin"),
            ) as NormalizedGame | NormalizedPseudoGameJoin
            const logo = resolveDefaultGameVendor(game)?.media?.logoUrl,
                hero = resolveDefaultGameVendor(game)?.media?.heroUrl
            if (game) {
                if (game.source === "steam") {
                    if (game.media) {
                        if (logo) {
                            try {
                                if (typeof logo === "string") {
                                    game.media.logoUrl = JSON.parse(logo) as Record<string, Record<string, string>>
                                }
                            } catch {
                                game.media.logoUrl = (logo as string).replaceAll("%USERDATA%", "CONST_USERDATA")
                            }
                        }
                        if (hero) {
                            try {
                                if (typeof hero === "string") {
                                    game.media.heroUrl = JSON.parse(hero) as Record<string, Record<string, string>>
                                }
                            } catch {
                                game.media.heroUrl = (hero as string).replaceAll("%USERDATA%", "CONST_USERDATA")
                            }
                        }
                    }
                }
                setCurrentGame(game)
            }
        }
    }, [id])

    // Add a separate effect to update the current game when games array changes
    useEffect(() => {
        if (
            id &&
            [
                ...games.filter(
                    (game) =>
                        !gameJoinsPopulated.some(
                            (join) => (join?.clients?.[game.source as keyof typeof join.clients] as NormalizedGame)?.id === game.id,
                        ),
                ),
                ...gameJoinsPopulated.map(transformGameJoinIntoUsableFormat),
            ].length > 0 &&
            currentGame
        ) {
            const updatedGame = [
                ...games.filter(
                    (game) =>
                        !gameJoinsPopulated.some(
                            (join) => (join?.clients?.[game.source as keyof typeof join.clients] as NormalizedGame)?.id === game.id,
                        ),
                ),
                ...gameJoinsPopulated.map(transformGameJoinIntoUsableFormat),
            ].find((g) => `${g.source}-${g.id}` === id)
            if (updatedGame && JSON.stringify(updatedGame) !== JSON.stringify(currentGame)) {
                // Process the game data same as in the original effect
                const logo = resolveDefaultGameVendor(updatedGame)?.media?.logoUrl,
                    hero = resolveDefaultGameVendor(updatedGame)?.media?.heroUrl
                if (updatedGame.source === "steam") {
                    if (updatedGame.media) {
                        if (logo) {
                            try {
                                if (typeof logo === "string") {
                                    updatedGame.media.logoUrl = JSON.parse(logo) as Record<string, Record<string, string>>
                                }
                            } catch {
                                updatedGame.media.logoUrl = (logo as string).replaceAll("%USERDATA%", "CONST_USERDATA")
                            }
                        }
                        if (hero) {
                            try {
                                if (typeof hero === "string") {
                                    updatedGame.media.heroUrl = JSON.parse(hero) as Record<string, Record<string, string>>
                                }
                            } catch {
                                updatedGame.media.heroUrl = (hero as string).replaceAll("%USERDATA%", "CONST_USERDATA")
                            }
                        }
                    }
                }
                setCurrentGame(updatedGame)
            }
        }
    }, [games, gameJoins, id, currentGame])

    // When the game changes, set the initial launch option
    useEffect(() => {
        if (currentGame) {
            const options = resolveAllGameVendors(currentGame)?.launchOptions
            if (options && options.length > 0) {
                setSelectedLaunchOption(options[0])
            } else {
                setSelectedLaunchOption(null)
            }
        }
    }, [currentGame])

    // Effect to close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (launchButtonRef.current && !launchButtonRef.current.contains(event.target as Node)) {
                setShowLaunchOptions(false)
            }
        }

        document.addEventListener("mousedown", handleClickOutside)
        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [])

    const launchGame = useCallback(async (game: NormalizedGame, option?: LaunchOption) => {
        if (!game.launchOptions || game.launchOptions.length === 0) return

        const launchOption = option || selectedLaunchOption || game.launchOptions[0]

        // Determine the actual source to use for this launch option
        let launchSource = game.source
        let launchId = game.id

        if (isGameJoin) {
            // For game joins, determine the source based on the launch option
            const optionPath = launchOption.executable.toLowerCase()

            // Try to find the matching source
            if (optionPath.includes("steam")) {
                launchSource = "steam"
            } else if (optionPath.includes("epic") || optionPath.includes("egs")) {
                launchSource = "epic"
            } else if (optionPath.includes("itch")) {
                launchSource = "itch"
            }

            // Get the actual game ID from the join for this source
            const joinGame = currentGame as NormalizedPseudoGameJoin
            if (joinGame.source[launchSource as keyof typeof joinGame.source]) {
                launchId = joinGame.source[launchSource as keyof typeof joinGame.source].id
            }
        }

        // Set the state for the specific source/id being launched
        const gameId = typeof launchId === "object" ? JSON.stringify(launchId) : launchId
        setGameState(gameId, launchSource as string, "launching")

        try {
            console.log(`Launching ${game.name} with option: ${launchOption.name}`)
            console.log(`Executable: ${launchOption.executable}`)
            console.log(
                `Arguments: ${Array.isArray(launchOption.arguments) ? launchOption.arguments.join(" ") : launchOption.arguments}`,
            )

            if (launchSource && typeof launchSource === "string") {
                const result = await window.Electron.launchGame(
                    launchSource,
                    gameId,
                    launchOption.executable,
                    launchOption.arguments,
                )

                if (!result.success) {
                    console.error("Failed to launch game:", result.error)
                    setGameState(gameId, launchSource, "idle")
                } else {
                    setGameState(gameId, launchSource, "running")
                }
            }
        } catch (error) {
            console.error("Failed to launch game:", error)
            setGameState(gameId, launchSource as string, "idle")
        }
    }, [currentGame, selectedLaunchOption, games, isGameJoin, setGameState]);

    const launchSourceLauncher = async (source: string) => {
        try {
            console.log(`Launching ${source} launcher`)
            // Find the launcher game from the games array
            const launcher = games.find((game) => game.source === source && String(game.id) === "-1")

            if (!launcher || !launcher.launchOptions || launcher.launchOptions.length === 0) {
                console.error(`No launch options found for ${source} launcher`)
                return
            }

            const launchOption = launcher.launchOptions[0]
            setGameState("-1", source, "launching")

            const result = await window.Electron.launchGame(source, "-1", launchOption.executable, launchOption.arguments)

            if (!result.success) {
                console.error(`Failed to launch ${source} launcher:`, result.error)
                setGameState("-1", source, "idle")
            } else {
                setGameState("-1", source, "running")
            }
        } catch (error) {
            console.error(`Failed to launch ${source} launcher:`, error)
            setGameState("-1", source, "idle")
        }
    }

    const resolvedVendors = useMemo(() => {
        if (!currentGame) return null
        return resolveAllGameVendors(currentGame)
    }, [currentGame, resolveAllGameVendors])

    // Function to manually check game status
    const checkGameStatus = async () => {
        if (!currentGame) return

        setIsCheckingStatus(true)
        try {
            if (isGameJoin) {
                // For game joins, check all sources
                const joinGame = currentGame as NormalizedPseudoGameJoin
                const gamesToCheck = Object.entries(joinGame.source).map(([source, game]) => {
                    const gameId = typeof game.id === "object" ? JSON.stringify(game.id) : game.id
                    return { source, id: gameId }
                })

                const runningStates = await window.Electron.checkRunningGames(gamesToCheck)

                // Update state for any running games
                gamesToCheck.forEach(({ source, id }) => {
                    const isRunning = runningStates[`${source}|${id}`]
                    if (isRunning) {
                        setGameState(id, source, "running")
                    }
                })
            } else {
                // Handle single game as before
                const gameToCheck = resolveDefaultGameVendor(currentGame)
                const gameId = typeof gameToCheck.id === "object" ? JSON.stringify(gameToCheck.id) : gameToCheck.id
                const runningStates = await window.Electron.checkRunningGames([{ source: gameToCheck.source, id: gameId }])

                console.log(runningStates);

                const isRunning = runningStates[`${gameToCheck.source}|${gameId}`]
                if (isRunning) {
                    setGameState(gameId, gameToCheck.source, "running")
                }
            }
            // Only update state if game is running, otherwise keep in launching state
        } catch (error) {
            console.error("Failed to check game status:", error)
        } finally {
            setIsCheckingStatus(false)
        }
    }

    // Add this function near other utility functions
    const isGameInFavorites = useCallback(() => {
        if (!currentGame) return false
        const gameId = typeof currentGame.id === "object" ? JSON.stringify(currentGame.id) : currentGame.id
        const gameSource = typeof currentGame.source === "object" ? "join" : currentGame.source
        return favourites.some((fav) => fav.id === gameId && fav.source === gameSource)
    }, [currentGame, favourites])

    const toggleFavorite = useCallback(() => {
        if (!currentGame) return
        const gameId = typeof currentGame.id === "object" ? JSON.stringify(currentGame.id) : currentGame.id
        const gameSource = typeof currentGame.source === "object" ? "join" : currentGame.source

        if (isGameInFavorites()) {
            // Remove from favorites
            setFavourites((prev) => prev.filter((fav) => !(fav.id === gameId && fav.source === gameSource)))
        } else {
            // Add to favorites
            setFavourites((prev) => [...prev, { id: gameId, source: gameSource }])
        }
    }, [currentGame, favourites])

    // Add these functions near other utility functions
    const isGameInCollection = useCallback(
        (collectionId: string) => {
            if (!currentGame) return false
            const gameId = typeof currentGame.id === "object" ? JSON.stringify(currentGame.id) : currentGame.id
            const gameSource = typeof currentGame.source === "object" ? "join" : currentGame.source
            const collection = collections.find((c) => c.id === collectionId)
            return collection?.games.some((g) => g.id === gameId && g.source === gameSource) || false
        },
        [currentGame, collections],
    )

    const toggleGameInCollection = (collectionId: string) => {
        if (!currentGame) return
        const gameId = typeof currentGame.id === "object" ? JSON.stringify(currentGame.id) : currentGame.id
        const gameSource = typeof currentGame.source === "object" ? "join" : currentGame.source

        setCollections((prev) => {
            return prev.map((collection) => {
                if (collection.id === collectionId) {
                    if (isGameInCollection(collectionId)) {
                        // Remove from collection
                        return {
                            ...collection,
                            games: collection.games.filter((g) => !(g.id === gameId && g.source === gameSource)),
                        }
                    } else {
                        // Add to collection
                        return {
                            ...collection,
                            games: [...collection.games, { id: gameId, source: gameSource }],
                        }
                    }
                }
                return collection
            })
        })
    }

    // Handle saving a new collection
    const handleSaveNewCollection = () => {
        if (!currentGame) return
        const gameId = typeof currentGame.id === "object" ? JSON.stringify(currentGame.id) : currentGame.id
        const gameSource = typeof currentGame.source === "object" ? "join" : currentGame.source

        if (!currentGame || newCollectionName.trim() === "") {
            setIsCreatingCollection(false)
            return
        } else if (newCollectionName.trim() === "Favourites") {
            setIsCreatingCollection(false)
            setFavourites((prev) => [...prev, { id: gameId, source: gameSource }])
            setNewCollectionName("")
            setShowCollectionMenu(false)
            return
        }

        const newCollection: Collection = {
            id: Date.now().toString(),
            name: newCollectionName.trim(),
            games: [{ id: gameId, source: gameSource }],
        }

        setCollections((prev) => {
            if (!Array.isArray(prev)) {
                return [newCollection]
            }
            return [...prev, newCollection]
        })

        setNewCollectionName("")
        setIsCreatingCollection(false)
        setShowCollectionMenu(false)
    }

    // Handle canceling new collection creation
    const handleCancelNewCollection = () => {
        setNewCollectionName("")
        setIsCreatingCollection(false)
        setShowCollectionMenu(false)
    }

    // Handle key press in the collection name input
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault()
            if (newCollectionName.trim()) {
                handleSaveNewCollection()
            }
        } else if (e.key === "Escape") {
            e.preventDefault()
            handleCancelNewCollection()
        }
    }

    // Focus input when creating a collection
    useEffect(() => {
        if (isCreatingCollection && newCollectionInputRef.current) {
            newCollectionInputRef.current.focus()
        }
    }, [isCreatingCollection])

    const getCollectionsItems = (): MenuItemType[] => {
        // Create menu items for each collection
        const collectionItems: MenuItemType[] =
            Array.isArray(collections) && collections.length > 0
                ? collections.map((collection) => ({
                    id: `collection-${collection.id}`,
                    icon: isGameInCollection(collection.id) ? "check" : " ",
                    label: collection.name,
                    onClick: () => toggleGameInCollection(collection.id),
                }))
                : [
                    {
                        id: "no-collections",
                        label: t("library.shared.noCollections"),
                        className: "px-4 py-2 text-white/50 italic cursor-default",
                        disabled: true,
                    },
                ]

        // Custom component for new collection creation form
        const createNewCollectionItem = isCreatingCollection
            ? {
                id: "new-collection-form",
                type: "custom" as const,
                content: (
                    <div className="flex flex-col gap-2 py-1 px-2">
                        <form
                            onSubmit={(e) => {
                                e.preventDefault()
                                if (newCollectionName.trim()) {
                                    handleSaveNewCollection()
                                }
                            }}
                        >
                            <input
                                ref={newCollectionInputRef}
                                type="text"
                                value={newCollectionName}
                                onChange={(e) => setNewCollectionName(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={t("library.shared.collectionNamePlaceholder")}
                                className="w-[calc(100%-1.5rem)] bg-white/10 px-3 py-1.5 outline-none rounded ring-0"
                                maxLength={32}
                                autoFocus
                            />
                            <div className="flex flex-row flex-wrap gap-2 mt-2 w-full">
                                <button
                                    onClick={handleSaveNewCollection}
                                    disabled={!newCollectionName.trim()}
                                    className={`w-full flex-1 flex-grow px-3 py-1.5 rounded text-sm transition-colors flex items-center justify-center gap-2 ${newCollectionName.trim()
                                        ? "bg-progress/80 hover:bg-progress"
                                        : "bg-white/10 opacity-50 cursor-not-allowed"
                                    }`}
                                    type="submit"
                                >
                                    <span className="material-symbols text-base">check</span>
                                    {t("library.shared.createCollectionConfirm")}
                                </button>
                                <button
                                    onClick={handleCancelNewCollection}
                                    className="w-full flex-1 flex-grow px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-sm transition-colors flex items-center justify-center gap-2"
                                    type="button"
                                >
                                    <span className="material-symbols text-base">close</span>
                                    {t("library.shared.createCollectionCancel")}
                                </button>
                            </div>
                        </form>
                    </div>
                ),
            }
            : {
                id: "create-collection",
                icon: "add",
                label: t("library.shared.createCollection"),
                onClick: () => setIsCreatingCollection(true),
                keepOpen: true,
            }

        // Add the divider and "Create New Collection" option
        return [
            ...collectionItems,
            { id: "collections-divider", type: "divider" },
            createNewCollectionItem,
        ] as MenuItemType[]
    }

    // Add fetchWarnings function
    const fetchWarnings = useCallback(async (game: NormalizedGame | NormalizedPseudoGameJoin) => {
        if (!game) return

        setIsLoadingWarnings(true)
        setWarningsError(null)

        try {
            const gameId = typeof game.id === "object" ? JSON.stringify(game.id) : game.id
            const gameSource = typeof game.source === "object" ? "join" : game.source

            const response = await window.Electron.fetchGameWarnings(gameSource, gameId)
            console.log(response)
            if (response.success) {
                setWarnings(response.data)
            } else {
                setWarningsError("Failed to fetch game warnings")
            }
        } catch (error) {
            console.error("Failed to fetch game warnings:", error)
            setWarningsError("Failed to fetch game warnings")
        } finally {
            setIsLoadingWarnings(false)
        }
    }, [])

    // Add effect to fetch warnings when game changes
    useEffect(() => {
        if (currentGame) {
            fetchWarnings(currentGame)
        }
    }, [currentGame, fetchWarnings])

    // Memoized asset URLs
    const { url: logoUrl, logoObj } = useMemo(() =>
        currentGame
            ? getLogoUrlFromData(
                resolveDefaultGameVendor(currentGame),
                customAssets,
                curatedAssets,
                getLocalizedGameSuffix()
            )
            : { url: null, logoObj: null },
    [currentGame, customAssets, curatedAssets]
    );

    const heroUrl = useMemo(() =>
        currentGame
            ? getHeroUrlFromData(
                resolveDefaultGameVendor(currentGame),
                customAssets,
                curatedAssets,
                getLocalizedGameSuffix()
            )
            : null,
    [currentGame, customAssets, curatedAssets]
    );

    // Effect to handle initial error states when no assets are found
    useEffect(() => {
        if (currentGame) {
            if (!logoUrl) {
                setLogoError(true);
                setLogoLoaded(false);
            }
            if (!heroUrl) {
                setBannerError(true);
                setBannerLoaded(false);
            }
        }
    }, [currentGame, logoUrl, heroUrl]);

    const handleInstall = useCallback(async (installPath: string) => {
        if (!currentGame) return;

        try {
            const gameId = typeof currentGame.id === "object" ? JSON.stringify(currentGame.id) : currentGame.id;
            const result = await window.Electron.installGame(gameId, installPath, resolveDefaultGameVendor(currentGame).updateAvailable === "reinstall");

            if (!result.success) {
                console.error("Failed to install game:", result.error);
                // You might want to show an error message to the user here
            } else {
                console.log(result)
                openInstallModal(resolveDefaultGameVendor(currentGame))
            }
        } catch (error) {
            console.error("Failed to install game:", error);
            // You might want to show an error message to the user here
        }
    }, [currentGame, openInstallModal]);

    // Fetch metrics when currentGame changes
    useEffect(() => {
        if (!currentGame) return;
        const game = resolveDefaultGameVendor(currentGame);
        window.Electron.getGameMetrics(game.source, typeof game.id === 'object' ? JSON.stringify(game.id) : game.id)
            .then(setMetrics)
            .catch(() => setMetrics({ lastPlayed: 0, totalPlayedFor: 0 }));
    }, [currentGame, currentGameState?.state]);

    if (!currentGame) {
        return (
            <div className="flex items-center justify-center h-full w-full">
                <p className="text-4xl dark:text-gray-200 text-gray-800 font-uniSansCAPS font-bold">{t("library.gameView.loading")}</p>
            </div>
        )
    }

    console.log(currentGame, currentGameState, gameStateKey)

    return (
        <div className="h-full w-full overflow-y-auto flex-1 scrollbar-gutter-stable">
            {/* Banner section with logo or title */}
            <div
                className="relative w-full h-80 border-0 border-b border-notQuiteBlack/10 dark:border-notQuiteWhite/10 border-solid"
                style={{ display: isReady ? "block" : "none" }}
            >
                {currentGame && (
                    <BannerContent
                        game={resolveDefaultGameVendor(currentGame)}
                        heroUrl={heroUrl}
                        bannerLoaded={bannerLoaded}
                        bannerBlurReady={bannerBlurReady}
                        onBlurLoad={() => setBannerBlurReady(true)}
                        onLoad={() => setBannerLoaded(true)}
                        onError={() => setBannerError(true)}
                    />
                )}

                {/* Logo or title */}
                <div className="absolute bottom-4 left-5 flex items-end w-[calc(100%-2.5rem)] h-[calc(100%-2rem)]">
                    {currentGame && (
                        <GameLogo
                            game={resolveDefaultGameVendor(currentGame)}
                            logoUrl={logoUrl}
                            logoObj={logoObj}
                            onLoad={() => setLogoLoaded(true)}
                            onError={() => setLogoError(true)}
                            curatedAssets={curatedAssets}
                            customAssets={customAssets}
                        />
                    )}
                </div>

                {/* Source icons in top right */}
                <div className="absolute top-4 right-4 flex items-center gap-x-2 z-10">
                    {(resolvedVendors?.source.split(",") as NormalizedGame["source"][]).map((source) => (
                        <Tooltip content={getLauncherName(source)} position="bottom" key={source}>
                            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/40 dark:bg-black/40 backdrop-blur-sm hover:bg-white/60 dark:hover:bg-black/60 transition-colors">
                                <GetSourceIcon source={source} keyProp={null} size={20} />
                            </div>
                        </Tooltip>
                    ))}
                </div>
            </div>

            {/* Game details section */}
            <div style={{ display: isReady ? "block" : "none" }}>
                {/* User Actions */}
                <div className="p-4 h-14 flex flex-row gap-x-4 items-center justify-between bg-notQuiteWhite/50 dark:bg-notQuiteBlack/50 border-0 border-b border-notQuiteBlack/10 dark:border-notQuiteWhite/10 border-solid">
                    <div className="flex flex-row gap-x-4">
                        {/* Launch button with dropdown replacing title */}
                        <div className="flex flex-col gap-y-3 z-10">
                            <div className="flex flex-col relative">
                                <div className="flex flex-col items-center gap-x-3 relative" ref={launchButtonRef}>
                                    <button
                                        onClick={async () => {
                                            const gameId = typeof currentGame.id === "object" ? JSON.stringify(currentGame.id) : currentGame.id
                                            if (
                                                (String(gameId) === "-1" && !(isRunning || isStopping || isLaunching)) ||
                                                (needsLauncher && !isLauncherRunning)
                                            ) {
                                                // Launch the source launcher based on selected option
                                                await launchSourceLauncher(selectedOptionSource)
                                            } else if (isRunning) {
                                                // Stop the game
                                                if (isGameJoin) {
                                                    // For game joins, stop any running processes
                                                    const runningGames = gameJoinStates?.filter((state) => state.state === "running")

                                                    if (runningGames && runningGames.length > 0) {
                                                        // Set all running games to stopping state
                                                        for (const game of runningGames) {
                                                            setGameState(game.gameId, game.source, "stopping")
                                                            await window.Electron.stopGame(game.source, game.gameId)
                                                        }
                                                    }
                                                } else {
                                                    // Normal game stop
                                                    const gameToStop = resolveDefaultGameVendor(currentGame)
                                                    const gameId = typeof gameToStop.id === "object" ? JSON.stringify(gameToStop.id) : gameToStop.id
                                                    setGameState(gameId, gameToStop.source, "stopping")
                                                    const result = await window.Electron.stopGame(gameToStop.source, gameId)
                                                    if (!result.success) {
                                                        console.error("Failed to stop game:", result.error)
                                                    }
                                                }
                                            } else if (resolveDefaultGameVendor(currentGame).source === "deadforge" && (!resolveDefaultGameVendor(currentGame).installPath || resolveDefaultGameVendor(currentGame).updateAvailable === "reinstall")) {
                                                // Show install modal for DeadForge games that aren't installed
                                                openInstallModal(resolveDefaultGameVendor(currentGame))
                                            } else if (resolveDefaultGameVendor(currentGame).updateAvailable === "update") {
                                                window.Electron.updateGame(resolveDefaultGameVendor(currentGame).id)
                                            } else {
                                            // Launch the game with selected option
                                                launchGame(resolveDefaultGameVendor(currentGame))
                                            }
                                        }}
                                        disabled={
                                            (!resolveDefaultGameVendor(currentGame)?.launchOptions && currentGame.source !== "deadforge") ||
                                            (resolveDefaultGameVendor(currentGame)?.launchOptions?.length === 0 && currentGame.source !== "deadforge") ||
                                            isLaunching ||
                                            isStopping ||
                                            isPreparing ||
                                            isDownloading ||
                                            isDownloadingPatch ||
                                            isInstalling ||
                                            isApplyingPatch ||
                                            isFinishingUp
                                        }
                                        className={cn(
                                            "font-bold h-14 rounded-md flex items-center transition-all duration-200 justify-between group w-72",
                                            (isLaunching || isRunning || isStopping) && "bg-progress text-white hover:bg-progress/80",
                                            (isLaunching || isStopping || isChecking) && "cursor-not-allowed",
                                            String(currentGame?.id) === "-1" && "bg-blue-600 hover:bg-blue-700 text-white shadow-lg",
                                            !isLaunching &&
                                        !isRunning &&
                                        !isStopping &&
                                        !isChecking &&
                                        (resolveDefaultGameVendor(currentGame).updateAvailable === "update" || isPreparing || isDownloading || isInstalling || isFinishingUp) &&
                                        "bg-progress text-white hover:bg-progress/80",
                                            !isLaunching &&
                                        !isRunning &&
                                        !isStopping &&
                                        !isChecking &&
                                        !isPreparing &&
                                        !isDownloading &&
                                        !isDownloadingPatch &&
                                        !isInstalling &&
                                        !isApplyingPatch &&
                                        !isFinishingUp &&
                                        resolveDefaultGameVendor(currentGame).updateAvailable === "reinstall" &&
                                        "bg-danger text-white hover:bg-red-700",
                                            !isLaunching &&
                                        !isRunning &&
                                        !isStopping &&
                                        !isChecking &&
                                        !needsLauncher &&
                                        !resolveDefaultGameVendor(currentGame).updateAvailable &&
                                        String(currentGame?.id) !== "-1" &&
                                        resolveDefaultGameVendor(currentGame).source === "deadforge" &&
                                        !resolveDefaultGameVendor(currentGame).installPath &&
                                        "bg-blue-600 hover:bg-blue-700 text-white shadow-lg",
                                            !isLaunching &&
                                        !isRunning &&
                                        !isStopping &&
                                        !isChecking &&
                                        !needsLauncher &&
                                        !resolveDefaultGameVendor(currentGame).updateAvailable &&
                                        String(currentGame?.id) !== "-1" &&
                                        !(resolveDefaultGameVendor(currentGame).source === "deadforge" && !resolveDefaultGameVendor(currentGame).installPath) &&
                                        "bg-green-600 hover:bg-green-700 text-white shadow-lg",
                                            !isLaunching &&
                                        !isRunning &&
                                        !isStopping &&
                                        !isChecking &&
                                        needsLauncher &&
                                        isLauncherRunning &&
                                        !resolveDefaultGameVendor(currentGame).updateAvailable &&
                                        "bg-green-600 hover:bg-green-700 text-white shadow-lg",
                                            !isLaunching &&
                                        !isRunning &&
                                        !isStopping &&
                                        !isChecking &&
                                        needsLauncher &&
                                        !isLauncherRunning &&
                                        !resolveDefaultGameVendor(currentGame).updateAvailable &&
                                            "bg-blue-600 hover:bg-blue-700 text-white shadow-lg",
                                        isChecking &&
                                            "bg-neutral-600 hover:bg-neutral-700 text-neutral-100 shadow-lg",
                                            
                                            "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                "flex items-center justify-center flex-col space-x-2 h-full w-full",
                                                (resolveAllGameVendors(currentGame)?.launchOptions as LaunchOption[])?.length > 1 &&
                                            !isRunning &&
                                            !isStopping &&
                                            !isLaunching &&
                                            !isChecking &&
                                            "border-0 border-r-2 pr-2 border-white/20 border-solid",
                                            )}
                                        >
                                            {!(isRunning || isStopping || isLaunching || isChecking) &&
                                            ((needsLauncher && !isLauncherRunning) || String(currentGame?.id) === "-1") ? (
                                                    <div className="flex items-center flex-row space-x-2">
                                                        <GetSourceIcon source={selectedOptionSource} keyProp={null} size={20} />
                                                        <span>
                                                            {t("library.shared.gameState.launchLauncher", { launcher: getLauncherName(selectedOptionSource) })}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center flex-row gap-x-1 -mt-1">
                                                        <span
                                                            className={cn(
                                                                "material-symbols text-2xl transition-transform",
                                                                (isLaunching || isStopping) && "animate-hourglass",
                                                            )}
                                                        >
                                                            {isLaunching
                                                                ? "hourglass_top"
                                                                : isRunning
                                                                    ? "stop_circle"
                                                                    : isStopping
                                                                        ? "hourglass_bottom"
                                                                        : isChecking
                                                                            ? "hourglass_top"
                                                                            : isPreparing
                                                                                ? "settings"
                                                                                : (isDownloading || isDownloadingPatch)
                                                                                    ? "downloading"
                                                                                    : isInstalling
                                                                                        ? "install_desktop"
                                                                                        : isApplyingPatch ?
                                                                                            "healing"
                                                                                            : isFinishingUp
                                                                                                ? "sports_score"
                                                                                                : resolveDefaultGameVendor(currentGame).updateAvailable === "update"
                                                                                                    ? "upgrade"
                                                                                                : resolveDefaultGameVendor(currentGame).updateAvailable === "reinstall"
                                                                                                    ? "restart_alt"
                                                                                                : resolveDefaultGameVendor(currentGame).source === "deadforge" && !resolveDefaultGameVendor(currentGame).installPath
                                                                                                    ? "download"
                                                                                                    : ["Tool", "Application", "Launcher"].includes(currentGame?.type || "")
                                                                                                        ? "launch"
                                                                                                        : "play_circle"}
                                                        </span>
                                                        <span>
                                                            {isLaunching
                                                                ? t("library.shared.gameState.launching")
                                                                : isRunning
                                                                    ? t("library.shared.gameState.stop")
                                                                    : isStopping
                                                                        ? t("library.shared.gameState.stopping")
                                                                        : isChecking
                                                                            ? t("library.shared.gameState.checking")
                                                                            : isPreparing
                                                                                ? t("library.shared.gameState.preparing")
                                                                                : (isDownloading || isDownloadingPatch)
                                                                                    ? t("library.shared.gameState.downloading")
                                                                                    : isInstalling
                                                                                        ? t("library.shared.gameState.installing")
                                                                                        : isApplyingPatch
                                                                                            ? t("library.update.applying")
                                                                                            : isFinishingUp
                                                                                                ? t("library.shared.gameState.finishingUp")
                                                                                                : resolveDefaultGameVendor(currentGame).updateAvailable === "update"
                                                                                                    ? t("library.shared.gameState.update")
                                                                                                : resolveDefaultGameVendor(currentGame).updateAvailable === "reinstall"
                                                                                                    ? t("library.shared.gameState.reinstall")
                                                                                                : resolveDefaultGameVendor(currentGame).source === "deadforge" && !resolveDefaultGameVendor(currentGame).installPath
                                                                                                    ? t("library.shared.gameState.install")
                                                                                                    : ["Tool", "Application", "Launcher"].includes(currentGame?.type || "")
                                                                                                        ? t("library.shared.gameState.launch")
                                                                                                        : t("library.shared.gameState.play")}
                                                        </span>
                                                    </div>
                                                )}

                                            {/* Show currently selected option if any */}
                                            {selectedLaunchOption &&
                                            (resolveAllGameVendors(currentGame)?.launchOptions as LaunchOption[])?.length > 1 &&
                                            !isRunning &&
                                            !isLaunching &&
                                            !isStopping &&
                                            !isPreparing &&
                                            !isDownloading &&
                                            !isDownloadingPatch &&
                                            !isInstalling &&
                                            !isApplyingPatch &&
                                            !isFinishingUp && (
                                                <span className="text-xs opacity-0 flex flex-row items-center gap-x-1 -mt-4 group-hover:opacity-70 group-hover:mt-0 transition-[opacity,margin-top] duration-200">
                                                    <GetSourceIcon source={selectedLaunchOption.executable.toLowerCase().includes("steam")
                                                        ? "steam"
                                                        : selectedLaunchOption.executable.toLowerCase().includes("epic")
                                                            ? "epic"
                                                            : selectedLaunchOption.executable.toLowerCase().includes("itch")
                                                                ? "itch"
                                                                : resolveDefaultGameVendor(currentGame).source}
                                                    keyProp={null}
                                                    size={12}
                                                    />
                                                    {selectedLaunchOption.name}
                                                </span>
                                            )}
                                            {/* If downloading or installing, show progress percentage or description */}
                                            <span 
                                                className="text-xs opacity-0 flex flex-row items-center gap-x-1 -mt-4 data-[active=true]:opacity-70 data-[active=true]:mt-0 data-[active=false]:absolute transition-[opacity,margin-top] duration-200" 
                                                data-active={(isPreparing || isDownloading || isDownloadingPatch || isInstalling || isApplyingPatch || isFinishingUp) && downloadProgress !== undefined}
                                            >
                                                {downloadProgress !== undefined ? (typeof downloadProgress === "number" ? `${downloadProgress}%` : t(downloadProgress, { A: extraNumberA, B: extraNumberB })) : ""}
                                            </span>
                                        </div>

                                        {/* Dropdown button integrated */}
                                        {resolveAllGameVendors(currentGame)?.launchOptions &&
                                        (resolveAllGameVendors(currentGame)?.launchOptions as LaunchOption[])?.length > 1 &&
                                        !isLaunching &&
                                        !isRunning &&
                                        !isStopping && (
                                            <>
                                                <div className="h-2/3 w-0 absolute bg-white/30 mx-1"></div>
                                                <div
                                                    className="px-1 h-full flex items-center border-l border-white/20"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setShowLaunchOptions(!showLaunchOptions)
                                                    }}
                                                >
                                                    <span className="material-symbols">expand_more</span>
                                                </div>
                                            </>
                                        )}
                                    </button>

                                    {/* Launch options dropdown */}
                                    {resolveAllGameVendors(currentGame)?.launchOptions &&
                                    (resolveAllGameVendors(currentGame)?.launchOptions as LaunchOption[])?.length > 1 && (
                                        <div
                                            className={cn(
                                                "overflow-hidden absolute top-14 mt-2 w-72 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 focus:outline-none z-10 transition-all duration-200",
                                                showLaunchOptions
                                                    ? "opacity-100 translate-y-0"
                                                    : "opacity-0 -translate-y-2 pointer-events-none",
                                            )}
                                        >
                                            <div className="max-h-fit overflow-hidden">
                                                {resolveAllGameVendors(currentGame)?.launchOptions?.map((option, index) => {
                                                // Determine which source this option is from
                                                // We can check if the executable contains certain patterns
                                                    let source = ""
                                                    if (option.executable.toLowerCase().includes("steam")) {
                                                        source = "steam"
                                                    } else if (
                                                        option.executable.toLowerCase().includes("epic") ||
                                                        option.executable.toLowerCase().includes("egs")
                                                    ) {
                                                        source = "epic"
                                                    } else if (option.executable.toLowerCase().includes("itch")) {
                                                        source = "itch"
                                                    } else {
                                                    // If we can't determine from executable, use the game's default source
                                                        source = resolveDefaultGameVendor(currentGame).source
                                                    }

                                                    return (
                                                        <div
                                                            key={index}
                                                            className={cn(
                                                                "block w-[calc(100%-1.5rem)] text-left px-3 py-2 text-sm dark:text-gray-200 text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer",
                                                                selectedLaunchOption?.name === option.name && "bg-gray-100 dark:bg-gray-700",
                                                            )}
                                                            onClick={() => {
                                                                setSelectedLaunchOption(option)
                                                                setShowLaunchOptions(false)
                                                            }}
                                                        >
                                                            <div className="font-medium truncate flex items-center gap-x-2">
                                                                {<GetSourceIcon source={source} />}
                                                                <span className="truncate">{option.name}</span>
                                                            </div>
                                                            <div className="text-xs dark:text-gray-400 text-gray-600 truncate w-full flex flex-col">
                                                                <span className="max-w-full w-full rtl inline-block truncate">
                                                                    <ResolvedPath executable={option.executable} />
                                                                </span>
                                                                <span className="w-full break-words">{option.arguments}</span>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-row items-center gap-x-2 absolute right-0 top-0 -mt-12">
                                    {/* Manual check button */}
                                    <Tooltip
                                        content={t("library.gameView.checkStatusDescription")}
                                        position="top"
                                        showDelay={200}
                                        containerClassName={cn(
                                            "-z-10 opacity-0 transition-[margin-top,opacity] duration-200 ease-in-out pointer-events-none",
                                            hasBeenLaunchingLong && "z-10 !opacity-100 pointer-events-auto",
                                        )}
                                    >
                                        <button
                                            onClick={checkGameStatus}
                                            disabled={isCheckingStatus || !hasBeenLaunchingLong}
                                            className={cn(
                                                "font-bold py-2 rounded-md flex items-center space-x-2 transition-all duration-300 w-60 h-6 text-sm",
                                                "bg-yellow-600/25 hover:bg-yellow-600 text-yellow-600 hover:text-white",
                                                "justify-center",
                                                "disabled:opacity-50 disabled:cursor-not-allowed",
                                                "opacity-0 pointer-events-none",
                                                hasBeenLaunchingLong && "!opacity-100 pointer-events-auto",
                                            )}
                                        >
                                            <span className={cn("material-symbols", isCheckingStatus && "animate-hourglass")}> 
                                                {isCheckingStatus ? "hourglass_top" : "refresh"}
                                            </span>
                                            <span>{t("library.gameView.checkStatus")}</span>
                                        </button>
                                    </Tooltip>
                                    {/* Manual stop button */}
                                    {isLaunching && (
                                    <Tooltip
                                        content={t("library.gameView.checkStatusDescription")}
                                        position="top"
                                        showDelay={200}
                                        containerClassName={cn(
                                            "-z-10 opacity-0 transition-[margin-top,opacity] duration-200 ease-in-out pointer-events-none",
                                            hasBeenLaunchingLong && "z-10 !opacity-100 pointer-events-auto",
                                        )}
                                    >
                                        <button
                                            onClick={async () => {
                                                if (isGameJoin && gameJoinStates) {
                                                    const launchingGames = gameJoinStates.filter((state) => state.state === "launching");
                                                    for (const game of launchingGames) {
                                                        setGameState(game.gameId, game.source, "stopping");
                                                        await window.Electron.stopGame(game.source, game.gameId);
                                                    }
                                                } else if (currentGame) {
                                                    const gameToStop = resolveDefaultGameVendor(currentGame);
                                                    const gameId = typeof gameToStop.id === "object" ? JSON.stringify(gameToStop.id) : gameToStop.id;
                                                    setGameState(gameId, gameToStop.source, "stopping");
                                                    await window.Electron.stopGame(gameToStop.source, gameId);
                                                }
                                            }}
                                            disabled={isCheckingStatus || !hasBeenLaunchingLong}
                                            className={cn(
                                                "font-bold p-2 rounded-md flex items-center space-x-2 transition-all duration-300 text-sm aspect-square",
                                                "bg-danger/25 hover:bg-danger text-white",
                                                "justify-center",
                                                "disabled:opacity-50 disabled:cursor-not-allowed",
                                                "opacity-0 pointer-events-none",
                                                hasBeenLaunchingLong && "!opacity-100 pointer-events-auto",
                                            )}
                                        >
                                            <span className="material-symbols">stop_circle</span>
                                            </button>
                                    </Tooltip>
                                    )}
                                </div>
                            </div>
                        </div>
                        {/* Game statistics bar styled like Steam */}
                        <div className="hidePlayTimeStats:hidden flex flex-row gap-x-6 items-center bg-gradient-to-b from-[#3b436f]/50 to-[#232853]/80 dark:from-[#232852]/50 dark:to-[#181c44]/80 rounded-md px-3 py-2 w-fit max-w-[420px] border border-solid border-black/10 dark:border-white/10 shadow-sm">
                            <div className="flex flex-col items-start">
                                <span className="uppercase text-xs font-semibold tracking-wider text-gray-100 dark:text-gray-400">{t('library.gameView.lastPlayed')}</span>
                                <span className="text-base font-medium text-white dark:text-white">
                                    {(() => {
                                        const lastPlayed = metrics.lastPlayed;
                                        if (!lastPlayed) return t('library.recentView.neverPlayed') || '-';
                                        const locale = dateFNSResources[i18n.language as keyof typeof dateFNSResources] || dateFNSResources['en_001'];
                                        const lastPlayedDate = new Date(lastPlayed * 1000);
                                        const now = new Date();
                                        if (lastPlayedDate.toDateString() === now.toDateString()) {
                                            return t('library.recentView.today');
                                        } else if (lastPlayedDate.getTime() < (now.getTime() - 28 * 24 * 60 * 60 * 100)) {
                                            return format(lastPlayedDate, 'P', {locale})
                                        }
                                        return formatDistanceToNowStrict(lastPlayedDate, { addSuffix: true, locale });
                                    })()}
                                </span>
                            </div>
                            {metrics.totalPlayedFor ? (
                                <div className="flex flex-col items-start">
                                    <span className="uppercase text-xs font-semibold tracking-wider text-gray-100 dark:text-gray-400">{t('library.gameView.playTime')}</span>
                                    <span className="text-base font-medium text-white dark:text-white">
                                        {(() => {
                                            const playTime = metrics.totalPlayedFor || 0;
                                            const locale = dateFNSResources[i18n.language as keyof typeof dateFNSResources] || dateFNSResources['en_001'];
                                            if (!playTime) return t("library.recentView.neverPlayed")
                                            else if (playTime < 60) return formatDistance(0, playTime * 1000, { locale, addSuffix: false })
                                            // Convert seconds to a duration object
                                            // Only show hours/minutes for brevity
                                            return formatDistanceStrict(0, (playTime) * 1000, { locale, addSuffix: false });
                                        })()}
                                    </span>
                                </div>
                            ) : <></>}
                        </div>
                    </div>
                    <div className="flex flex-row gap-x-2 p-2">
                        {/* DeadForge Store button */}
                        {resolveDefaultGameVendor(currentGame).source === "deadforge" && (
                            <Tooltip content={t("library.shared.openInStore")} position="top">
                                <button
                                    className={cn(
                                        "flex items-center justify-center size-10 rounded-lg bg-fullMoon/50 dark:bg-night/50 backdrop-blur-sm hover:bg-fullMoon/75 dark:hover:bg-night/75 border border-notQuiteBlack/10 hover:border-notQuiteBlack/20 dark:border-notQuiteWhite/10 hover:dark:border-notQuiteWhite/20 border-solid transition-colors duration-500 cursor-pointer",
                                        "aspect-square text-xl leading-none",
                                    )}
                                    onClick={() => navigate(`/store?path=${encodeURIComponent(`soft/${resolveDefaultGameVendor(currentGame).id}`)}`)}
                                    style={{ marginRight: 4 }}
                                >
                                    <span className="material-symbols">storefront</span>
                                </button>
                            </Tooltip>
                        )}
                        <Tooltip content={t("library.shared.collections")} position="top">
                            <label
                                className={cn(
                                    "flex items-center justify-center size-10 rounded-lg bg-fullMoon/50 dark:bg-night/50 backdrop-blur-sm hover:bg-fullMoon/75 dark:hover:bg-night/75 border border-notQuiteBlack/10 hover:border-notQuiteBlack/20 dark:border-notQuiteWhite/10 hover:dark:border-notQuiteWhite/20 border-solid transition-colors duration-500 cursor-pointer",
                                    "aspect-square text-xl leading-none",
                                )}
                                onClick={(e) => {
                                    console.log(showCollectionMenu)
                                    if (showCollectionMenu) {
                                        setShowCollectionMenu(false)
                                    } else {
                                        const rect = e.currentTarget.getBoundingClientRect()
                                        setCollectionMenuPosition({ x: rect.left, y: rect.bottom + 5 })
                                        setShowCollectionMenu(true)
                                    }
                                }}
                                ref={collectionsButtonRef}
                            >
                                <span
                                    className={cn(
                                        "material-symbols transition-[font-variation-settings] duration-200",
                                        showCollectionMenu && "ms-filled",
                                    )}
                                >
                                    folder
                                </span>
                            </label>
                        </Tooltip>
                        <Tooltip content={isGameInFavorites() ? t("library.shared.removeFavourite") : t("library.shared.addFavourite")} position="top">
                            <label
                                className={cn(
                                    "flex items-center justify-center size-10 rounded-lg bg-fullMoon/50 dark:bg-night/50 backdrop-blur-sm hover:bg-fullMoon/75 dark:hover:bg-night/75 border border-notQuiteBlack/10 hover:border-notQuiteBlack/20 dark:border-notQuiteWhite/10 hover:dark:border-notQuiteWhite/20 border-solid transition-colors cursor-pointer",
                                    "aspect-square text-xl leading-none dark:has-[#favorite-toggle:checked]:text-red-400 has-[#favorite-toggle:checked]:text-red-500 filled-when-checked",
                                )}
                            >
                                <span
                                    className={cn(
                                        "material-symbols transition-[font-variation-settings] duration-200",
                                        isGameInFavorites() && "ms-filled",
                                    )}
                                >
                                    favorite
                                </span>
                                <input
                                    type="checkbox"
                                    id="favorite-toggle"
                                    className="hidden"
                                    checked={isGameInFavorites()}
                                    onChange={toggleFavorite}
                                />
                            </label>
                        </Tooltip>
                    </div>
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-7 gap-y-8 xl:gap-x-8 p-10">
                    {/* Left column - Game info */}
                    <div className="col-span-1 md:col-span-4 flex flex-col gap-y-6">
                        {/* Installation info */}
                        {resolveDefaultGameVendor(currentGame).installPath && (
                            <div>
                                <h3 className="text-lg font-medium dark:text-gray-200 text-gray-800">{t("library.gameView.installDir")}</h3>
                                <p className="text-sm dark:text-gray-400 text-gray-600 mt-1 whitespace-pre-wrap">
                                    {(() => {
                                        const installPath = resolveAllGameVendors(currentGame)?.installPath
                                        if (typeof installPath === "string" && installPath[0] === "{") {
                                            return Object.entries(JSON.parse(installPath))
                                                .map(([,val]) => `${(val as string).replace("/", "\\")}`)
                                                .join("\n")
                                        }
                                        return installPath
                                    })()}
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

                        {/* Add warnings section */}
                        {(isLoadingWarnings || warnings || warningsError) && (
                            <div className="mt-4">
                                <h3 className="text-lg font-medium dark:text-neutral-200 text-neutral-800 mb-4 flex flex-row items-center gap-x-2">
                                    {t("library.gameView.gameNotes")}
                                    <Tooltip
                                        className="whitespace-pre-wrap"
                                        content={
                                            <Trans i18nKey="library.gameView.gameNotesTooltip"
                                                components={{
                                                    1: <span className="font-bold font-uniSansCAPS" />,
                                                    3: <span className="font-bold font-uniSansCAPS" />,
                                                    // eslint-disable-next-line jsx-a11y/anchor-has-content
                                                    5: <a
                                                        href="https://github.com/DeadCodeGames/DeadForgeExternalData"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-500 hover:text-blue-600 m-0"
                                                    />
                                                }}
                                            />
                                        }
                                        containerClassName="material-symbols"
                                        position="top"
                                    >
                                        info
                                    </Tooltip>
                                    {isLoadingWarnings && (
                                        <span className="material-symbols animate-spin ml-2 text-base align-middle">progress_activity</span>
                                    )}
                                </h3>

                                {warningsError ? (
                                    <div className="text-sm text-red-500 dark:text-red-400">{warningsError}</div>
                                ) : warnings?.notes && warnings.notes.length > 0 ? (
                                    <div className="space-y-4">
                                        {warnings.notes.map((note, index) => (
                                            <GameWarningComponent key={index} note={note} />
                                        ))}
                                    </div>
                                ) : (
                                    !isLoadingWarnings && (
                                        <div className="text-sm dark:text-neutral-400 text-neutral-600">
                                            {t("library.gameView.noGameNotes")}
                                        </div>
                                    )
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right column - DLCs */}
                    <div className="col-span-1 md:col-span-3 flex flex-col gap-y-6">
                        {dlcs.filter((dlc) => dlc.parentGameId === resolveDefaultGameVendor(currentGame).id).length > 0 && (
                            <div>
                                <h3 className="text-xl font-semibold dark:text-white text-gray-900 mb-4">DLCs</h3>
                                <div className="relative">
                                    <ul className={cn("grid grid-cols-2 gap-2", !showAllDLCs && "pb-4")}>
                                        {dlcs
                                            .filter((dlc) => dlc.parentGameId === resolvedVendors?.id)
                                            .slice(0, showAllDLCs ? undefined : 6)
                                            .map((dlc) => (
                                                <li key={dlc.id as string}>
                                                    <RenderDLCHeader
                                                        game={resolveDefaultGameVendor(currentGame)}
                                                        dlc={dlc}
                                                        dlcs={dlcs.filter((dlc) => dlc.parentGameId === resolvedVendors?.id)}
                                                        curatedAssets={curatedAssets}
                                                        customAssets={customAssets}
                                                    />
                                                </li>
                                            ))}
                                    </ul>
                                    {dlcs.filter((dlc) => dlc.parentGameId === resolvedVendors?.id).length > 6 && (
                                        <div
                                            className={cn(
                                                "absolute flex flex-col justify-end items-center bottom-0 left-0 right-0 h-8 transition-all pointer-events-none",
                                                !showAllDLCs &&
                                                "bg-gradient-to-t from-night to-transparent dark:from-night dark:to-transparent  mb-4",
                                                showAllDLCs && "bg-none",
                                            )}
                                        >
                                            <button
                                                onClick={() => setShowAllDLCs(!showAllDLCs)}
                                                className="w-fit h-fit my-4 px-2 py-1.5 rounded-lg text-center text-sm font-medium text-night dark:text-fullMoon hover:text-black dark:hover:text-white bg-transparent hover:bg-fullMoon/50 dark:hover:bg-night/50 transition-colors pointer-events-auto"
                                            >
                                                {showAllDLCs ? t("showLess") : t("showMore")}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Loading state */}
            <div className="flex items-center justify-center h-full" style={{ display: isReady ? "none" : "flex" }}>
                <div className="text-4xl dark:text-gray-200 text-gray-800 font-uniSansCAPS font-bold">{t("library.gameView.loading")}</div>
            </div>

            {/* Collection Menu */}
            {showCollectionMenu && (
                <ContextMenu
                    x={collectionMenuPosition.x}
                    y={collectionMenuPosition.y}
                    onClose={() => setShowCollectionMenu(false)}
                    items={getCollectionsItems()}
                    header={{
                        title: t("library.shared.collections"),
                    }}
                    extraFocusRefs={[collectionsButtonRef]}
                />
            )}
        </div>
    )
}

export default LibraryGame