import React, { useContext, useMemo } from "react";
import { LibraryContext } from "../Library";
import GameCard from "../components/GameCard";
import type { NormalizedGame, NormalizedPseudoGameJoin, NormalizedGameJoin } from "@/types";

const LibraryRecent: React.FC = () => {
    const { games, gameJoins, favourites, launchTimestamps } = useContext(LibraryContext);

    // Transform game joins into usable format
    const gameJoinsPopulated = useMemo(() => gameJoins.map((join) => {
        return {
            ...join,
            id: `join-${join.id}`,
            clients: Object.fromEntries(
                Object.entries(join.clients).map(([key, value]) => {
                    return [key, games.find((game) => String(game.id) === String(value) && game.source === key)]
                }),
            ) as unknown as Record<"steam" | "epic" | "itch" | "osu" | "deadforge", NormalizedGame>,
        } as unknown as NormalizedGameJoin
    }), [games, gameJoins]);

    function transformGameJoinIntoUsableFormat(join: NormalizedGameJoin): NormalizedPseudoGameJoin {
        return {
            id: String(join.id),
            source: join.clients as unknown as Record<"steam" | "epic" | "itch" | "osu" | "deadforge", NormalizedGame>,
            type: "GameJoin",
            defaultClient: join.defaultClient,
            preferences: join.preferences,
        }
    }

    // Get all games with their launch timestamps
    const recentGames = useMemo(() => {
        const allGames = [
            ...games.filter(game => gameJoinsPopulated.some(join => join.clients[game.source]?.id !== game.id)),
            ...gameJoinsPopulated.map(transformGameJoinIntoUsableFormat),
        ];

        console.log(allGames);

        return allGames
            .map(game => {
                return {
                    game,
                    lastPlayed: ((g): g is NormalizedPseudoGameJoin => g.type === "GameJoin")(game) ? Math.max(...Object.values(game.source).map(game => game.lastPlayed || 0), 0) : (game.lastPlayed || 0)
                };
            })
            .filter(({ lastPlayed }) => {console.log(lastPlayed); return lastPlayed > 0})
            .sort((a, b) => b.lastPlayed - a.lastPlayed);
    }, [games, gameJoinsPopulated, launchTimestamps]);

    // Group games by time period
    const groupedGames = useMemo(() => {
        const now = Math.floor(Date.now() / 1000); // Convert current time to seconds
        const oneDay = 24 * 60 * 60; // One day in seconds
        const oneWeek = 7 * oneDay;
        const oneMonth = 30 * oneDay;

        return {
            today: recentGames.filter(({ lastPlayed }) => { console.log(now, lastPlayed); return now - lastPlayed < oneDay}),
            thisWeek: recentGames.filter(({ lastPlayed }) => now - lastPlayed >= oneDay && now - lastPlayed < oneWeek),
            thisMonth: recentGames.filter(({ lastPlayed }) => now - lastPlayed >= oneWeek && now - lastPlayed < oneMonth)
        };
    }, [recentGames]);

    const isGameInFavorites = (game: NormalizedGame | NormalizedPseudoGameJoin) => {
        const gameId = typeof game.id === "object" ? JSON.stringify(game.id) : game.id;
        const gameSource = typeof game.source === "object" ? "join" : game.source;
        return favourites.some((fav) => fav.id === gameId && fav.source === gameSource);
    };

    const GameGrid = ({ games }: { games: typeof recentGames }) => (
        <div className="grid gap-6 auto-rows-max justify-between justify-items-start mb-8"
            style={{
                gridTemplateColumns: "repeat(auto-fill, 144px)",
            }}>
            {games.map(({ game }) => {
                const gameKey = ((g): g is NormalizedPseudoGameJoin => g.type === "GameJoin")(game) ? game.id : `${game.source}-${game.id}`;
                return (
                    <div key={gameKey} className="relative group w-36">
                        <GameCard game={game} size="medium" showTitle={false} isFavorite={isGameInFavorites(game)} useCapsule={true} />
                    </div>
                );
            })}
        </div>
    );

    return (
        <div className="h-full w-full overflow-y-auto flex-1 scrollbar-gutter-stable">
            <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-2 flex flex-row items-center">
                            <span className="material-symbols align-middle mr-2 text-blue-500">history</span>
                            Recently Played
                        </h1>
                        <p className="text-neutral-600 dark:text-neutral-400">Your recent gaming activity at a glance</p>
                    </div>
                </div>

                {recentGames.length > 0 ? (
                    <>
                        {groupedGames.today.length > 0 && (
                            <div className="mb-8">
                                <h2 className="text-xl font-semibold text-neutral-800 dark:text-neutral-200 mb-4">Today</h2>
                                <GameGrid games={groupedGames.today} />
                            </div>
                        )}
                        
                        {groupedGames.thisWeek.length > 0 && (
                            <div className="mb-8">
                                <h2 className="text-xl font-semibold text-neutral-800 dark:text-neutral-200 mb-4">This Week</h2>
                                <GameGrid games={groupedGames.thisWeek} />
                            </div>
                        )}
                        
                        {groupedGames.thisMonth.length > 0 && (
                            <div className="mb-8">
                                <h2 className="text-xl font-semibold text-neutral-800 dark:text-neutral-200 mb-4">This Month</h2>
                                <GameGrid games={groupedGames.thisMonth} />
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-center">
                        <span className="material-symbols text-6xl opacity-30 mb-4">history_toggle_off</span>
                        <h3 className="text-xl font-medium dark:text-gray-300 text-gray-700 mb-2">No recent games</h3>
                        <p className="dark:text-gray-400 text-gray-600">
                            Games you play will appear here
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LibraryRecent;
