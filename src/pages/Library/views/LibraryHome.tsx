import type React from "react"
import { useCallback, useContext, useMemo, useState, useRef, useEffect } from "react"
import { Link } from "react-router-dom"
import { getLocalizedGameName, LibraryContext } from "../Library"
import GameCard, { getImageUrl } from "../components/GameCard"
import type { NormalizedGame, NormalizedPseudoGameJoin, NormalizedGameJoin, CollectionGame } from "@/types"
import { Heart, Clock, Gamepad2 } from "lucide-react"
import { resolveDefaultGameVendor } from "../utils/LibraryHelpers"
import { useTranslation } from "react-i18next"
import { AppContext } from "@/App"

const isGameInFavorites = (favourites: CollectionGame[], game: NormalizedGame | NormalizedPseudoGameJoin) => {
    const gameId = typeof game.id === "object" ? JSON.stringify(game.id) : game.id
    const gameSource = typeof game.source === "object" ? "join" : game.source
    return favourites.some((fav) => fav.id === gameId && fav.source === gameSource)
}

const SectionHeader: React.FC<{ title: string, count?: number, icon: React.ReactNode, description?: string, viewAllPath?: string }> = ({ title, count, icon, description, viewAllPath }) => {
    const { t } = useTranslation();
    return (
        <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 dark:from-blue-400/20 dark:to-purple-400/20">
                    {icon}
                </div>
                <div>
                    <div className="flex items-center gap-3 -mt-1">
                        <h2 className="text-2xl font-bold dark:text-notQuiteWhite text-notQuiteBlack">{title}</h2>
                        {count !== undefined && (
                            <span className="px-3 py-1 text-sm font-medium rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 dark:from-blue-400/10 dark:to-purple-400/10 text-blue-700 dark:text-blue-300 border border-blue-200/20 dark:border-blue-400/20">
                                {count}
                            </span>
                        )}
                    </div>
                    {description && <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>}
                </div>
            </div>
            {viewAllPath && (
                <Link
                    to={viewAllPath}
                    className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                >
                    {t('viewAll')}
                </Link>
            )}
        </div>
    )
}

const StaticGameList: React.FC<{games: (NormalizedGame | NormalizedPseudoGameJoin)[], preloadAssets?: boolean}> = ({ games, preloadAssets = false }) => {
    const { favourites, curatedAssets, customAssets } = useContext(LibraryContext)

    // Memoize the preloading logic
    useMemo(() => {
        if (!preloadAssets) return;
        const transformIconUrl = (iconUrl: string) => {
            if (iconUrl.includes("%USERDATA%")) {
                return `local://${iconUrl.replace("%USERDATA%", "CONST_USERDATA")}`;
            }
            return `local://${iconUrl}`;
        }

        const gamesMapped = games.map((game) => resolveDefaultGameVendor(game));
        const imagesToPreload = new Set<string>();

        gamesMapped.forEach((game) => {
            if (!game.media) return;
            try {
                const imgUrl = getImageUrl(game, false, curatedAssets, customAssets);
                if (imgUrl) imagesToPreload.add(imgUrl);
            } catch (e) { console.log(e); }
            try {
                const imgUrl = getImageUrl(game, true, curatedAssets, customAssets);
                if (imgUrl) imagesToPreload.add(imgUrl);
            } catch (e) { console.log(e); }
            if (game.media.iconUrl) {
                try {
                    const imgUrl = transformIconUrl(game.media.iconUrl);
                    if (imgUrl) imagesToPreload.add(imgUrl);
                } catch (e) { console.log(e); }
            }
        });
    }, [games]);

    return (
        <div className="relative">
            <div className="flex gap-4 overflow-hidden">
                {games.map((game) => {
                    const gameKey = ((g): g is NormalizedPseudoGameJoin => g.type === "GameJoin")(game)
                        ? game.id
                        : `${game.source}-${game.id}`
                    return (
                        <div key={gameKey} className="flex-shrink-0 transform transition-transform">
                            <GameCard
                                game={game}
                                size="medium"
                                showTitle={false}
                                useCapsule={true}
                                isFavorite={isGameInFavorites(favourites, game)}
                            />
                        </div>
                    )
                })}
            </div>
            <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-white dark:from-gray-900 to-transparent pointer-events-none" />
        </div>
    )
}

