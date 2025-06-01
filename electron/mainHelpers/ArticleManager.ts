import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import https from 'https';

interface ArticleAuthor {
    name: string;
    link: string;
    profilePicture: {
        filePath: string;
        remoteUrl: string;
    };
}

interface Article {
    title: string;
    authors: ArticleAuthor[];
    bannerImage: {
        filePath: string;
        remoteUrl: string;
    };
    assetsMap: Record<string, string>;
    content: string;
    publishDate: string;
    lastModified: string;
    tags: string[];
    slug: string;
}

interface ArticleList {
    articles: Article[];
}

const ARTICLES_UPDATE_INTERVAL = 1000 * 60 * 60; // 1 hour

async function shouldUpdateArticles(): Promise<boolean> {
    const articlesPath = path.join(app.getPath('userData'), 'articles.json');
    if (!fs.existsSync(articlesPath)) {
        return true;
    }

    try {
        const stats = fs.statSync(articlesPath);
        const now = new Date().getTime();
        const lastUpdate = stats.mtime.getTime();

        return (now - lastUpdate) > ARTICLES_UPDATE_INTERVAL;
    } catch (error) {
        console.error('Error checking articles update time:', error);
        return true;
    }
}

async function downloadFile(url: string, destPath: string, maxRedirects = 5): Promise<boolean> {
    return new Promise((resolve) => {
        const dir = path.dirname(destPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        const handleResponse = (response: any, currentUrl: string, redirectCount = 0) => {
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                if (redirectCount >= maxRedirects) {
                    console.error(`Too many redirects when downloading ${currentUrl}`);
                    resolve(false);
                    return;
                }

                // Handle both absolute and relative redirects
                const redirectUrl = new URL(response.headers.location, currentUrl).toString();
                console.log(`Following redirect: ${currentUrl} -> ${redirectUrl}`);

                https.get(redirectUrl, (redirectResponse) => {
                    handleResponse(redirectResponse, redirectUrl, redirectCount + 1);
                }).on('error', (err) => {
                    console.error(`Error following redirect from ${currentUrl} to ${redirectUrl}:`, err);
                    resolve(false);
                });
                return;
            }

            if (response.statusCode !== 200) {
                console.error(`Failed to download file from ${currentUrl}: ${response.statusCode}`);
                resolve(false);
                return;
            }

            const file = fs.createWriteStream(destPath);
            response.pipe(file);

            file.on('finish', () => {
                file.close();
                resolve(true);
            });

            file.on('error', (err) => {
                console.error(`Error writing file ${destPath}:`, err);
                file.close();
                fs.unlinkSync(destPath);
                resolve(false);
            });
        };

        https.get(url, (response) => {
            handleResponse(response, url);
        }).on('error', (err) => {
            console.error(`Error downloading file from ${url}:`, err);
            resolve(false);
        });
    });
}

async function downloadMarkdownContent(contentPath: string, slug: string): Promise<string> {
    const contentUrl = `https://deadcode.is-a.dev/DeadForgeExternalData/articles/${contentPath}`;
    const userDataPath = app.getPath('userData');
    const localPath = path.join(userDataPath, 'app_assets', 'articles', slug, 'content.md');

    const success = await downloadFile(contentUrl, localPath);
    if (!success) {
        throw new Error(`Failed to download content for article: ${slug}`);
    }

    return fs.readFileSync(localPath, 'utf-8');
}

export async function updateArticles(force = false): Promise<{ success: boolean; error?: string }> {
    try {
        if (!force && !(await shouldUpdateArticles())) {
            return { success: true };
        }

        const articlesUrl = 'https://deadcode.is-a.dev/DeadForgeExternalData/articles/list.json';
        const userDataPath = app.getPath('userData');

        // Download and parse the articles list
        const articlesList = await new Promise<ArticleList>((resolve, reject) => {
            https.get(articlesUrl, (response) => {
                if (response.statusCode !== 200) {
                    reject(new Error(`Failed to download articles list: ${response.statusCode}`));
                    return;
                }

                let data = '';
                response.on('data', (chunk) => {
                    data += chunk;
                });

                response.on('end', () => {
                    try {
                        const articles = JSON.parse(data);
                        resolve(articles);
                    } catch (error) {
                        reject(error);
                    }
                });
            }).on('error', reject);
        });

        // Process each article
        for (const article of articlesList.articles) {
            // Download banner image
            if (article.bannerImage) {
                const bannerPath = article.bannerImage.filePath.replace('%USERDATA%', userDataPath);
                await downloadFile(article.bannerImage.remoteUrl, bannerPath);
            }

            // Download author profile pictures
            for (const author of article.authors) {
                if (author.profilePicture) {
                    const picturePath = author.profilePicture.filePath.replace('%USERDATA%', userDataPath);
                    await downloadFile(author.profilePicture.remoteUrl, picturePath);
                }
            }

            // Download assets from assetsMap
            for (const [remoteUrl, localPath] of Object.entries(article.assetsMap || {})) {
                const assetPath = localPath.replace('%USERDATA%', userDataPath);
                await downloadFile(remoteUrl, assetPath);
            }

            // Download and read article content
            article.content = await downloadMarkdownContent(article.content, article.slug);
        }

        // Save the articles list locally
        const articlesPath = path.join(userDataPath, 'articles.json');
        fs.writeFileSync(articlesPath, JSON.stringify(articlesList));

        return { success: true };
    } catch (error) {
        console.error('Error updating articles:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}

export function getArticles(): ArticleList {
    try {
        const articlesPath = path.join(app.getPath('userData'), 'articles.json');
        if (!fs.existsSync(articlesPath)) {
            return { articles: [] };
        }
        const articles = JSON.parse(fs.readFileSync(articlesPath, 'utf-8'));

        // For each article, ensure we have the content
        for (const article of articles.articles) {
            const contentPath = path.join(app.getPath('userData'), 'app_assets', 'articles', article.slug, 'content.md');
            if (fs.existsSync(contentPath)) {
                article.content = fs.readFileSync(contentPath, 'utf-8');
            } else {
                article.content = '**Content not available offline**';
            }
        }

        return articles;
    } catch (error) {
        console.error('Error reading articles:', error);
        return { articles: [] };
    }
} 