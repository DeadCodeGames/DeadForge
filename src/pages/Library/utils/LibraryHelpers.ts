import { Collection, CollectionGame, NormalizedGame, NormalizedPseudoGameJoin } from "@/types";

export function resolveDefaultGameVendor(game: NormalizedGame | NormalizedPseudoGameJoin): NormalizedGame {
    if (((game): game is NormalizedPseudoGameJoin => game?.type === "GameJoin")(game)) {
        return game.source[game.defaultClient];
    }
    return game;
}

export function chunkGamesByCategory(
    games: (NormalizedGame | NormalizedPseudoGameJoin)[],
    collections: Collection[],
    favourites: CollectionGame[]
): Record<string, (NormalizedGame | NormalizedPseudoGameJoin)[]> {
    // Initialize result object with empty arrays for each collection
    const result: Record<string, (NormalizedGame | NormalizedPseudoGameJoin)[]> = {};
    // Add Favourites category first
    result["Favourites"] = [];

    // Initialize with empty arrays for each collection
    collections.forEach(collection => {
        result[collection.name] = [];
    });

    // Add Uncategorized category
    result["Uncategorized"] = [];

    // Helper function to determine if a game is in a collection
    const isGameInCollection = (game: NormalizedGame | NormalizedPseudoGameJoin, collection: Collection): boolean => {
        const gameId = typeof game.id === "object" ? JSON.stringify(game.id) : game.id;
        const gameSource = typeof game.source === "object" ? "join" : game.source;

        return collection.games.some(g => g.id === gameId && g.source === gameSource);
    };

    // Helper function to determine if a game is in favourites
    const isGameInFavourites = (game: NormalizedGame | NormalizedPseudoGameJoin): boolean => {
        const gameId = typeof game.id === "object" ? JSON.stringify(game.id) : game.id;
        const gameSource = typeof game.source === "object" ? "join" : game.source;

        return favourites.some(fav => fav.id === gameId && fav.source === gameSource);
    };

    // Place each game in its appropriate categories
    games.forEach(game => {
        let assignedToAnyCollection = false;

        // Check if game is in favourites
        if (isGameInFavourites(game)) {
            result["Favourites"].push(game);
            // Mark as assigned so it won't be added to Uncategorized
            assignedToAnyCollection = true;
        }

        // Check regular collections
        collections.forEach(collection => {
            if (isGameInCollection(game, collection)) {
                result[collection.name].push(game);
                assignedToAnyCollection = true;
            }
        });

        // If the game isn't in any regular collection or favourites, add it to Uncategorized
        if (!assignedToAnyCollection) {
            result["Uncategorized"].push(game);
        }
    });

    // Create a sorted result with Favourites first, other collections alphabetically, and Uncategorized last
    const sortedResult: Record<string, (NormalizedGame | NormalizedPseudoGameJoin)[]> = {};

    sortedResult["Favourites"] = result["Favourites"];
    

    // Get all keys except Favourites and Uncategorized, and sort them alphabetically
    const sortedKeys = Object.keys(result)
        .filter(key => key !== "Favourites" && key !== "Uncategorized")
        .sort((a, b) => a.localeCompare(b));

    // Add sorted categories to result
    sortedKeys.forEach(key => {
        sortedResult[key] = result[key];
    });

    sortedResult["Uncategorized"] = result["Uncategorized"];

    return sortedResult;
}

export function getLauncherName(game: NormalizedGame | NormalizedPseudoGameJoin | NormalizedGame['source']): string {
    if (((game): game is NormalizedGame['source'] => typeof game === "string" && !game.includes(","))(game)) {
        switch (game) {
        case 'steam':
            return 'Steam';
        case 'epic':
            return 'Epic Games';
        case 'itch':
            return 'itch';
        case 'deadforge':
            return 'DEADFORGE';
        case 'osu':
            return 'osu!';
        default: 
            return getLauncherName(resolveDefaultGameVendor(game));
        }
    }
    switch (game.source) {
    case 'steam':
        return 'Steam';
    case 'epic':
        return 'Epic Games';
    case 'itch':
        return 'itch';
    case 'deadforge':
        return 'DEADFORGE';
    case 'osu':
        return 'osu!';
    default: 
        return getLauncherName(resolveDefaultGameVendor(game));
    }
}