const MultilineGameGrid: React.FC<{ games: (NormalizedGame | NormalizedPseudoGameJoin)[] }> = ({ games }) => {
    const { favourites } = useContext(LibraryContext)
    const [visibleGames, setVisibleGames] = useState<Set<string>>(new Set())
    const observerRef = useRef<IntersectionObserver | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        // Reset visible games when games array changes
        setVisibleGames(new Set())

        // Create intersection observer
        observerRef.current = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const gameKey = entry.target.getAttribute('data-game-key')
                        if (gameKey) {
                            setVisibleGames(prev => new Set([...prev, gameKey]))
                        }
                    }
                })
            },
            {
                root: null,
                rootMargin: '50px',
                threshold: 0.1
            }
        )

        // Observe all game containers
        if (containerRef.current) {
            const gameElements = containerRef.current.querySelectorAll('[data-game-key]')
            gameElements.forEach(el => observerRef.current?.observe(el))
        }

        return () => {
            observerRef.current?.disconnect()
        }
    }, [games])

    return (
        <div
            ref={containerRef}
            className="grid gap-6 auto-rows-max"
            style={{
                gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            }}
        >
            {games.map((game) => {
                const gameKey = ((g): g is NormalizedPseudoGameJoin => g.type === "GameJoin")(game)
                    ? game.id
                    : `${game.source}-${game.id}`
                const isVisible = visibleGames.has(gameKey)

                return (
                    <div 
                        key={gameKey} 
                        data-game-key={gameKey}
                        className="transform transition-transform justify-self-center"
                        style={{
                            contentVisibility: 'visible'
                        }}
                    >
                        {isVisible && (
                            <GameCard 
                                game={game} 
                                size="medium" 
                                showTitle={false}
                                isFavorite={isGameInFavorites(favourites, game)} 
                            />
                        )}
                    </div>
                )
            })}
        </div>
    )
}

function transformGameJoinIntoUsableFormat(join: NormalizedGameJoin): NormalizedPseudoGameJoin {
    return {
        id: String(join.id),
        source: join.clients as unknown as Record<NormalizedGame["source"], NormalizedGame>,
        type: "GameJoin",
        defaultClient: join.defaultClient,
        preferences: join.preferences,
    }
}

