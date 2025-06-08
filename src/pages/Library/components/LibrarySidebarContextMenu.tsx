import React, { useCallback, useState, useRef, useEffect, useMemo, useContext } from "react"
import { useNavigate } from "react-router-dom"
import type { Collection, CollectionGame, NormalizedGame, NormalizedPseudoGameJoin, GameState } from "@/types"
import { getLocalizedGameName } from "@/pages/Library/Library"
import { resolveDefaultGameVendor, getLauncherName } from "@/pages/Library/utils/LibraryHelpers"
import ContextMenu, { MenuItemType, MenuItem } from "@/components/CustomElements/ContextMenu"
import { cn } from "@/lib/utils"
import { SiSteam, SiEpicgames } from '@icons-pack/react-simple-icons'
import { LibraryContext } from "@/pages/Library/Library"
import { useTranslation } from "react-i18next";

// Extend the MenuItem type to include our custom properties
interface MenuItemWithPrefix extends Omit<MenuItem, 'type'> {
    icon_prefix?: React.ReactNode;
    type?: 'item';
}

interface LibrarySidebarContextMenuProps {
  x: number
  y: number
  onClose: () => void
  game: NormalizedGame | NormalizedPseudoGameJoin
  collections: Collection[]
  favourites: CollectionGame[]
  setCollections: React.Dispatch<React.SetStateAction<Collection[]>>
  setFavourites: React.Dispatch<React.SetStateAction<CollectionGame[]>>
  gameStates: Record<string, GameState>
  // eslint-disable-next-line no-unused-vars
  setGameState: (gameId: string, gameSource: string, newState: GameState['state']) => void
  games: NormalizedGame[]
}

