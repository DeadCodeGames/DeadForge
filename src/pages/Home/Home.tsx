import React, { useEffect, useMemo, useState, useContext, useCallback } from 'react';
import { LibraryContext } from '../Library/Library';
import { Article, NormalizedGame, NormalizedGameJoin, NormalizedPseudoGameJoin } from '../../types';
import { format } from 'date-fns';
import MarkdownText from '@/components/CustomElements/MarkdownText';
import i18n, { dateFNSResources } from '@/locales/i18n';
import { Trans, useTranslation } from 'react-i18next';
import { useMediaQuery } from "react-responsive"
import Tooltip from '@/components/CustomElements/Tooltip';
import GameCard from '../Library/components/GameCard';

const Home = () => {
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { games, gameJoins, favourites, launchTimestamps } = useContext(LibraryContext)

    const { t } = useTranslation();

    const isWideEnoughForHorizontalGameCardsUwU = useMediaQuery({ query: '(min-width: 1536px)' })

    useEffect(() => {
        const fetchArticles = async () => {
            try {
                // First try to update articles
                window.Electron.updateArticles().then(async (res) => {
                    if (res.success) {
                        try {
                            const updatedArticles = await window.Electron.getArticles()
                            setArticles(updatedArticles.articles);
                            setError(null)
                        } catch (error) {
                            setError('Failed to load articles');
                        }
                    } else if (res.error) {
                        setError(res.error);
                    }
                });

                // Get articles regardless of update success
                const result = await window.Electron.getArticles();
                console.log(result)
                setArticles(result.articles);
                setError(null);
            } catch (err) {
                setError('Failed to load articles');
                console.error('Error loading articles:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchArticles();
    }, []);

    const transformGameJoinIntoUsableFormat = useCallback((join: NormalizedGameJoin): NormalizedPseudoGameJoin => {
        return {
            id: String(join.id),
            source: join.clients as unknown as Record<'steam' | 'epic' | 'itch' | 'osu' | 'deadforge', NormalizedGame>,
            type: "GameJoin",
            defaultClient: join.defaultClient,
            preferences: join.preferences,
        }
    }, [])

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

    const recentGames = useMemo(() => {
        const allGames = [
            ...games.filter(game => gameJoinsPopulated.some(join => join.clients[game.source]?.id !== game.id) && String(game.id) !== "-1"),
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
            .filter(({ lastPlayed }) => lastPlayed > 0)
            .sort((a, b) => b.lastPlayed - a.lastPlayed);
    }, [games, gameJoinsPopulated, launchTimestamps]);

    console.log(recentGames);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-neutral-900 dark:border-white"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen text-red-600">
                <h2 className="text-xl font-bold mb-2">Error</h2>
                <p>{error}</p>
            </div>
        );
    }

    return (
        <div className="w-[calc(100%-2.5rem)] flex flex-col-reverse 2xl:flex-row h-full py-6 2xl:py-0 px-6 2xl:pr-4 bg-fullMoon dark:bg-night overflow-y-auto 2xl:overflow-y-hidden">
            <div className='flex flex-col w-full 2xl:max-w-[calc(100%-257px)] gap-y-4 overflow-y-auto pt-4 2xl:pt-6 py-6 pr-6 border-0 border-solid border-notQuiteBlack/20 dark:border-notQuiteWhite/20 2xl:border-r h-[calc(100%-3rem)]'>
                <h1 className="font-bold text-3xl pl-2 font-heading">
                    <Trans
                        i18nKey="home.newsAndUpdatesHeader"
                        components={{ bold: <span className="font-uniSansCAPS font-bold" /> }}
                    />
                </h1>
                <div className='space-y-6'>
                    {articles.map((article) => (
                        <article
                            key={article.slug}
                            className="bg-white dark:bg-neutral-800 rounded-2xl shadow-lg overflow-hidden"
                        >
                            <img
                                src={`local://${article.bannerImage.replace("%USERDATA%", "CONST_USERDATA")}`}
                                alt={article.title}
                                className="w-full h-64 object-cover"
                            />
                            <div className="p-8">
                                <h1 className="text-4xl font-bold mb-6 flex flex-row gap-6 items-center font-heading">
                                    {article.title}
                                    {/* Tags */}
                                    <div className="flex flex-wrap gap-2 items-center justify-end -mt-0.5">
                                        {article.tags.map((tag) => (
                                            <span
                                                key={tag}
                                                className="px-3 py-1 bg-neutral-200 dark:bg-neutral-700 rounded-full text-sm inline-flex flex-row font-montserrat uppercase text-nowrap"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </h1>
                                <div className="flex flex-row gap-2 mb-6">
                                    {/* Profile pictures row */}
                                    <div className="flex -space-x-4 hover:-space-x-1 *:transition-[margin] duration-200 ease-in-out">
                                        {article.authors.map((author) => (
                                            <Tooltip key={author.name} content={author.name}>
                                                <img
                                                    key={author.name}
                                                    src={`local://${author.profilePicture.replace("%USERDATA%", "CONST_USERDATA")}`}
                                                    alt={author.name}
                                                    className="w-10 h-10 -my-1 rounded-full border-4 border-solid border-white dark:border-neutral-800"
                                                />
                                            </Tooltip>
                                        ))}
                                    </div>
                                    <div className="flex flex-col">
                                        {/* Author names row */}
                                        <div className="inline">
                                            <Trans i18nKey="home.articles.writtenBy" count={article.authors.length}>
                                                <>
                                                    {article.authors.map((author, index) => (
                                                        <React.Fragment key={author.name}>
                                                            <a
                                                                href={author.link}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-blue-600 dark:text-blue-400 no-underline hover:underline font-medium m-0"
                                                            >
                                                                {author.name}
                                                            </a>
                                                            <span className="text-neutral-600 dark:text-neutral-400">{index < article.authors.length - 1 ? (index < article.authors.length - 2 ? t('commaSeparator') : t('ampersandSeparator')) : ""}</span>
                                                        </React.Fragment>
                                                    ))}
                                                </>
                                            </Trans>
                                        </div>
                                        {/* Dates */}
                                        <div className="text-xs text-neutral-600 dark:text-neutral-400">
                                            {t('home.articles.publishedOn', { date: format(new Date(article.publishDate), 'PPPp', { locale: dateFNSResources[i18n.language as keyof typeof dateFNSResources] }) })}
                                            {article.lastModified && article.publishDate !== article.lastModified && (
                                                <>{t('commaSeparator')}{t('home.articles.lastEditedOn', { date: format(new Date(article.lastModified), 'PPPp', { locale: dateFNSResources[i18n.language as keyof typeof dateFNSResources] }) })}</>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="">
                                    <MarkdownText mediaMap={article.assetsMap} className='font-notoSans'>
                                        {article.content}
                                    </MarkdownText>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            </div>
            <div className='flex flex-col gap-2 2xl:w-[216px] overflow-y-visible overflow-x-visible 2xl:p-4 !pr-0 border-solid border-0 border-b 2xl:border-b-0 border-notQuiteBlack/20 dark:border-notQuiteWhite/20'>
                <h1 className="block font-bold text-2xl hHLPLFVBBT2XLS:-mt-2 hHLPLFVBBT2XLS:mb-1 font-heading w-[216px]">{t("home.jumpBackIn")}</h1>
                <div className='flex flex-row *:flex-shrink-0 2xl:flex-col h-44 2xl:h-full pb-4 2xl:pb-0 justify-start gap-4 overflow-y-hidden overflow-x-hidden 2xl:w-[216px] after:transition-opacity after:duration-300 after:opacity-0 after:hHLPLNFV:opacity-100 after:hVLPLFVAIT2XLS:opacity-100 after:from-fullMoon after:to-fullMoon/0 after:dark:from-night after:dark:to-night/0 2xl:after:w-[216px] hHLPLFVBBT2XLS:after:h-44 2xl:after:h-[100px] hHLPLFVBBT2XLS:after:w-16 hHLPLFVBBT2XLS:after:bg-gradient-to-l 2xl:after:bg-gradient-to-t 2xl:after:absolute hHLPLFVBBT2XLS:after:absolute 2xl:after:bottom-4 hHLPLFVBBT2XLS:after:right-4 after:pointer-events-none 2xl:after:after:absolute 2xl:before:absolute 2xl:before:bottom-4 2xl:before:bg-transparent 2xl:before:hVLPLFVAIT2XLS:w-[216px] 2xl:before:hVLPLFVAIT2XLS:h-[25px] before:hVLPLFVAIT2XLS:z-[1]'>
                    {recentGames.slice(0, 8).map(g => <GameCard game={g.game} size='homepage' useCapsule={!isWideEnoughForHorizontalGameCardsUwU} showTitle={false} isFavorite={favourites.some(f => f.source === g.game.source && f.id === g.game.id)} />)}
                </div>
            </div>
        </div>
    );
};

export default Home;