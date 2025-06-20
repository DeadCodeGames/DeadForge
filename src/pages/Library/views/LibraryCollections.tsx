import type React from "react"
import { useContext, useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { LibraryContext } from "../Library"
import type { Collection } from "@/types"
import { cn } from "@/lib/utils"
import { useTranslation } from "react-i18next"

type SortField = "name" | "gameCount" | "dateCreated"
type SortDirection = "asc" | "desc"

const LibraryCollections: React.FC = () => {
    const { collections, setCollections, favourites, setFavourites } = useContext(LibraryContext)
    const navigate = useNavigate()
    const [newCollectionName, setNewCollectionName] = useState("")
    const [isCreating, setIsCreating] = useState(false)
    const [sortField, setSortField] = useState<SortField>("name")
    const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editingName, setEditingName] = useState("");
    const { t } = useTranslation()

    const handleCreateCollection = () => {
        if (newCollectionName.trim() === "") return

        const newCollection: Collection = {
            id: Date.now().toString(),
            name: newCollectionName.trim(),
            games: []
        }

        setCollections((prev) => {
            if (!Array.isArray(prev)) {
                return [newCollection]
            }
            return [...prev, newCollection]
        })

        setNewCollectionName("")
        setIsCreating(false)
    }

    const handleDeleteCollection = (collectionId: string) => {
        setCollections((prev) => prev.filter((collection) => collection.id !== collectionId))
    }

    const handleClearFavorites = () => {
        setFavourites([])
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault()
            if (newCollectionName.trim()) {
                handleCreateCollection()
            }
        } else if (e.key === "Escape") {
            e.preventDefault()
            setNewCollectionName("")
            setIsCreating(false)
        }
    }

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc")
        } else {
            setSortField(field)
            setSortDirection("asc")
        }
    }

    const handleRenameCollection = (collectionId: string, newName: string) => {
        if (newName.trim() === "") return
        
        setCollections((prev) => prev.map((collection) => 
            collection.id === collectionId 
                ? { ...collection, name: newName.trim() }
                : collection
        ))
        setEditingId(null)
        setEditingName("")
    }

    const allCollections = useMemo(() => {
        const favoritesCollection = {
            id: "favorites",
            name: t('library.shared.favourites'),
            games: favourites,
            isFavorites: true
        }

        if (!Array.isArray(collections)) return [favoritesCollection];

        return [favoritesCollection, ...collections].sort((a, b) => {
            if (a.id === "favorites") return -1
            if (b.id === "favorites") return 1

            let aValue: string | number
            let bValue: string | number

            switch (sortField) {
                case "name":
                    aValue = a.name.toLowerCase()
                    bValue = b.name.toLowerCase()
                    break
                case "gameCount":
                    aValue = a.games.length
                    bValue = b.games.length
                    break
                default:
                    return 0
            }

            if (aValue < bValue) return sortDirection === "asc" ? -1 : 1
            if (aValue > bValue) return sortDirection === "asc" ? 1 : -1
            return 0
        })
    }, [collections, favourites, sortField, sortDirection])

    const SortButton: React.FC<{ field: SortField; children: React.ReactNode }> = ({ field, children }) => (
        <button
            onClick={() => handleSort(field)}
            className="flex items-center gap-1.5 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors group"
        >
            <span className={cn("font-semibold text-sm text-neutral-500 dark:text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-neutral-100 transition-colors", sortField === field && "text-neutral-900 dark:text-neutral-100")}>
                {children}
            </span>
            <span
                className={cn(
                    "material-symbols w-5 h-5 text-xl",
                    sortField === field
                        ? "text-progress"
                        : "text-neutral-400/50"
                )}
            >
                {sortField === field
                    ? sortDirection === "asc"
                        ? "expand_less"
                        : "expand_more"
                    : "unfold_more"}
            </span>
        </button>
    )

    const CollectionRow: React.FC<{ collection: Collection & { isFavorites?: boolean } }> = ({ collection }) => (
        <div
            className="group grid grid-cols-[24px_minmax(200px,14fr)_minmax(120px,8fr)_minmax(100px,4fr)] items-center gap-4 p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 border-solid border-0 border-t border-neutral-100 dark:border-neutral-800 cursor-pointer transition-colors"
            onClick={(e) => {
                if (editingId === collection.id) {
                    e.stopPropagation()
                    return
                }
                navigate(collection.isFavorites ? "/library/favourites" : `/library/collection/${collection.id}`)
            }}
        >
            <div className="flex items-center justify-center gap-1 h-fit">
                <span className="material-symbols text-2xl w-fit h-fit text-neutral-500 dark:text-neutral-400 flex-shrink-0">
                    {collection.isFavorites ? "favorite" : "folder"}
                </span>
            </div>
            <div className="flex items-center gap-3 min-w-0">
                {editingId === collection.id && !collection.isFavorites ? (
                    <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                            e.stopPropagation()
                            if (e.key === "Enter") {
                                handleRenameCollection(collection.id, editingName)
                            } else if (e.key === "Escape") {
                                setEditingId(null)
                                setEditingName("")
                            }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded px-2 py-1 text-sm w-full"
                        autoFocus
                        maxLength={32}
                    />
                ) : (
                    <span className="font-medium text-neutral-900 dark:text-neutral-100 truncate">{collection.name}</span>
                )}
            </div>

            <div className="flex items-center">
                <span className="text-neutral-600 dark:text-neutral-400">{t('library.collectionsView.gameCount', {count: collection.games.length})}</span>
            </div>

            <div className="flex items-center justify-start gap-1">
                {editingId === collection.id && !collection.isFavorites ? (
                    <>
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                handleRenameCollection(collection.id, editingName)
                            }}
                            className="opacity-100 transition-opacity p-1.5 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-md"
                        >
                            <span className="material-symbols text-xl w-fit h-fit text-green-500 flex">check</span>
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                setEditingId(null)
                                setEditingName("")
                            }}
                            className="opacity-100 transition-opacity p-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-md"
                        >
                            <span className="material-symbols text-xl w-fit h-fit text-neutral-500 flex">close</span>
                        </button>
                    </>
                ) : (
                    <>
                        {!collection.isFavorites && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setEditingId(collection.id)
                                    setEditingName(collection.name)
                                }}
                                className="opacity-100 p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md"
                            >
                                <span className="material-symbols text-xl w-fit h-fit text-progress flex">edit</span>
                            </button>
                        )}
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                if (collection.isFavorites) {
                                    if (window.confirm("Are you sure you want to clear all favorites?")) {
                                        handleClearFavorites()
                                    }
                                } else {
                                    if (window.confirm(`Are you sure you want to delete "${collection.name}" collection?`)) {
                                        handleDeleteCollection(collection.id)
                                    }
                                }
                            }}
                            className={cn("opacity-100 p-1.5 rounded-md", collection.isFavorites ? "hover:bg-orange-50 dark:hover:bg-orange-900/20" : "hover:bg-red-50 dark:hover:bg-red-900/20")}
                        >
                            <span className={cn("material-symbols text-xl w-fit h-fit flex", collection.isFavorites ? "text-orange-500" : "text-red-500")}>
                                {collection.isFavorites ? "delete_sweep" : "delete"}
                            </span>
                        </button>
                    </>
                )}
            </div>
        </div>
    )

    return (
        <div className="h-full w-full overflow-y-auto flex-1">
            <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">{t('library.shared.collections')}</h1>
                        <p className="text-neutral-600 dark:text-neutral-400">{t('library.collectionsView.description')}</p>
                    </div>

                    <button
                        onClick={() => setIsCreating(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-progress/80 hover:bg-progress/100 text-white rounded-lg transition-colors text-sm font-medium"
                    >
                        <span className="material-symbols text-2xl w-fit h-fit">add</span>
                        {t('library.collectionsView.new')}
                    </button>
                </div>

                {/* Create new collection form */}
                {isCreating && (
                    <div className="mb-6 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
                        <h3 className="text-2xl font-medium mb-3 text-neutral-900 dark:text-neutral-100">{t('library.shared.createCollection')}</h3>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newCollectionName}
                                onChange={(e) => setNewCollectionName(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={t('library.shared.collectionNamePlaceholder')}
                                className="flex-1 px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-600 rounded-md outline-none focus:ring-2 focus:ring-progress focus:border-transparent text-sm"
                                maxLength={32}
                                autoFocus
                            />
                            <button
                                onClick={handleCreateCollection}
                                disabled={!newCollectionName.trim()}
                                className={cn(
                                    "px-3 py-2 rounded-md transition-colors flex items-center gap-1.5 text-sm font-medium",
                                    newCollectionName.trim()
                                        ? "bg-progress/80 hover:bg-progress/100 text-white"
                                        : "bg-neutral-300 dark:bg-neutral-600 text-neutral-500 cursor-not-allowed",
                                )}
                            >
                                <span className="material-symbols text-2xl w-fit h-fit">check</span>
                                {t('library.shared.createCollectionConfirm')}
                            </button>
                            <button
                                onClick={() => {
                                    setNewCollectionName("")
                                    setIsCreating(false)
                                }}
                                className="px-3 py-2 bg-neutral-300 dark:bg-neutral-600 hover:bg-neutral-400 dark:hover:bg-neutral-500 text-neutral-700 dark:text-neutral-300 rounded-md transition-colors flex items-center gap-1.5 text-sm font-medium"
                            >
                                <span className="material-symbols text-2xl w-fit h-fit">close</span>
                                {t('library.shared.createCollectionCancel')}
                            </button>
                        </div>
                    </div>
                )}

                {/* Collections Table */}
                {allCollections.length > 0 ? (
                    <div className="bg-white dark:bg-neutral-900 rounded-lg border border-solid border-notQuiteBlack/25 dark:border-notQuiteWhite/25 overflow-hidden">
                        {/* Table Header */}
                        <div className="grid grid-cols-[24px_minmax(200px,14fr)_minmax(120px,8fr)_minmax(100px,4fr)] gap-4 p-4 bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
                            <div />
                            <div className="flex items-center">
                                <SortButton field="name">
                                    {t('library.collectionsView.header.name')}
                                </SortButton>
                            </div>
                            <div className="flex items-center">
                                <SortButton field="gameCount">
                                    {t('library.collectionsView.header.gameCount')}
                                </SortButton>
                            </div>
                            <div>
                                <span className="font-semibold text-neutral-500 dark:text-neutral-400">
                                    {t('library.collectionsView.header.actions')}
                                </span>
                            </div>
                        </div>

                        {/* Table Body */}
                        <div>
                            {allCollections.map((collection) => (
                                <CollectionRow key={collection.id} collection={collection} />
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-center">
                        <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-4">
                            <span className="material-symbols text-2xl w-8 h-8 text-neutral-400">folder</span>
                        </div>
                        <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">{t('library.collectionsView.noCollections')}</h3>
                        <p className="text-neutral-600 dark:text-neutral-400 mb-4">{t('library.collectionsView.noCollectionsDescription')}</p>
                        <button
                            onClick={() => setIsCreating(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-progress/80 hover:bg-progress/100 text-white rounded-lg transition-colors text-sm font-medium"
                        >
                            <span className="material-symbols text-2xl w-fit h-fit">add</span>
                            {t('library.collectionsView.noCollectionsCTA')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

export default LibraryCollections