const LibraryHome: React.FC = () => {
    const { games, gameJoins, favourites } = useContext(LibraryContext);
    const { setContext } = useContext(AppContext);
    const { t } = useTranslation();

    const replaySetup = () => {
        setContext((prev: any) => ({
            ...prev,
            setupModalActive: true
        }))
    };

    // Transform game joins into usable format (similar to LibraryGame)
    const gameJoinsPopulated = useMemo(() => gameJoins.map((join) => {
        return {
            ...join,
            id: `join-${join.id}`,
            clients: Object.fromEntries(
                Object.entries(join.clients).map(([key, value]) => {
                    return [key, games.find((game) => String(game.id) === String(value) && game.source === key)]
                }),
            ) as unknown as Record<NormalizedGame["source"], NormalizedGame>,
        } as unknown as NormalizedGameJoin
    }), [games, gameJoins])

    const removeLeadingTheAndA = useCallback((name: string) => {
        return name.replace(/^(The|A)\s+/gmi, '').trim();
    }, []);

    // Get all games (excluding those that are part of joins)
    const allGamesMemo = useMemo(() => {
        const gamesList = [
            ...games.filter(
                (game) =>
                    !gameJoinsPopulated.some(
                        (join) => (join?.clients?.[game.source as keyof typeof join.clients] as NormalizedGame)?.id === game.id,
                    ),
            ),
            ...gameJoinsPopulated.map(transformGameJoinIntoUsableFormat),
        ]

        // Sort alphabetically by name
        const sorted = gamesList.sort((a, b) => {
            const nameA = ((g): g is NormalizedPseudoGameJoin => g.type === "GameJoin")(a)
                ? removeLeadingTheAndA(getLocalizedGameName(resolveDefaultGameVendor(a))) || ""
                : removeLeadingTheAndA(getLocalizedGameName(a)) || ""
            const nameB = ((g): g is NormalizedPseudoGameJoin => g.type === "GameJoin")(b)
                ? removeLeadingTheAndA(getLocalizedGameName(resolveDefaultGameVendor(b))) || ""
                : removeLeadingTheAndA(getLocalizedGameName(b)) || ""
            return nameA.localeCompare(nameB)
        })
        return sorted;
    }, [games, gameJoinsPopulated, removeLeadingTheAndA])

    // Get favourited games - memoize the filter operation
    const favouritedGamesMemo = useMemo(() => {
        const result = allGamesMemo.filter((game) => {
            const gameId = typeof game.id === "object" ? JSON.stringify(game.id) : game.id
            const gameSource = typeof game.source === "object" ? "join" : game.source
            return favourites.some((fav) => fav.id === gameId && fav.source === gameSource)
        })
        return result;
    }, [allGamesMemo, favourites])

    // Get last played games - memoize the timestamp sorting
    const lastPlayedGamesMemo = useMemo(() => {
        const gamesWithTimestamps = allGamesMemo
            .filter((game) => String(game.id) !== "-1")
            .map((game) => {
                let timestamp: number | undefined
                if (((g): g is NormalizedPseudoGameJoin => g.type === "GameJoin")(game)) {
                    // For game joins, find the highest timestamp among all clients
                    timestamp = Math.max(...Object.values(game.source).map((client) => client.lastPlayed || 0))
                    timestamp = timestamp > 0 ? timestamp : undefined
                } else {
                    timestamp = game.lastPlayed
                }
                return { game, timestamp }
            })
            .filter(({ timestamp }) => timestamp)
            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
            .slice(0, 10) // Show last 10 played games

        const result = gamesWithTimestamps.map(({ game }) => game);
        return result;
    }, [allGamesMemo])

    // Memoize the final lists to prevent unnecessary re-renders
    const allGames = useMemo(() => allGamesMemo, [allGamesMemo])
    const favouritedGames = useMemo(() => favouritedGamesMemo, [favouritedGamesMemo])
    const lastPlayedGames = useMemo(() => lastPlayedGamesMemo, [lastPlayedGamesMemo])

    return (
        <div className="h-full w-full overflow-y-auto flex-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
            <div className="p-6 space-y-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600">
                            <Gamepad2 className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold dark:text-notQuiteWhite text-notQuiteBlack">{t('library.yourLibrary')}</h1>
                            <p className="text-base dark:text-gray-400 text-gray-600 -mt-0.5">{t('library.yourLibraryDescription')}</p>
                        </div>
                    </div>
                </div>

                {/* Favourited Games */}
                {favouritedGames.length > 0 && (
                    <section className="bg-white/50 dark:bg-gray-800/30 rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50">
                        <SectionHeader
                            title={t("library.shared.favourites")}
                            count={favouritedGames.length}
                            icon={<Heart className="w-5 h-5 text-red-500" />}
                            description={t("library.shared.favouritesDescription")}
                            viewAllPath="/library/favourites"
                        />
                        <StaticGameList games={favouritedGames} preloadAssets={true} />
                    </section>
                )}

                {/* Last Played Games */}
                {lastPlayedGames.length > 0 && (
                    <section className="bg-white/50 dark:bg-gray-800/30 rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50">
                        <SectionHeader
                            title={t("library.shared.recentlyPlayed")}
                            icon={<Clock className="w-5 h-5 text-green-500" />}
                            description={t("library.shared.recentlyPlayedDescription")}
                            viewAllPath="/library/recent"
                        />
                        <StaticGameList games={lastPlayedGames} preloadAssets={true} />
                    </section>
                )}

                {/* Rest of Library */}
                {allGames.length > 0 && (
                    <section className="bg-white/50 dark:bg-gray-800/30 rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50">
                        <SectionHeader
                            title={favouritedGames.length > 0 || lastPlayedGames.length > 0 ? t("library.shared.allGames") : t("library.shared.yourGames")}
                            count={allGames.length}
                            icon={<Gamepad2 className="w-5 h-5 text-blue-500" />}
                            description={t("library.shared.allGamesDescription")}
                            viewAllPath="/library/all"
                        />
                        <MultilineGameGrid games={allGames} />
                    </section>
                )}

                {/* Enhanced Empty State */}
                {allGames.length === 0 && (
                    <div className="flex flex-col items-center justify-center min-h-[400px] text-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 p-12">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mb-6">
                            <Gamepad2 className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                        </div>
                        <h3 className="text-2xl font-bold dark:text-gray-300 text-gray-700 mb-3">{t('library.homeView.noGamesFound')}</h3>
                        <p className="dark:text-gray-400 text-gray-600 mb-6 max-w-2xl">
                            {t('library.homeView.noGamesFoundDescription')}
                        </p>
                        <div className="flex gap-3">
                            <button className="px-6 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
                                onClick={replaySetup}
                            >
                                {t('library.homeView.connect')}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default LibraryHome
