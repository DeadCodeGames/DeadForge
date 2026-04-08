import React, { useEffect, useMemo, useState, useContext, useCallback, useRef, memo } from 'react';
import { LibraryContext } from '../Library/Library';
import { Article, NormalizedGame, NormalizedGameJoin, NormalizedPseudoGameJoin } from '../../types';
import { format } from 'date-fns';
import MarkdownText from '@/components/CustomElements/MarkdownText';
import i18n, { dateFNSResources } from '@/locales/i18n';
import { Trans, useTranslation } from 'react-i18next';
import { useMediaQuery } from "react-responsive"
import { TriangleAlert, Newspaper } from "lucide-react";
import Tooltip from '@/components/CustomElements/Tooltip';
import GameCard from '../Library/components/GameCard';
import { cn } from '@/lib/utils';
import { TFunction } from 'i18next/typescript/t';
import { Link } from 'react-router-dom';

// eslint-disable-next-line no-unused-vars
const tagClassMap: (key: string, t: TFunction) => { font: string; text?: string; bg?: string; border?: string, content: string } | undefined = (key: string, t: TFunction) => {
    switch (key) {
        case 'deadforge update': return { font: 'font-uniSansCAPS font-bold uppercase', text: 'bg-notQuiteBlack dark:bg-notQuiteWhite', bg: 'bg-notQuiteWhite dark:bg-notQuiteBlack', border: 'border-notQuiteBlack/40 dark:border-notQuiteWhite/40', content: t('home.articles.tags.deadforgeUpdate') }
        case 'beta': return { font: 'font-uniSansCAPS font-bold uppercase', text: 'bg-notQuiteBlack dark:bg-notQuiteWhite', bg: 'bg-notQuiteWhite dark:bg-notQuiteBlack', border: 'border-notQuiteBlack/40 dark:border-notQuiteWhite/40', content: t('home.articles.tags.beta') }
        case 'patch': return { font: 'font-uniSansCAPS font-bold uppercase', text: 'bg-notQuiteBlack dark:bg-notQuiteWhite', bg: 'bg-notQuiteWhite dark:bg-notQuiteBlack', border: 'border-notQuiteBlack/40 dark:border-notQuiteWhite/40', content: t('home.articles.tags.patch') }
        case 'language update': return { font: 'font-uniSansCAPS font-bold uppercase', text: 'bg-notQuiteBlack dark:bg-notQuiteWhite', bg: 'bg-notQuiteWhite dark:bg-notQuiteBlack', border: 'border-notQuiteBlack/40 dark:border-notQuiteWhite/40', content: t('home.articles.tags.languageUpdate') }
        case 'meta update': return { font: 'font-notoSans font-normal lowercase', text: '', bg: '', border: '', content: t('home.articles.tags.metaUpdate') }
        case 'work in progress': return { font: 'font-consolas font-bold', text: "text-white", bg: 'bg-stripes-warning', border: 'border-2 border-solid border-black dark:border-white', content: t('home.articles.tags.workInProgress') }
    }
};

