import React, { useContext, useMemo } from "react";
import { LibraryContext, getLocalizedGameName } from "../Library";
import GameCard from "../components/GameCard";
import type { NormalizedGame, NormalizedPseudoGameJoin, NormalizedGameJoin } from "@/types";
import { resolveDefaultGameVendor } from "../utils/LibraryHelpers";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

const LibraryFavourites: React.FC = () => {
    const { games, gameJoins, favourites } = useContext(LibraryContext);
    const { t } = useTranslation();

    // Transform game joins into usable format
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
    }), [games, gameJoins]);

    function transformGameJoinIntoUsableFormat(join: NormalizedGameJoin): NormalizedPseudoGameJoin {
        return {
            id: String(join.id),
            source: join.clients as unknown as Record<NormalizedGame["source"], NormalizedGame>,
            type: "GameJoin",
            defaultClient: join.defaultClient,
            preferences: join.preferences,
        }
    }

    // Get favorite games (including those that are part of joins)
    const favoriteGames = useMemo(() => {
        const allGames = [
            ...games.filter(game => gameJoinsPopulated.some(join => join.clients[game.source]?.id !== game.id)),
            ...gameJoinsPopulated.map(transformGameJoinIntoUsableFormat),
        ];

        console.log(allGames, favourites);

        return allGames.filter(game => {
            const gameId = String(game.id);
            const gameSource = ((g): g is NormalizedPseudoGameJoin => g.type === "GameJoin")(game) ? "join" : game.source;
            return favourites.some(fav => (String(fav.id) === gameId && fav.source === gameSource));
        }).sort((a, b) => {
            const nameA = ((g): g is NormalizedPseudoGameJoin => g.type === "GameJoin")(a)
                ? getLocalizedGameName(resolveDefaultGameVendor(a)) || ""
                : getLocalizedGameName(a) || "";
            const nameB = ((g): g is NormalizedPseudoGameJoin => g.type === "GameJoin")(b)
                ? getLocalizedGameName(resolveDefaultGameVendor(b)) || ""
                : getLocalizedGameName(b) || "";
            return nameA.localeCompare(nameB);
        });
    }, [games, gameJoinsPopulated, favourites]);

    return (
        <div className="h-full w-full overflow-y-auto flex-1 scrollbar-gutter-stable">
            <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-2 flex flex-row items-center">
                            <span className={cn("material-symbols align-middle mr-2 text-red-500", favoriteGames.length > 0 && "ms-filled")}>favorite</span>
                            {t("library.shared.favourites")}
                        </h1>
                        <p className="text-neutral-600 dark:text-neutral-400">{t("library.shared.favouritesDescription")}</p>
                    </div>
                </div>

                {favoriteGames.length > 0 ? (
                    <div className="grid gap-6 auto-rows-max justify-between justify-items-start"
                        style={{
                            gridTemplateColumns: "repeat(auto-fill, 144px)",
                        }}>
                        {favoriteGames.map((game) => {
                            const gameKey = ((g): g is NormalizedPseudoGameJoin => g.type === "GameJoin")(game) ? game.id : `${game.source}-${game.id}`;
                            return (
                                <div key={gameKey} className="relative group w-36">
                                    <GameCard game={game} size="medium" showTitle={false} isFavorite={true} useCapsule={true} />
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-center">
                        <span className="material-symbols text-6xl opacity-30 mb-4">heart_broken</span>
                        <h3 className="text-xl font-medium dark:text-gray-300 text-gray-700 mb-2">{t("library.favouritesView.noFavourites")}</h3>
                        <p className="dark:text-gray-400 text-gray-600">
                            {t("library.favouritesView.noFavouritesDescription")}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LibraryFavourites;