import React, { useEffect, useState } from 'react';
import { Article } from '../../types';
import { format } from 'date-fns';
import MarkdownText from '@/components/CustomElements/MarkdownText';
import i18n, { dateFNSResources } from '@/locales/i18n';
import { Trans, useTranslation } from 'react-i18next';
import Tooltip from '@/components/CustomElements/Tooltip';

const Home = () => {
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const { t } = useTranslation();

    useEffect(() => {
        const fetchArticles = async () => {
            try {
                // First try to update articles
                window.Electron.updateArticles();

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
        <div className="w-[calc(100%-3rem)] h-full p-6 bg-night overflow-y-auto">
            {articles.map((article) => (
                <article 
                    key={article.slug}
                    className="mb-16 bg-white dark:bg-neutral-800 rounded-2xl shadow-lg overflow-hidden"
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
                                    <Trans i18nKey={article.authors.length === 1 ? "home.articles.writtenBy.one" : "home.articles.writtenBy.other"} count={article.authors.length}>
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
                            <MarkdownText mediaMap={article.assetsMap}>
                                {article.content}
                            </MarkdownText>
                        </div>
                    </div>
                </article>
            ))}
        </div>
    );
};

export default Home;