const ArticlesList = memo(function ActionList({ list, t }: { list: Article[], t: TFunction }) {
    console.log(list);
    return (
        <>
            {list.map((article) => (
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
                                {article.tags.map((tag) => {
                                    // Define a case-insensitive map of tag styles
                                    const tagKey = tag.toLowerCase();
                                    const tagClasses = tagClassMap(tagKey, t) || { font: '', text: '', bg: '', border: '', content: tag };
                                    return (
                                        <span
                                            key={tag}
                                            className={cn(
                                                'px-3 py-1 bg-neutral-200 dark:bg-neutral-700 rounded-full text-sm inline-flex flex-row font-montserrat uppercase text-nowrap border border-solid border-transparent',
                                                tagClasses.font,
                                                tagClasses.text,
                                                tagClasses.bg,
                                                tagClasses.border
                                            )}
                                        >
                                            {tagClasses.content}
                                        </span>
                                    );
                                })}
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
                            {
                                (article.linkedRelease || article.linkedSoftware) && (
                                    <>
                                        <div className='border border-solid border-notQuiteBlack/40 dark:border-notQuiteWhite/40 py-2 my-auto mx-4' />
                                        <div className="flex flex-col justify-center text-sm gap-0.5">
                                            {article.linkedRelease && (
                                                <div className="flex flex-row items-center gap-1">
                                                    <span className="material-symbols text-xl">commit</span>
                                                    <a className="no-underline hover:underline m-0" href={article.linkedRelease.url} target='_blank' rel='noreferrer'>{article.linkedRelease.tag}</a>
                                                </div>
                                            )}
                                            {article.linkedSoftware && (
                                                <div className="flex flex-row items-center gap-1">
                                                    <span className="material-symbols text-xl">shopping_bag</span>
                                                    {article.linkedSoftware.map((l, i, a) => {
                                                        return (
                                                            <span key={i}>
                                                                <Link to={`/store?path=${encodeURIComponent(`soft/${l.storeId}/`)}`} className="no-underline hover:underline m-0">{l.displayName}</Link>{i + 1 < a.length && t("commaSeparator")}
                                                            </span>
                                                        )
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )
                            }
                        </div>
                        <div className="">
                            <MarkdownText mediaMap={article.assetsMap} className='font-notoSans'>
                                {article.content}
                            </MarkdownText>
                        </div>
                    </div>
                </article>
            ))}
        </>
    )
})

const Home = () => {
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorUpdating, setErrorUpdating] = useState<string | null>(null);
    const [errorLoading, setErrorLoading] = useState<string | null>(null);
    const scrollContainerRef = useRef<null | HTMLDivElement>(null);
    const [scrolled, setScrolled] = useState<boolean>(false);
    const { games, gameJoins, favourites, launchTimestamps } = useContext(LibraryContext)

    const { t } = useTranslation();

    const isWideEnoughForHorizontalGameCardsUwU = useMediaQuery({ query: '(min-width: 1536px)' })

    useEffect(() => {
        let retries = 0;
        let retryTimeout: ReturnType<typeof setTimeout> | null = null;
        let scrollCleanup: (() => void) | null = null;
        const maxRetries = 5;
        const retryDelay = 100;
    
        const tryAttach = () => {
            const el = scrollContainerRef.current;
            if (!el) {
                if (retries < maxRetries) {
                    retries++;
                    retryTimeout = setTimeout(tryAttach, retryDelay);
                } else {
                    console.error("Failed to attach to the scroll container after 5 retries.");
                }
                return;
            }
    
            const handleScroll = () => {
                setScrolled(el.scrollTop > 50 && !isWideEnoughForHorizontalGameCardsUwU);
            };
    
            el.addEventListener("scroll", handleScroll);
            scrollCleanup = () => el.removeEventListener("scroll", handleScroll);
        };
    
        tryAttach();
    
        return () => {
            if (scrollCleanup) scrollCleanup();
            if (retryTimeout) clearTimeout(retryTimeout);
        };
    }, [isWideEnoughForHorizontalGameCardsUwU]);

    useEffect(() => {
        const fetchArticles = () => {
            try {
                // First try to update articles
                window.Electron.updateArticles().then((updatingResult) => {
                    if (updatingResult.success) {
                        setErrorUpdating(null)
                    } else if (updatingResult.error) {
                        setErrorUpdating(updatingResult.error);
                    }
                }).catch((err) => {
                    setErrorUpdating((err as Error).message);
                });

                // Get articles regardless of update success
                window.Electron.getArticles()
                    .then((result) => {
                        setArticles(result.articles);
                        setErrorLoading(null);
                    })
                    .catch((err) => {
                        setErrorLoading((err as Error).message);
                        console.error('Error loading articles:', err);
                    })
                    .finally(() => {
                        setLoading(false);
                    });
            } catch (err) {
                setErrorLoading((err as Error).message);
                console.error('Error loading articles:', err);
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

        return allGames
            .map(game => {
                return {
                    game,
                    lastPlayed: ((g): g is NormalizedPseudoGameJoin => g.type === "GameJoin")(game) ? Math.max(...Object.values(game.source).map(game => game.lastPlayed || 0), 0) : (game.lastPlayed || 0)
                };
            })
            .filter(({ lastPlayed }) => lastPlayed > 0)
            .sort((a, b) => b.lastPlayed - a.lastPlayed);
    }, [games, gameJoinsPopulated, launchTimestamps, transformGameJoinIntoUsableFormat]);

    return (
        <div className="overflow-hidden w-full flex flex-col-reverse 2xl:flex-row h-[calc(100%-1.5rem)] 2xl:h-full pt-6 2xl:pt-0 2xl:pr-4 bg-fullMoon dark:bg-night">
            <div ref={scrollContainerRef} className='flex flex-col w-[calc(100%-49px)] 2xl:max-w-[calc(100%-257px)] gap-y-4 overflow-y-auto px-6 pt-4 2xl:pt-6 py-6 pr-6 border-0 border-solid border-notQuiteBlack/20 dark:border-notQuiteWhite/20 2xl:border-r h-[calc(100%-3rem)]'>
                <h1 className="font-bold text-3xl pl-2 font-heading">
                    <div className="flex flex-row gap-2 items-center">
                        <span>
                            <Trans
                                i18nKey="home.newsAndUpdatesHeader"
                                components={{ bold: <span className="font-uniSansCAPS font-bold" /> }}
                            />
                        </span>
                        {errorUpdating && (
                            <Tooltip content={<span>{t("home.errorWithUpdatingArticles")}<br /><code className="px-1 py-0.5 dark:bg-night bg-fullMoon text-notQuiteBlack dark:text-notQuiteWhite rounded-md border border-solid dark:border-fullMoon/25 border-night/25">{errorUpdating}</code>{errorUpdating.startsWith("getaddrinfo") && (<><br />{t("home.errorWithUpdatingArticles-NetworkError")}</>)}</span>} position='bottom'>
                                <TriangleAlert className='text-warning' />
                            </Tooltip>
                        )}
                    </div>
                </h1>
                {
                    loading ? (
                        <div className="flex items-center justify-center min-h-[calc(100%-102px)]">
                            <div className="rounded-full h-8 w-full text-center border-t-2 border-b-2 border-neutral-900 dark:border-white">{t("loading")}</div>
                        </div>
                    ) : errorLoading ? (
                        <div className="flex flex-col items-center justify-center min-h-[calc(100%-102px)] text-red-600">
                            <h2 className="text-xl font-bold mb-2 w-full text-center">{t("errorWithLoadingArticles")}</h2>
                            <p className="w-full text-center">{errorLoading}</p>
                        </div>
                    ) : articles.length === 0 ? (
                        <div className="flex flex-col items-center justify-center min-h-[calc(100%-102px)] text-neutral-500 dark:text-neutral-400">
                            <Newspaper className="w-16 h-16 mb-4 opacity-50" />
                            <h2 className="text-xl font-bold mb-2 text-center">{t("home.noArticlesTitle")}</h2>
                            <p className="text-center max-w-md">{t("home.noArticlesDescription")}</p>
                        </div>
                    ) : (
                        <div className='space-y-6'>
                            <ArticlesList list={articles} t={t} />
                        </div>
                    )
                }
            </div>
            <div className='flex flex-col gap-2 2xl:w-[216px] overflow-y-visible overflow-x-visible px-6 2xl:p-4 border-solid border-0 border-b 2xl:border-b-0 border-notQuiteBlack/20 dark:border-notQuiteWhite/20'>
                <h1 className={cn("block font-bold text-2xl hHLPLFVBBT2XLS:-mt-2 hHLPLFVBBT2XLS:mb-1 font-heading w-[216px] transition-[transform,margin-bottom,opacity] duration-300", (scrolled && !isWideEnoughForHorizontalGameCardsUwU) ? "-translate-y-11 !-mb-8 opacity-0" : "opacity-100")}>{t("home.jumpBackIn")}</h1>
                <div className={cn('flex flex-row *:flex-shrink-0 2xl:flex-col 2xl:h-full pb-4 2xl:pb-0 justify-start overflow-y-hidden overflow-x-hidden 2xl:w-[216px] after:transition-[opacity,height] after:duration-300 after:opacity-0 after:hHLPLNFV:opacity-100 after:hVLPLFVAIT2XLS:opacity-100 after:from-fullMoon after:to-fullMoon/0 after:dark:from-night after:dark:to-night/0 2xl:after:w-[216px] hHLPLFVBBT2XLS:after:h-[11.5rem] 2xl:after:h-[100px] hHLPLFVBBT2XLS:after:w-16 hHLPLFVBBT2XLS:after:bg-gradient-to-l 2xl:after:bg-gradient-to-t 2xl:after:absolute hHLPLFVBBT2XLS:after:absolute 2xl:after:bottom-4 hHLPLFVBBT2XLS:after:right-6 after:pointer-events-none 2xl:after:after:absolute 2xl:before:absolute 2xl:before:bottom-4 2xl:before:bg-transparent 2xl:before:hVLPLFVAIT2XLS:w-[216px] 2xl:before:hVLPLFVAIT2XLS:h-[25px] before:hVLPLFVAIT2XLS:z-[1] transition-[height,gap] duration-300', scrolled ? "h-32 hHLPLFVBBT2XLS:after:!h-[8.5rem] gap-3 hHLPLFVBBT2XLS:after:opacity-0" : "h-44 gap-4")}>
                    {recentGames.slice(0, 8).map((g, i) => <GameCard game={g.game} key={i} size='homepage' useCapsule={!isWideEnoughForHorizontalGameCardsUwU} showTitle={false} isFavorite={favourites.some(f => f.source === g.game.source && f.id === g.game.id)} />)}
                </div>
            </div>
        </div>
    );
};

export default Home;