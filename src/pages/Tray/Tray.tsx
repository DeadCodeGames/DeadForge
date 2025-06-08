import React, { useEffect, useContext, useMemo } from "react";
import { Trans, useTranslation } from "react-i18next";
import { AppContext } from "@/App";
import { LibraryContext, getLocalizedGameName } from "@/pages/Library/Library";
import { resolveDefaultGameVendor } from "@/pages/Library/utils/LibraryHelpers";
import { NormalizedGame, NormalizedPseudoGameJoin } from "@/types";

const TrayItem = ({ name, icon, onClick }: { name: string | React.JSX.Element, icon?: string | React.JSX.Element, onClick: () => void }) => {
    if (typeof icon === 'string') {
        return (
            <div className="app-region-no-drag w-[calc(100%-16px)] py-2 px-2 rounded-lg text-base font-notoSans hover:bg-fullMoon hover:dark:bg-night" onClick={onClick}>{name}</div>
        )
    } else if (React.isValidElement(icon)) {
        return (
            <div className="app-region-no-drag w-[calc(100%-16px)] py-2 px-2 rounded-lg text-base font-notoSans hover:bg-fullMoon hover:dark:bg-night" onClick={onClick}>{icon}{name}</div>
        )
    } else {
        return (
            <div className="app-region-no-drag w-[calc(100%-16px)] py-2 px-2 rounded-lg text-base font-notoSans hover:bg-fullMoon hover:dark:bg-night" onClick={onClick}>{icon}{name}</div>
        )
    }
}

const TrayDivider = () => {
    return (
        <hr className="border-t border-0 border-solid dark:border-fullMoon/50 border-night/50 my-2 mx-2" />
    )
}

function getGameIcon(game: NormalizedGame | NormalizedPseudoGameJoin, customAssets: any[], curatedAssets: any[]) {
    if (game.source === "osu") {
        return `${process.env.PUBLIC_URL}/assets/osu!logo.svg`;
    }
    const gameId = typeof game.source === 'string' ? String(game.id) : String(game.source[game.defaultClient].id);
    const gameSource = typeof game.source === 'string' ? game.source : game.defaultClient;
    if (customAssets.find(asset => asset.id === gameId && asset.source === gameSource)?.media?.iconUrl) {
        return `local://${customAssets.find(asset => asset.id === gameId && asset.source === gameSource)?.media?.iconUrl.replaceAll("%USERDATA%", "CONST_USERDATA")}?fallback=defaultIcon`;
    }
    if (curatedAssets.find(asset => asset.id === gameId && asset.source === gameSource)?.media?.iconUrl) {
        return `local://${curatedAssets.find(asset => asset.id === gameId && asset.source === gameSource)?.media?.iconUrl.replaceAll("%USERDATA%", "CONST_USERDATA")}?fallback=defaultIcon`;
    }
    const iconUrl = typeof game.source === 'string' 
        ? game.media?.iconUrl 
        : game.source[game.defaultClient].media?.iconUrl;
    return `local://${iconUrl?.replaceAll("%USERDATA%", "CONST_USERDATA")}?fallback=defaultIcon`;
}

