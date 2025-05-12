import React, { useContext } from 'react';
import { getLocalizedGameName, LibraryContext } from '../Library';
import { Link } from 'react-router-dom';
import { SiEpicgames, SiItchdotio, SiSteam } from '@icons-pack/react-simple-icons';
import DEADCODELogo from '@/components/CustomElements/DEADCODELogo';
import { NormalizedGame, NormalizedGameJoin, NormalizedPseudoGameJoin } from '@/types';

const LibrarySidebar: React.FC = () => {
    const { games, gameJoins } = useContext(LibraryContext);

    const getSourceIcon = (source: string) => {
        switch (source) {
            case "steam":
                return <SiSteam size={16} className="!size-4 flex-shrink-0" />
            case "epic":
                return <SiEpicgames size={16} className="!size-4 flex-shrink-0" />
            case "itch":
                return <SiItchdotio size={16} className="!size-4 flex-shrink-0" />
            case "osu":
                return <img src={process.env.PUBLIC_URL + "/assets/osu!wordmark.svg"} alt="osu!" className="!size-4 flex-shrink-0" />
            case "deadforge":
                return <DEADCODELogo className="!size-4 text-sm -translate-y-0.5 flex-shrink-0" />
            default:
                return <div className="w-4 h-4 text-lg material-symbols flex-shrink-0">question_mark</div>
        }
    }
    const gameJoinsPopulated = gameJoins.map(join => {
        return {
            ...join,
            id: `join-${join.id}`,
            clients: Object.fromEntries(Object.entries(join.clients).map(([key, value]) => {
                return [key, games.find(game => String(game.id) === String(value) && game.source === key)];
            })) as unknown as Record<'steam' | 'epic' | 'itch' | 'osu' | 'deadforge', NormalizedGame>
        } as unknown as NormalizedGameJoin
    })
    
    function transformGameJoinIntoUsableFormat(join: NormalizedGameJoin): NormalizedPseudoGameJoin {
        return {
            id: String(join.id),
            source: join.clients as unknown as Record<'steam' | 'epic' | 'itch' | 'osu' | 'deadforge', NormalizedGame>,
            type: "GameJoin",
            defaultClient: join.defaultClient,
            preferences: join.preferences,
        }
    }
    return (
        <div className="pt-4 flex flex-col w-[24rem] border-0 border-r border-notQuiteBlack/10 dark:border-notQuiteWhite/10 border-solid">
            <div className="px-4 flex flex-row items-center gap-2 first:*:rounded-tl-xl mb-2">
                <Link to="/library" className="text-md text-center text-notQuiteBlack bg-notQuiteBlack/10 hover:bg-notQuiteBlack/20 dark:text-notQuiteWhite dark:bg-notQuiteWhite/10 hover:dark:bg-notQuiteWhite/20 flex-1 py-1 rounded-md transition-colors duration-200 m-0 no-underline">Home</Link>
                <Link to="/library/collections" className="text-md text-center text-notQuiteBlack bg-notQuiteBlack/10 hover:bg-notQuiteBlack/20 dark:text-notQuiteWhite dark:bg-notQuiteWhite/10 hover:dark:bg-notQuiteWhite/20 flex-1 py-1 rounded-md transition-colors duration-200 m-0 no-underline">Collections</Link>
                <div className="flex material-symbols text-notQuiteBlack dark:text-notQuiteWhite bg-notQuiteBlack/10 hover:bg-notQuiteBlack/20 dark:bg-notQuiteWhite/10 hover:dark:bg-notQuiteWhite/20 p-1 aspect-square rounded-md transition-colors duration-200 m-0 no-underline">filter_list </div>
            </div>
            <ul className="overflow-y-auto flex flex-col gap-0.5 scrollbar-gutter-both-edges px-2 pb-4">
                {[...games.filter(game => !gameJoinsPopulated.some(join => (join?.clients?.[game.source as keyof typeof join.clients] as NormalizedGame)?.id === game.id)), ...gameJoinsPopulated.map(transformGameJoinIntoUsableFormat)].sort((a, b) => {
                    const nameA = typeof a.source === 'string' ? getLocalizedGameName(a) : getLocalizedGameName(a.source[a.defaultClient]);
                    const nameB = typeof b.source === 'string' ? getLocalizedGameName(b) : getLocalizedGameName(b.source[b.defaultClient]);
                    return nameA.localeCompare(nameB);
                }).map((game) => (
                    <Link draggable={false} to={`/library/game/${typeof game.source === "object" ? "" : `${game.source}-`}${game.id}`} key={`${game.source}/${game.id}`} className="no-underline no-user-drag m-0">
                        <li className="flex flex-row items-center gap-2 p-1.5 rounded-md hover:bg-white/25 transition-colors duration-200 m-0" key={`${game.source}/${game.id}`}>
                            <img 
                                draggable={false} 
                                src={
                                    game.source === "osu" 
                                        ? `${process.env.PUBLIC_URL}/assets/osu!logo.svg` 
                                        : `local://${typeof game.source === 'string' ? game.media?.iconUrl?.replaceAll("%USERDATA%", "CONST_USERDATA") : game.source[game.defaultClient].media?.iconUrl?.replaceAll("%USERDATA%", "CONST_USERDATA")}?fallback=defaultIcon`
                                } 
                                alt={typeof game.source === 'string' ? getLocalizedGameName(game) : getLocalizedGameName(game.source[game.defaultClient])} 
                                className="w-6 h-6 no-user-drag rounded-[4px]" 
                            />
                            {typeof game.source === 'object' ? 
                                Object.entries(game.source).map(([source]) => getSourceIcon(source)) 
                                : getSourceIcon(game.source as string)}
                            <span className="truncate">
                                {typeof game.source === 'string' ? getLocalizedGameName(game) : getLocalizedGameName(game.source[game.defaultClient])}
                            </span>
                        </li>
                    </Link>
                ))}
            </ul>
            <div className="px-4 py-2.5 flex flex-row items-center justify-around gap-2 mx-4 rounded-t-xl bg-notQuiteBlack/10 dark:bg-notQuiteWhite/10 -bottom-[2.1875rem] hover:-translate-y-[2.1875rem] transition-transform backdrop-blur-3xl duration-200 fixed w-[20rem]">
                <div className="flex flex-row items-center gap-2 hover:bg-notQuiteBlack/20 dark:hover:bg-notQuiteWhite/20 p-1 rounded-md transition-colors duration-200 m-0 no-underline">
                    <span className="material-symbols">add</span>
                    <span className="text-sm mr-1">Add Games</span>
                </div>
                <div className="flex flex-row items-center gap-2 hover:bg-notQuiteBlack/20 dark:hover:bg-notQuiteWhite/20 p-1 rounded-md transition-colors duration-200 m-0 no-underline">
                    <span className="material-symbols rotate-45">link</span>
                    <span className="text-sm mr-1">Link Games</span>
                </div>
            </div>
        </div>
    );
};

export default LibrarySidebar; 