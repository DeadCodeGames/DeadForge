import type React from "react"
import { useState, useEffect } from "react"
import type { NormalizedGame } from "@/types"
import { cn } from "@/lib/utils"
import { X, ImageIcon, Settings, Search, ChevronDown } from "lucide-react"
import { getLocalizedGameName } from "@/pages/Library/Library"
import { languageDisplayNames } from "@/types"
import { Select, SelectOption } from "../../../components/CustomElements/Select"

interface GameSettingsModalProps {
  open: boolean
  onClose: () => void
  game: NormalizedGame
}

interface TabConfig {
  id: string
  label: string
  icon: React.ReactNode
}

const tabs: TabConfig[] = [
    {
        id: "assets",
        label: "Assets",
        icon: <ImageIcon size={16} />,
    },
    {
        id: "settings",
        label: "Game Settings",
        icon: <Settings size={16} />,
    },
]

const logoPositions = [
    { value: "BottomLeft", label: "Bottom Left" },
    { value: "CenterCenter", label: "Center" },
    { value: "UpperCenter", label: "Top Center" },
    { value: "BottomCenter", label: "Bottom Center" },
]

// simpler version to process the preview style
export function getLogoStyles(logoObj: any): React.CSSProperties {
    if (!logoObj) return {}
    if (!logoObj.logo_position) return {width: "50%", height: "50%", position: "absolute", bottom: 0, left: 0, objectPosition: "bottom left"}

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

const GameSettingsModal: React.FC<GameSettingsModalProps> = ({ open, onClose, game }) => {
    const [activeTab, setActiveTab] = useState("assets")
    const [gameSettings, setGameSettings] = useState({
        customName: "",
        localizedNames: {} as Record<string, string>,
        customIcon: "",
        customBanner: "",
        customLogo: "",
        logoPosition: "BottomLeft",
        logoWidth: 100,
        logoHeight: 100,
        showInLibrary: true,
    })

    const [languageSearch, setLanguageSearch] = useState("")
    const [showLanguageDropdown, setShowLanguageDropdown] = useState(false)
    const [selectedLanguages, setSelectedLanguages] = useState<string[]>(["en"])

    const inactiveClasses = "pointer-events-none scale-90 opacity-0"
    const activeClasses = "pointer-events-auto scale-100 opacity-100"
    const inactiveBackdropClasses = "pointer-events-none opacity-0"
    const activeBackdropClasses = "pointer-events-auto opacity-100"

    useEffect(() => {
        if (open && game) {
            // Initialize settings with current game data
            setGameSettings((prev) => ({
                ...prev,
                customName: typeof game.name === "object" ? game.name.default : game.name || "",
                localizedNames: typeof game.name === "object" ? { ...game.name } : { en: game.name || "" },
            }))

            // Set selected languages based on existing localized names
            if (typeof game.name === "object") {
                setSelectedLanguages(Object.keys(game.name).filter((lang) => typeof game.name === "object" ? game.name[lang] : game.name))
            }
        }
    }, [open, game])

    const handleSave = async () => {
    // Implement save logic here
        console.log("Saving game settings:", gameSettings)
        onClose()
    }

    const handleBrowseFile = async (type: "icon" | "banner" | "logo") => {
        try {
            const { canceled, filePaths } = await window.Electron.showOpenDialog({
                properties: ["openFile"],
                filters: [{ name: "Image Files", extensions: ["png", "jpg", "jpeg", "webp", "gif"] }],
            })

            if (!canceled && filePaths[0]) {
                setGameSettings((prev) => ({
                    ...prev,
                    [`custom${type.charAt(0).toUpperCase() + type.slice(1)}`]: filePaths[0],
                }))
            }
        } catch (error) {
            console.error("Failed to browse file:", error)
        }
    }

    const filteredLanguages = Object.entries(languageDisplayNames).filter(
        ([code, name]) =>
            name.toLowerCase().includes(languageSearch.toLowerCase()) ||
      code.toLowerCase().includes(languageSearch.toLowerCase()),
    )

    const toggleLanguage = (langCode: string) => {
        setSelectedLanguages((prev) => {
            if (prev.includes(langCode)) {
                return prev.filter((code) => code !== langCode)
            } else {
                return [...prev, langCode]
            }
        })
    }


    const renderAssetsTab = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Custom Icon */}
                <div className="space-y-3">
                    <label className="block font-montserrat text-sm font-medium">Custom Icon</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={gameSettings.customIcon}
                            onChange={(e) => setGameSettings((prev) => ({ ...prev, customIcon: e.target.value }))}
                            className="flex-1 bg-night border border-night/60 rounded px-3 py-2 font-consolas text-sm focus:outline-none focus:border-cornflowerBlue"
                            placeholder="Path to custom icon file"
                        />
                        <button
                            onClick={() => handleBrowseFile("icon")}
                            className="bg-progress hover:bg-progress/80 text-fullMoon px-4 py-2 rounded font-montserrat"
                        >
              Browse
                        </button>
                    </div>
                    <p className="text-xs text-notQuiteWhite/70">Recommended: 256px×256px PNG</p>
                </div>

                {/* Custom Banner */}
                <div className="space-y-3">
                    <label className="block font-montserrat text-sm font-medium">Custom Banner</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={gameSettings.customBanner}
                            onChange={(e) => setGameSettings((prev) => ({ ...prev, customBanner: e.target.value }))}
                            className="flex-1 bg-night border border-night/60 rounded px-3 py-2 font-consolas text-sm focus:outline-none focus:border-cornflowerBlue"
                            placeholder="Path to custom banner file"
                        />
                        <button
                            onClick={() => handleBrowseFile("banner")}
                            className="bg-progress hover:bg-progress/80 text-fullMoon px-4 py-2 rounded font-montserrat"
                        >
              Browse
                        </button>
                    </div>
                    <p className="text-xs text-notQuiteWhite/70">Recommended: 1920px×620px JPG/PNG</p>
                </div>
            </div>

            {/* Custom Logo */}
            <div className="space-y-3">
                <label className="block font-montserrat text-sm font-medium">Custom Logo</label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={gameSettings.customLogo}
                        onChange={(e) => setGameSettings((prev) => ({ ...prev, customLogo: e.target.value }))}
                        className="flex-1 bg-night border border-night/60 rounded px-3 py-2 font-consolas text-sm focus:outline-none focus:border-cornflowerBlue"
                        placeholder="Path to custom logo file"
                    />
                    <button
                        onClick={() => handleBrowseFile("logo")}
                        className="bg-progress hover:bg-progress/80 text-fullMoon px-4 py-2 rounded font-montserrat"
                    >
            Browse
                    </button>
                </div>
                <p className="text-xs text-notQuiteWhite/70">Recommended: Transparent PNG</p>
            </div>

            {/* Logo Positioning */}
            <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col gap-3">
                    <label className="block font-montserrat text-sm font-medium">Logo Position</label>
                    <Select
                        value={gameSettings.logoPosition}
                        onChange={(value) => setGameSettings((prev) => ({ ...prev, logoPosition: value }))}
                        className="w-[calc(100%-0.25rem)] bg-night border border-night/60 rounded pl-1 font-montserrat text-sm focus:outline-none focus:border-cornflowerBlue [&>.absolute]:-translate-y-4 [&>.absolute]:-translate-x-1"
                    >
                        {logoPositions.map((pos) => (
                            <SelectOption key={pos.value} value={pos.value}>
                                {pos.label}
                            </SelectOption>
                        ))}
                    </Select>
                </div>

                <div className="flex flex-col gap-3">
                    <label className="block font-montserrat text-sm font-medium">Logo Width (%)</label>
                    <input
                        type="number"
                        min="10"
                        max="100"
                        value={gameSettings.logoWidth}
                        onChange={(e) =>
                            setGameSettings((prev) => ({
                                ...prev,
                                logoWidth: Math.max(10, Math.min(100, Number.parseInt(e.target.value) || 10)),
                            }))
                        }
                        className="w-[calc(100%-1.5rem)] bg-night border border-night/60 rounded px-3 py-2.5 font-montserrat text-sm focus:outline-none focus:border-cornflowerBlue"
                        placeholder="100"
                    />
                    <p className="text-xs text-notQuiteWhite/70">Range: 10-100%</p>
                </div>

                <div className="flex flex-col gap-3">
                    <label className="block font-montserrat text-sm font-medium">Logo Height (%)</label>
                    <input
                        type="number"
                        min="10"
                        max="100"
                        value={gameSettings.logoHeight}
                        onChange={(e) =>
                            setGameSettings((prev) => ({
                                ...prev,
                                logoHeight: Math.max(10, Math.min(100, Number.parseInt(e.target.value) || 10)),
                            }))
                        }
                        className="w-[calc(100%-1.5rem)] bg-night border border-night/60 rounded px-3 py-2.5 font-montserrat text-sm focus:outline-none focus:border-cornflowerBlue"
                        placeholder="100"
                    />
                    <p className="text-xs text-notQuiteWhite/70">Range: 10-100%</p>
                </div>
            </div>

            {/* Combined Preview */}
            <div className="border border-night/60 rounded-lg p-4">
                <h4 className="font-montserrat text-sm font-medium mb-3">Banner + Logo Preview</h4>
                <div className="relative w-full h-48 bg-night/50 rounded-lg overflow-hidden">
                    {/* Banner Background */}
                    {gameSettings.customBanner ? (
                        <img
                            src={`local://${gameSettings.customBanner}`}
                            alt="Banner preview"
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-r from-night via-night/80 to-night flex items-center justify-center">
                            <span className="text-notQuiteWhite/50 text-sm">Banner Preview</span>
                        </div>
                    )}

                    {/* Logo Overlay */}
                    {gameSettings.customLogo && (
                        <div className="absolute box-border inset-0">
                            <div className="relative w-[calc(100%-1.5rem)] h-[calc(100%-1rem)] px-3 py-2">
                                <div className="relative w-full h-full">
                                    <img
                                        src={`local://${gameSettings.customLogo}`}
                                        alt="Logo preview"
                                        style={getLogoStyles({
                                            logo_position: {
                                                pinned_position: gameSettings.logoPosition,
                                                width_pct: gameSettings.logoWidth,
                                                height_pct: gameSettings.logoHeight,
                                            },
                                        })}
                                        className="object-scale-down"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
                </div>
            </div>
        </div>
    )

    const renderSettingsTab = () => (
        <div className="space-y-6">
            {/* Game Title */}
            <div className="space-y-3">
                <label className="block font-montserrat text-sm font-medium">Custom Game Title</label>
                <input
                    type="text"
                    value={gameSettings.customName}
                    onChange={(e) => setGameSettings((prev) => ({ ...prev, customName: e.target.value }))}
                    className="w-full bg-night border border-night/60 rounded px-3 py-2 font-montserrat text-sm focus:outline-none focus:border-cornflowerBlue"
                    placeholder={getLocalizedGameName(game)}
                />
                <p className="text-xs text-notQuiteWhite/70">Override the default game title</p>
            </div>

            {/* Library Visibility */}
            <div className="space-y-3">
                <label className="block font-montserrat text-sm font-medium">Library Settings</label>
                <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={gameSettings.showInLibrary}
                        onChange={(e) => setGameSettings((prev) => ({ ...prev, showInLibrary: e.target.checked }))}
                        className="w-4 h-4 accent-progress"
                    />
                    <span className="font-montserrat text-sm">Show in Library</span>
                </label>
                <p className="text-xs text-notQuiteWhite/70">Hide this game from your main library view</p>
            </div>

            {/* Localized Names */}
            <div className="space-y-3">
                <label className="block font-montserrat text-sm font-medium">Localized Names</label>

                {/* Language Selection */}
                <div className="relative">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                value={languageSearch}
                                onChange={(e) => setLanguageSearch(e.target.value)}
                                onFocus={() => setShowLanguageDropdown(true)}
                                className="w-full bg-night border border-night/60 rounded px-3 py-2 pl-8 font-montserrat text-sm focus:outline-none focus:border-cornflowerBlue"
                                placeholder="Search languages..."
                            />
                            <Search
                                size={14}
                                className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-notQuiteWhite/50"
                            />
                        </div>
                        <button
                            onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                            className="bg-night border border-night/60 rounded px-3 py-2 hover:bg-night/80 transition-colors"
                        >
                            <ChevronDown size={16} className={cn("transition-transform", showLanguageDropdown && "rotate-180")} />
                        </button>
                    </div>

                    {/* Language Dropdown */}
                    {showLanguageDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-night border border-night/60 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                            {filteredLanguages.map(([code, name]) => (
                                <label key={code} className="flex items-center space-x-2 px-3 py-2 hover:bg-night/80 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selectedLanguages.includes(code)}
                                        onChange={() => toggleLanguage(code)}
                                        className="w-4 h-4 accent-progress"
                                    />
                                    <span className="font-montserrat text-sm">{name}</span>
                                </label>
                            ))}
                        </div>
                    )}
                </div>

                {/* Selected Languages Input Fields */}
                <div className="space-y-3 max-h-64 overflow-y-auto">
                    {selectedLanguages.map((langCode) => (
                        <div key={langCode} className="flex gap-2 items-center">
                            <span className="text-xs text-notQuiteWhite/70 w-24 flex-shrink-0">
                                {languageDisplayNames[langCode]?.split(" ")[0] || langCode}:
                            </span>
                            <input
                                type="text"
                                value={gameSettings.localizedNames[langCode] || ""}
                                onChange={(e) =>
                                    setGameSettings((prev) => ({
                                        ...prev,
                                        localizedNames: {
                                            ...prev.localizedNames,
                                            [langCode]: e.target.value,
                                        },
                                    }))
                                }
                                className="flex-1 bg-night border border-night/60 rounded px-2 py-1 font-montserrat text-sm focus:outline-none focus:border-cornflowerBlue"
                                placeholder={`Game name in ${languageDisplayNames[langCode]?.split(" ")[0] || langCode}`}
                            />
                            <button
                                onClick={() => toggleLanguage(langCode)}
                                className="text-red-400 hover:text-red-300 p-1"
                                title="Remove language"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )

    const renderTabContent = () => {
        switch (activeTab) {
            case "assets":
                return renderAssetsTab()
            case "settings":
                return renderSettingsTab()
            default:
                return renderAssetsTab()
        }
    }

    return (
        <div
            className={`fixed inset-0 bg-black/80 flex items-center justify-center z-40 transition-opacity duration-300 ease-in-out ${open ? activeBackdropClasses : inactiveBackdropClasses}`}
        >
            <div
                className={`bg-notQuiteBlack text-fullMoon rounded-lg w-full max-w-4xl max-h-[90vh] shadow-xl transition-transform duration-300 ease-in-out ${open ? activeClasses : inactiveClasses}`}
            >
                {/* Header */}
                <div className="p-6 pb-0 border-b border-night">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-uniSansCAPS">Game Settings</h2>
                            <p className="text-notQuiteWhite/80 font-montserrat mt-1">
                Configure settings for {getLocalizedGameName(game)}
                            </p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-night/50 rounded-lg transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="px-6 pt-4">
                    <div className="flex space-x-1 bg-night/50 rounded-lg p-1">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-md font-montserrat text-sm transition-all duration-200",
                                    activeTab === tab.id
                                        ? "bg-progress text-fullMoon shadow-sm"
                                        : "text-notQuiteWhite/70 hover:text-fullMoon hover:bg-night/50",
                                )}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">{renderTabContent()}</div>

                {/* Footer */}
                <div className="flex justify-between items-center p-6 pt-4 border-t border-night">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-notQuiteWhite/80 hover:text-fullMoon font-montserrat transition-colors"
                    >
            Cancel
                    </button>
                    <div className="flex gap-3">
                        <button
                            onClick={() => {
                                // Reset to defaults
                                setGameSettings({
                                    customName: "",
                                    localizedNames: {},
                                    customIcon: "",
                                    customBanner: "",
                                    customLogo: "",
                                    logoPosition: "BottomLeft",
                                    logoWidth: 100,
                                    logoHeight: 100,
                                    showInLibrary: true,
                                })
                                setSelectedLanguages(["en"])
                            }}
                            className="px-4 py-2 bg-night hover:bg-night/80 text-fullMoon rounded font-montserrat transition-colors"
                        >
              Reset
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-6 py-2 bg-progress hover:bg-progress/80 text-fullMoon rounded font-montserrat transition-colors"
                        >
              Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default GameSettingsModal