const Tray = () => {
    const { t } = useTranslation();
    const { context } = useContext(AppContext);
    const { games, gameJoins, gameStates, customAssets, curatedAssets } = useContext(LibraryContext);

    // Memo for last played games
    const lastPlayedGames = useMemo(() => {
        if (!gameStates || Object.keys(gameStates).length === 0) return [];
        // Merge games and joins
        const allGames: (NormalizedGame | NormalizedPseudoGameJoin)[] = [
            ...games.filter(game => !gameJoins.some(join => join.clients[game.source]?.id === game.id)),
            ...gameJoins.map(join => ({
                ...join,
                id: String(join.id),
                source: join.clients,
                type: "GameJoin"
            })) as NormalizedPseudoGameJoin[]
        ];
        // Helper to get lastPlayed
        const getLastPlayed = (game: NormalizedGame | NormalizedPseudoGameJoin) => {
            if (typeof game.source === 'string') return game.lastPlayed || 0;
            return Math.max(...Object.values(game.source).map(client => client?.lastPlayed || 0));
        };
        // Helper to get running state
        const isRunning = (game: NormalizedGame | NormalizedPseudoGameJoin) => {
            const ids = typeof game.source === 'string'
                ? [`${game.source}-${game.id}`]
                : Object.entries(game.source).map(([source, client]) => `${source}-${client.id}`);
            return ids.some(id => gameStates[id]?.state === 'running');
        };
        // Get all running games
        const runningGames = allGames.filter(isRunning);
        // Get non-running games, sorted by lastPlayed desc
        const nonRunningGames = allGames.filter(g => !isRunning(g)).sort((a, b) => getLastPlayed(b) - getLastPlayed(a));
        // Always show all running games, then fill up to 5 with most recent non-running
        return [...runningGames, ...nonRunningGames.slice(0, Math.max(0, 5 - runningGames.length))];
    }, [games, gameJoins, gameStates]);

    // Launch/stop logic (simplified, single-client only)
    const handleTrayGameClick = async (game: NormalizedGame | NormalizedPseudoGameJoin) => {
        const resolved = resolveDefaultGameVendor(game);
        const gameId = typeof resolved.id === 'object' ? JSON.stringify(resolved.id) : resolved.id;
        const source = resolved.source;
        const stateKey = `${source}-${gameId}`;
        const isRunning = gameStates[stateKey]?.state === 'running';
        if (isRunning) {
            // Stop
            window.Electron.sendTrayChoice({ type: 'stop', source, gameId });
        } else {
            // Launch (use first launch option)
            const option = resolved.launchOptions?.[0];
            if (option) {
                window.Electron.sendTrayChoice({ type: 'launch', source, gameId, executable: option.executable, arguments: option.arguments });
            }
        }
    };

    useEffect(() => {
        window.Electron.onTrayGetContentsHeight(async () => {
            return (document.querySelector("div#root") as HTMLElement).offsetHeight;
        });

        const trayResizeObserver = new ResizeObserver(() => {
            window.Electron.sendTrayResize((document.querySelector("div#root") as HTMLElement).offsetWidth, (document.querySelector("div#root") as HTMLElement).offsetHeight);
        })

        trayResizeObserver.observe(document.querySelector("div#root") as HTMLElement);
    })

    useEffect(() => {
        document.documentElement.classList.add(context.preferences.theme === 'dark' ? 'dark' : 'light');
        document.documentElement.classList.remove(context.preferences.theme === 'dark' ? 'light' : 'dark');
    }, [context.preferences.theme]);
    
    return (
        <div className="app-region-drag w-[calc(100vw-16px)] h-full dark:bg-notQuiteBlack bg-notQuiteWhite dark:text-notQuiteWhite text-notQuiteBlack font-notoSans flex flex-col p-2">
            {/* Last Played Section */}
            {lastPlayedGames.length > 0 && (
                <>
                    <div className="flex flex-col gap-1">
                        {lastPlayedGames.map((game, idx) => {
                            const resolved = resolveDefaultGameVendor(game);
                            return (
                                <div key={idx} className="flex items-center gap-2 app-region-no-drag py-2 px-2 rounded-lg text-base font-notoSans hover:bg-fullMoon hover:dark:bg-night cursor-pointer" onClick={() => handleTrayGameClick(game)}>
                                    <img src={getGameIcon(game, customAssets, curatedAssets)} alt="icon" className="w-6 h-6 rounded mr-1" />
                                    <span className="flex-1 truncate">{getLocalizedGameName(resolved)}</span>
                                </div>
                            );
                        })}
                    </div>
                    <TrayDivider />
                </>
            )}
            <TrayItem name={t('sidebar.home')} icon="home" onClick={() => { window.Electron.sendTrayChoice({ type: 'navigate', destination: '/' }) }} />
            <TrayItem name={t('sidebar.library')} icon="apps" onClick={() => { window.Electron.sendTrayChoice({ type: 'navigate', destination: '/library' }) }} />
            <TrayItem name={<Trans i18nKey="tray.arcade" components={[<span className="font-uniSansCAPS font-bold" key="DEADFORGE">DEADFORGE</span>,<span className="font-uniSansCAPS" key="ARCADE">ARCADE</span>]} />} onClick={() => { window.Electron.sendTrayChoice({ type: 'navigate', destination: '/arcade' })}} />
            <TrayItem name={t('sidebar.store')} icon="store" onClick={() => { window.Electron.sendTrayChoice({ type: 'navigate', destination: '/store' }) }} />
            <TrayItem name={t('sidebar.settings')} icon="settings" onClick={() => { window.Electron.sendTrayChoice({ type: 'navigate', destination: '/settings' }) }} />
            <TrayDivider />
            <TrayItem name={<Trans i18nKey="tray.exit"><span className="font-uniSansCAPS font-bold">DEADFORGE</span></Trans>} icon="logout" onClick={() => window.Electron.sendTrayChoice({ type: 'exit' })} />
            <hr />
        </div>
    )
}

export default Tray;