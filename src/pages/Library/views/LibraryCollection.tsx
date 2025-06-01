"use client"

import type React from "react"
import { useContext, useMemo, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { getLocalizedGameName, LibraryContext } from "../Library"
import GameCard from "../components/GameCard"
import type { NormalizedGame, NormalizedPseudoGameJoin, NormalizedGameJoin } from "@/types"
import { resolveDefaultGameVendor } from "../utils/LibraryHelpers"

const LibraryCollection: React.FC = () => {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { games, gameJoins, collections, setCollections, favourites } = useContext(LibraryContext)
    const [isEditing, setIsEditing] = useState(false)
    const [editName, setEditName] = useState("")

    // Transform game joins into usable format (similar to LibraryGame)
    const gameJoinsPopulated = gameJoins.map((join) => {
        return {
            ...join,
            id: `join-${join.id}`,
            clients: Object.fromEntries(
                Object.entries(join.clients).map(([key, value]) => {
                    return [key, games.find((game) => String(game.id) === String(value) && game.source === key)]
                }),
            ) as unknown as Record<"steam" | "epic" | "itch" | "osu" | "deadforge", NormalizedGame>,
        } as unknown as NormalizedGameJoin
    })

    function transformGameJoinIntoUsableFormat(join: NormalizedGameJoin): NormalizedPseudoGameJoin {
        return {
            id: String(join.id),
            source: join.clients as unknown as Record<"steam" | "epic" | "itch" | "osu" | "deadforge", NormalizedGame>,
            type: "GameJoin",
            defaultClient: join.defaultClient,
            preferences: join.preferences,
        }
    }

    // Get all games (excluding those that are part of joins)
    const allGames = useMemo(() => {
        return [
            ...games.filter(
                (game) =>
                    !gameJoinsPopulated.some(
                        (join) => (join?.clients?.[game.source as keyof typeof join.clients] as NormalizedGame)?.id === game.id,
                    ),
            ),
            ...gameJoinsPopulated.map(transformGameJoinIntoUsableFormat),
        ]
    }, [games, gameJoinsPopulated])

    const isGameInFavorites = (game: NormalizedGame | NormalizedPseudoGameJoin) => {
        const gameId = typeof game.id === "object" ? JSON.stringify(game.id) : game.id
        const gameSource = typeof game.source === "object" ? "join" : game.source
        return favourites.some((fav) => fav.id === gameId && fav.source === gameSource)
    }

    // Find the current collection
    const currentCollection = useMemo(() => {
        return collections.find((collection) => collection.id === id)
    }, [collections, id])

    // Get games in this collection
    const collectionGames = useMemo(() => {
        if (!currentCollection) return []

        return allGames.filter((game) => {
            const gameId = typeof game.id === "object" ? JSON.stringify(game.id) : game.id
            const gameSource = typeof game.source === "object" ? "join" : game.source
            return currentCollection.games.some((g) => g.id === gameId && g.source === gameSource)
        })
    }, [allGames, currentCollection])

    const handleRemoveFromCollection = (gameToRemove: NormalizedGame | NormalizedPseudoGameJoin) => {
        if (!currentCollection) return

        const gameId = typeof gameToRemove.id === "object" ? JSON.stringify(gameToRemove.id) : gameToRemove.id
        const gameSource = typeof gameToRemove.source === "object" ? "join" : gameToRemove.source

        setCollections((prev) => {
            return prev.map((collection) => {
                if (collection.id === currentCollection.id) {
                    return {
                        ...collection,
                        games: collection.games.filter((g) => !(g.id === gameId && g.source === gameSource)),
                    }
                }
                return collection
            })
        })
    }

    const handleDeleteCollection = () => {
        if (!currentCollection) return

        setCollections((prev) => prev.filter((collection) => collection.id !== currentCollection.id))
        navigate("/library/collections")
    }

    const handleRenameCollection = () => {
        if (!currentCollection || editName.trim() === "") return

        setCollections((prev) => {
            return prev.map((collection) => {
                if (collection.id === currentCollection.id) {
                    return {
                        ...collection,
                        name: editName.trim(),
                    }
                }
                return collection
            })
        })

        setIsEditing(false)
        setEditName("")
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault()
            if (editName.trim()) {
                handleRenameCollection()
            }
        } else if (e.key === "Escape") {
            e.preventDefault()
            setEditName("")
            setIsEditing(false)
        }
    }

    if (!currentCollection) {
        return (
            <div className="h-full w-full flex items-center justify-center">
                <div className="text-center">
                    <span className="material-symbols text-6xl opacity-30 mb-4 block">folder_off</span>
                    <h3 className="text-xl font-medium dark:text-gray-300 text-gray-700 mb-2">Collection not found</h3>
                    <p className="dark:text-gray-400 text-gray-600 mb-4">The collection you&apos;re looking for doesn&apos;t exist.</p>
                    <button
                        onClick={() => navigate("/library/collections")}
                        className="px-4 py-2 bg-progress hover:bg-progress/80 text-white rounded-lg transition-colors"
                    >
                    Back to Collections
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="h-full w-full overflow-y-auto flex-1 scrollbar-gutter-stable">
            <div className="p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate("/library/collections")}
                            className="p-2 hover:bg-notQuiteBlack/20 dark:hover:bg-notQuiteWhite/20 rounded-lg transition-colors flex aspect-square"
                        >
                            <span className="material-symbols">arrow_back</span>
                        </button>

                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg bg-night/20 dark:bg-fullMoon/20 flex items-center justify-center">
                                <span className="material-symbols text-2xl ms-filled">folder</span>
                            </div>

                            <div>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        onBlur={handleRenameCollection}
                                        className="text-3xl font-bold bg-transparent border-b-2 border-progress outline-none dark:text-notQuiteWhite text-notQuiteBlack"
                                        maxLength={32}
                                        autoFocus
                                    />
                                ) : (
                                    <h1
                                        className="text-3xl font-bold dark:text-notQuiteWhite text-notQuiteBlack cursor-pointer hover:opacity-75 transition-opacity"
                                        onClick={() => {
                                            setEditName(currentCollection.name)
                                            setIsEditing(true)
                                        }}
                                    >
                                        {currentCollection.name}
                                    </h1>
                                )}
                                <p className="text-base dark:text-gray-400 text-gray-600 -mt-1">
                                    {collectionGames.length} {collectionGames.length === 1 ? "game" : "games"}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                setEditName(currentCollection.name)
                                setIsEditing(true)
                            }}
                            className="p-2 hover:bg-notQuiteBlack/20 dark:hover:bg-notQuiteWhite/20 rounded-lg transition-colors aspect-square flex"
                        >
                            <span className="material-symbols">edit</span>
                        </button>
                        <button
                            onClick={handleDeleteCollection}
                            className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-red-500 aspect-square flex"
                        >
                            <span className="material-symbols">delete</span>
                        </button>
                    </div>
                </div>

                {/* Games grid */}
                {collectionGames.length > 0 ? (
                    <div className="grid gap-6 auto-rows-max justify-between justify-items-start ml-14 mr-12"
                        style={{
                            gridTemplateColumns: "repeat(auto-fill, 144px)",
                        }}>
                        {collectionGames.sort((a, b) => {
                            return getLocalizedGameName(resolveDefaultGameVendor(a)).localeCompare(getLocalizedGameName(resolveDefaultGameVendor(b)))
                        }).map((game) => {
                            const gameKey = ((g): g is NormalizedPseudoGameJoin => g.type === "GameJoin")(game) ? game.id : `${game.source}-${game.id}`
                            return (
                                <div key={gameKey} className="relative group w-36">
                                    <GameCard game={game} size="medium" showTitle={false} isFavorite={isGameInFavorites(game)} useCapsule={true}>
                                        <button
                                            onClick={() => handleRemoveFromCollection(game)}
                                            className="absolute top-2 left-2 p-1 bg-red-500/80 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity aspect-square"
                                        >
                                            <span className="material-symbols text-sm aspect-square flex">close</span>
                                        </button>    
                                    </GameCard>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-center">
                        <span className="material-symbols text-6xl opacity-30 mb-4">videogame_asset_off</span>
                        <h3 className="text-xl font-medium dark:text-gray-300 text-gray-700 mb-2">No games in this collection</h3>
                        <p className="dark:text-gray-400 text-gray-600">
              Add games to this collection from your library or individual game pages.
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}

export default LibraryCollection
