import { useEffect, useState } from 'react';
import { Article } from '../../types';
import { format } from 'date-fns';
import MarkdownText from '@/components/CustomElements/MarkdownText';

const Home = () => {
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchArticles = async () => {
            try {
                // First try to update articles
                const updateResult = await window.Electron.updateArticles();
                if (!updateResult.success) {
                    console.warn('Failed to update articles:', updateResult.error);
                }

                // Get articles regardless of update success
                const result = await window.Electron.getArticles();
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
                        <div className="flex flex-wrap gap-2 mb-4">
                            {article.tags.map((tag) => (
                                <span 
                                    key={tag}
                                    className="px-2 py-1 bg-neutral-200 dark:bg-neutral-700 rounded-full text-sm"
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                        <h1 className="text-4xl font-bold mb-6">{article.title}</h1>
                        <div className="flex items-center mb-6 space-x-4">
                            {article.authors.map((author) => (
                                <div key={author.name} className="flex items-center">
                                    <img 
                                        src={`local://${author.profilePicture.replace("%USERDATA%", "CONST_USERDATA")}`}
                                        alt={author.name}
                                        className="w-10 h-10 rounded-full mr-3"
                                    />
                                    <div>
                                        <a 
                                            href={author.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 dark:text-blue-400 hover:underline font-medium m-0"
                                        >
                                            {author.name}
                                        </a>
                                        <div className="text-sm text-neutral-600 dark:text-neutral-400">
                                            {format(new Date(article.publishDate), 'PPP')}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="prose dark:prose-invert max-w-none">
                            <MarkdownText>
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