const LibrarySidebarContextMenu: React.FC<LibrarySidebarContextMenuProps> = ({
    x,
    y,
    onClose,
    game,
    collections,
    favourites,
    setCollections,
    setFavourites,
    gameStates,
    setGameState,
    games
}) => {
    const [newCollectionName, setNewCollectionName] = useState("")
    const [isCreatingCollection, setIsCreatingCollection] = useState(false)
    const newCollectionInputRef = useRef<HTMLInputElement>(null)
    const navigate = useNavigate()
    const { customAssets, curatedAssets } = useContext(LibraryContext)
    const { t } = useTranslation();
    // Focus input when creating a collection
    useEffect(() => {
        if (isCreatingCollection && newCollectionInputRef.current) {
            newCollectionInputRef.current.focus();
        }
    }, [isCreatingCollection]);

    // Helper function to ensure game ID is a string
    const getGameIdAsString = useCallback(() => {
        return typeof game.id === "object" ? JSON.stringify(game.id) : game.id
    }, [game.id])

    // Function to determine if a game is in favorites
    const isGameInFavorites = useCallback(() => {
        const gameId = getGameIdAsString()
        const gameSource = typeof game.source === "object" ? "join" : game.source
        return favourites.some((fav) => fav.id === gameId && fav.source === gameSource)
    }, [game, favourites, getGameIdAsString])

    // Function to add or remove a game from favorites
    const toggleFavorite = () => {
        const gameId = getGameIdAsString()
        const gameSource = typeof game.source === "object" ? "join" : game.source

        if (isGameInFavorites()) {
            // Remove from favorites
            setFavourites((prev) => prev.filter((fav) => !(fav.id === gameId && fav.source === gameSource)))
        } else {
            // Add to favorites - create a proper CollectionGame object
            setFavourites((prev) => [...prev, { id: gameId, source: gameSource }])
        }
    }

    // Function to check if a game is in a collection
    const isGameInCollection = (collectionId: string) => {
        const gameId = getGameIdAsString()
        const gameSource = typeof game.source === "object" ? "join" : game.source
        const collection = collections.find((c) => c.id === collectionId)
        return collection?.games.some((g) => g.id === gameId && g.source === gameSource) || false
    }

    // Function to add or remove a game from a collection
    const toggleGameInCollection = (collectionId: string) => {
        const gameId = getGameIdAsString()
        const gameSource = typeof game.source === "object" ? "join" : game.source

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
                        // Add to collection with the correct type
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
        const gameId = getGameIdAsString()
        const gameSource = typeof game.source === "object" ? "join" : game.source

        if (newCollectionName.trim() === "") {
            setIsCreatingCollection(false);
            return;
        } else if (newCollectionName.trim().toLowerCase() === "favourites") {
            setIsCreatingCollection(false);
            setFavourites((prev) => [...prev.filter((fav) => fav.id !== gameId || fav.source !== gameSource), { id: gameId, source: gameSource }]);
            setNewCollectionName("");
            onClose();
            return;
        } else if (newCollectionName.trim().toLowerCase() === "uncategorized") {
            setIsCreatingCollection(false);
            setCollections((prev) => prev.map((collection) => ({
                ...collection,
                games: collection.games.filter((g) => !(g.id === gameId && g.source === gameSource))
            })));
            setNewCollectionName("");
            onClose();
            return;
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
        onClose()
    }

    // Handle canceling new collection creation
    const handleCancelNewCollection = () => {
        setNewCollectionName("");
        setIsCreatingCollection(false);
        onClose();
    }

    // Handle key press in the collection name input
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSaveNewCollection();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            handleCancelNewCollection();
        }
    }

    // Determine if game is launchable
    const isLaunchable = (() => {
        if (typeof game.source === "object") {
            return Object.values(game.source).some((client) => (client?.launchOptions || []).length > 0)
        }
        return (game?.launchOptions || []).length > 0
    })()

    // Determine if game needs a launcher
    const needsLauncher: boolean = !!game && ['steam', 'epic'].includes(resolveDefaultGameVendor(game)?.source || '');
    const launcherState = needsLauncher ? gameStates[`${resolveDefaultGameVendor(game)?.source}-${'-1'}`] : undefined;
    const isLauncherRunning = launcherState?.state === 'running';

    // Launch game function
    const launchGame = async () => {
        if (!isLaunchable) return;

        const gameToLaunch = resolveDefaultGameVendor(game);
        const launchOption = gameToLaunch.launchOptions?.[0];

        if (launchOption) {
            try {
                console.log(`Launching ${getLocalizedGameName(gameToLaunch)} with option: ${launchOption.name}`);
                console.log(`Executable: ${launchOption.executable}`);
                console.log(`Arguments: ${Array.isArray(launchOption.arguments) ? launchOption.arguments.join(" ") : launchOption.arguments}`);

                if (gameToLaunch.source && typeof gameToLaunch.source === 'string') {
                    const gameId = typeof gameToLaunch.id === 'object' ? JSON.stringify(gameToLaunch.id) : gameToLaunch.id;
                    setGameState(gameId, gameToLaunch.source, 'launching');
                    
                    const result = await window.Electron.launchGame(
                        gameToLaunch.source,
                        gameId,
                        launchOption.executable,
                        launchOption.arguments
                    );
                    
                    if (!result.success) {
                        console.error('Failed to launch game:', result.error);
                        setGameState(gameId, gameToLaunch.source, 'idle');
                    } else {
                        setGameState(gameId, gameToLaunch.source, 'running');
                    }
                }
            } catch (error) {
                console.error("Failed to launch game:", error);
                const gameId = typeof gameToLaunch.id === 'object' ? JSON.stringify(gameToLaunch.id) : gameToLaunch.id;
                setGameState(gameId, gameToLaunch.source, 'idle');
            }
        }
        onClose();
    };

    // Launch source launcher function
    const launchSourceLauncher = async (source: string) => {
        try {
            console.log(`Launching ${source} launcher`);
            setGameState('-1', source, 'launching');

            // Find the launcher game in the games array
            const launcherGame = games.find(g => g.source === source && String(g.id) === '-1');
            if (!launcherGame?.launchOptions?.[0]?.executable) {
                throw new Error(`No executable found for ${source} launcher`);
            }

            const result = await window.Electron.launchGame(
                source,
                '-1',
                launcherGame.launchOptions[0].executable,
                launcherGame.launchOptions[0].arguments || []
            );
            
            if (!result.success) {
                console.error(`Failed to launch ${source} launcher:`, result.error);
                setGameState('-1', source, 'idle');
            } else {
                setGameState('-1', source, 'running');
            }
        } catch (error) {
            console.error(`Failed to launch ${source} launcher:`, error);
            setGameState('-1', source, 'idle');
        }
        onClose();
    };

    // Navigate to game page
    const viewGame = () => {
        const path = `/library/game/${typeof game.source === "object" ? "" : `${game.source}-`}${game.id}`
        navigate(path)
    }

    // Get game type for proper button label
    const gameType = typeof game.source === "object" ? game.source[game.defaultClient].type : game.type;

    // Get game icon
    const getGameIcon = (): string => {
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
    };

    const gameIcon = getGameIcon()
    const gameName =
    typeof game.source === "string" ? getLocalizedGameName(game) : getLocalizedGameName(game.source[game.defaultClient])

    // Generate collections submenu items dynamically
    const collectionsItems = useMemo(() => {
        // Create menu items for each collection
        const collectionItems: MenuItemType[] = Array.isArray(collections) && collections.length > 0
            ? collections.sort((a, b) => a.name.localeCompare(b.name)).map((collection) => ({
                id: `collection-${collection.id}`,
                icon: isGameInCollection(collection.id) ? "check" : " ",
                label: collection.name,
                onClick: () => toggleGameInCollection(collection.id)
            }))
            : [{
                id: "no-collections",
                label: t("library.shared.noCollections"),
                className: "px-4 py-2 text-white/50 italic cursor-default",
                disabled: true
            }];

        // Custom component for new collection creation form
        const createNewCollectionItem = isCreatingCollection
            ? {
                id: "new-collection-form",
                type: "custom" as const,
                content: (
                    <div className="flex flex-col gap-2 py-1 px-2">
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            if (newCollectionName.trim()) {
                                handleSaveNewCollection();
                            }
                        }}>
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
                            <div className="flex flex-row gap-2 flex-wrap mt-2 w-full">
                                <button
                                    onClick={handleSaveNewCollection}
                                    disabled={!newCollectionName.trim()}
                                    className={`w-full flex-1 flex-grow px-3 py-1.5 rounded text-sm transition-colors flex items-center justify-center gap-2 ${
                                        newCollectionName.trim()
                                            ? 'bg-progress/80 hover:bg-progress'
                                            : 'bg-white/10 opacity-50 cursor-not-allowed'
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
                )
            }
            : {
                id: "create-collection",
                icon: "add",
                label: t("library.shared.createCollection"),
                onClick: () => setIsCreatingCollection(true),
                keepOpen: true
            };

        // Add the divider and "Create New Collection" option
        return [
            ...collectionItems,
            { id: "collections-divider", type: "divider" },
            createNewCollectionItem
        ] as MenuItemType[];
    }, [collections, isCreatingCollection, newCollectionName, handleSaveNewCollection, handleCancelNewCollection, isGameInCollection, toggleGameInCollection, getGameIdAsString, setNewCollectionName, setIsCreatingCollection, onClose]);

    const getGameState = (game: NormalizedGame | NormalizedPseudoGameJoin): Exclude<GameState['state'], 'idle'> | null => {
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
    };

    const getStateClasses = (state: Exclude<GameState['state'], 'idle'> | null): string => {
        if (!state) return '';

        const stateClasses: Record<Exclude<GameState['state'], 'idle'>, string> = {
            launching: 'text-blue-400 bg-gradient-to-l from-blue-500/50 to-transparent',
            running: 'text-green-500 hover:text-blue-400 bg-gradient-to-l from-green-500/50 hover:from-blue-500/50 to-transparent',
            stopping: 'text-blue-400 bg-gradient-to-l from-blue-500/50 to-transparent'
        };

        return stateClasses[state];
    };

    const getStateIcon = (state: Exclude<GameState['state'], 'idle'> | null): string => {
        if (!state) return isLaunchable ? 'play_arrow' : 'block';

        const stateIcons: Record<Exclude<GameState['state'], 'idle'>, string> = {
            launching: 'hourglass_top',
            running: 'check_circle',
            stopping: 'stop_circle'
        };

        return stateIcons[state];
    };

    // Get the current game state
    const currentState = getGameState(game);
    const isRunning = currentState === 'running';
    const isLaunching = currentState === 'launching';
    const isStopping = currentState === 'stopping';

    // Define menu items
    const menuItems: (MenuItemType | MenuItemWithPrefix)[] = [
        // Play/Launch button
        {
            id: "play",
            icon: isRunning ? {
                default: 'check_circle',
                hover: 'stop_circle'
            } : getStateIcon(currentState),
            label: isRunning ? {
                default: t("library.shared.gameState.running"),
                hover: t("library.shared.gameState.stop")
            } : (() => {
                const gameId = getGameIdAsString();
                if (String(gameId) === '-1' || (needsLauncher && !isLauncherRunning)) {
                    return t("library.shared.gameState.launchLauncher", { launcher: getLauncherName(game) });
                }
                if (isLaunching) return t("library.shared.gameState.launching");
                if (isStopping) return t("library.shared.gameState.stopping");
                return ['Tool', 'Application'].includes(gameType || '') ? t("library.shared.gameState.launch") : t("library.shared.gameState.play");
            })(),
            onClick: async () => {
                if (isRunning) {
                    // Stop the game
                    const gameToStop = resolveDefaultGameVendor(game);
                    const gameId = typeof gameToStop.id === 'object' ? JSON.stringify(gameToStop.id) : gameToStop.id;
                    setGameState(gameId, gameToStop.source, 'stopping');
                    const result = await window.Electron.stopGame(gameToStop.source, gameId);
                    if (!result.success) {
                        console.error('Failed to stop game:', result.error);
                    }
                    onClose();
                } else if (needsLauncher && !isLauncherRunning) {
                    // Launch the source launcher
                    await launchSourceLauncher(resolveDefaultGameVendor(game).source);
                } else {
                    // Launch the game
                    await launchGame();
                }
            },
            disabled: !isLaunchable || isLaunching || isStopping,
            className: cn(
                'transition-[background-image,color] duration-200',
                getStateClasses(currentState),
                (isLaunching || isStopping) && 'animate-pulse',
                (needsLauncher || String(game.id) === '-1') && !isLauncherRunning && !currentState && 'text-blue-400'
            ),
            icon_prefix: needsLauncher && !isLauncherRunning ? 
                resolveDefaultGameVendor(game)?.source === 'steam' ? <SiSteam className="w-4 h-4" /> :
                    resolveDefaultGameVendor(game)?.source === 'epic' ? <SiEpicgames className="w-4 h-4" /> : null
                : undefined,
            type: 'item'
        } as MenuItemWithPrefix,
        // View button
        {
            id: "view",
            icon: "visibility",
            label: t("library.contextMenu.games.viewDetails"),
            onClick: viewGame
        },
        // Divider
        {
            id: "divider-1",
            type: "divider"
        },
        // Favorites toggle
        {
            id: "favorite",
            icon: isGameInFavorites() ? "heart_broken" : "favorite",
            label: isGameInFavorites() ? t("library.shared.removeFavourite") : t("library.shared.addFavourite"),
            onClick: toggleFavorite
        },
        // Collections submenu
        {
            id: "collections",
            icon: "folder",
            label: t("library.shared.collections"),
            type: "submenu",
            items: collectionsItems
        }
    ];

    return (
        <ContextMenu
            x={x}
            y={y}
            onClose={onClose}
            items={menuItems}
            header={{
                title: gameName,
                icon: gameIcon
            }}
        />
    )
}

export default LibrarySidebarContextMenu
