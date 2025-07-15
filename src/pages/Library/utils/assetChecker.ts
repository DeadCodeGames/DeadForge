import { NormalizedGame, GameMedia, Media } from '@/types';
import { getLocalizedGameSuffix } from '../Library';

interface MissingAsset {
    type: 'header' | 'capsule' | 'icon' | 'logo' | 'hero';
}

interface MissingAssetReport {
    source: string;
    id: string | number | undefined;
    name: string;
    missingAssets: MissingAsset[];
}

function normalizeAssetUrl(url: string, game?: NormalizedGame): string {
    // If the path starts with %USERDATA%, replace it with CONST_USERDATA
    if (url.startsWith('%USERDATA%')) {
        return `local://${url.replace('%USERDATA%', 'CONST_USERDATA')}`;
    }

    // If it's an absolute path (starts with drive letter or UNC path), convert to local:// protocol
    if (/^[A-Za-z]:\\/.test(url) || url.startsWith('\\\\')) {
        return `local://${url}`;
    }

    // For Steam games with relative paths, we need to construct the Steam library cache path
    if (game?.source === 'steam' && game.media) {
        // Look for any absolute Steam library cache path in other media URLs to get the base path
        const allMediaUrls = Object.values(game.media || {}).flatMap(url => {
            if (typeof url === 'string') return [url];
            if (url?.image) return Object.values(url.image);
            return [];
        });

        const steamCachePath = allMediaUrls.find(url => 
            typeof url === 'string' && 
            url.includes('Steam\\appcache\\librarycache') && 
            url.includes(game.id.toString())
        );

        if (steamCachePath && typeof steamCachePath === 'string') {
            const basePath = steamCachePath.split(game.id.toString())[0] + game.id.toString() + '\\';
            return `local://${basePath}${url}`;
        }
    }

    // For relative paths from other sources, assume they are in the game's assets directory
    if (game) {
        return `local://CONST_USERDATA/game_assets/${game.source}_${game.id}.${url}`;
    }

    // If we can't determine the proper path, just return the URL with local:// protocol
    return `local://${url}`;
}

function getAssetPath(mediaData: unknown, game?: NormalizedGame): string | null {
    if (!mediaData) return null;

    const suffix = getLocalizedGameSuffix();

    // Handle the case where mediaData is a direct string or has an image object
    const imagePath = typeof mediaData === 'string' 
        ? mediaData :
        'image' in (mediaData as any) ? 
            typeof (mediaData as any).image === 'string' ?
                (mediaData as any).image :
                ((mediaData as any).image[suffix] || (mediaData as any).image['english'] || Object.values((mediaData as any).image)[0]) :
            ((mediaData as any)[suffix] || (mediaData as any)['english'] || Object.values(mediaData as any)[0]);

    if (!imagePath || typeof imagePath !== 'string') {
        return null;
    }

    return normalizeAssetUrl(imagePath, game);
}

function isValidAssetUrl(url: unknown): url is string {
    if (typeof url !== 'string') return false;
    if (url.trim() === '') return false;
    return true;
}

async function getValidAssetUrl(asset: unknown, game?: NormalizedGame): Promise<string | null> {
    if (!asset) return null;

    // Case 1: Direct string URL
    if (typeof asset === 'string') {
        if (!isValidAssetUrl(asset)) return null;
        const normalizedUrl = getAssetPath(asset, game);
        if (!normalizedUrl) return null;
        const exists = await checkUrl(normalizedUrl);
        return exists ? normalizedUrl : null;
    }

    // Case 2: Complex object with image data
    if (typeof asset === 'object' && asset !== null) {
        const normalizedUrl = getAssetPath(asset, game);
        if (!normalizedUrl) return null;
        const exists = await checkUrl(normalizedUrl);
        return exists ? normalizedUrl : null;
    }

    return null;
}

async function checkUrl(url: string): Promise<boolean> {
    try {
        const response = await fetch(url, { method: 'HEAD' }).catch(() => {
            return {
                ok: false,
                status: 404
            }
        });
        return response.ok;
    } catch {
        return false;
    }
}

async function checkMediaAssets(media: Media | GameMedia, game?: NormalizedGame, curatedAssets: any[] = []): Promise<MissingAsset[]> {
    const missingAssets: MissingAsset[] = [];
    const assetChecks: Array<[keyof (Media & GameMedia), unknown]> = [];

    if ('headerUrl' in media) {assetChecks.push(['headerUrl', media.headerUrl])} else {missingAssets.push({ type: 'header' })};
    if ('capsuleUrl' in media) {assetChecks.push(['capsuleUrl', media.capsuleUrl])} else {missingAssets.push({ type: 'capsule' })};
    if ('iconUrl' in media) {assetChecks.push(['iconUrl', media.iconUrl])} else {missingAssets.push({ type: 'icon' })};
    if ('logoUrl' in media) {assetChecks.push(['logoUrl', media.logoUrl])} else {missingAssets.push({ type: 'logo' })};
    if ('heroUrl' in media) {assetChecks.push(['heroUrl', media.heroUrl])} else {missingAssets.push({ type: 'hero' })};

    // Process each asset
    for (const [type, asset] of assetChecks) {
        // First check if we have a valid URL in the official media
        let validUrl = await getValidAssetUrl(asset, game);
        
        if (!validUrl && game) {
            // If no valid official URL, check curated assets
            const curatedAsset = curatedAssets.find(a => String(a.id) === String(game.id) && a.source === game.source);
            if (curatedAsset?.media?.[type]) {
                validUrl = await getValidAssetUrl(curatedAsset.media[type], game);
            }
        }
        
        // Only consider an asset missing if we can't find ANY valid version
        if (!validUrl) {
            missingAssets.push({
                type: type.replace('Url', '') as MissingAsset['type']
            });
        }
    }

    return missingAssets;
}

export async function checkMissingAssets(games: NormalizedGame[], curatedAssets: any[] = []): Promise<MissingAssetReport[]> {
    const reports: MissingAssetReport[] = [];

    // Check games
    for (const game of games) {
        if (game.source === "deadforge") continue;
        if (!game.media) {
            // If game has no media object at all, report all assets as missing
            reports.push({
                source: game.source,
                id: game.id,
                name: typeof game.name === 'string' ? game.name : 
                    typeof game.name === 'object' && game.name !== null ? game.name.default : 
                        'Unknown Game',
                missingAssets: [
                    { type: 'header' },
                    { type: 'capsule' },
                    { type: 'icon' },
                    { type: 'logo' },
                    { type: 'hero' }
                ]
            });
            continue;
        }

        const missingAssets = await checkMediaAssets(game.media, game, curatedAssets);
        if (missingAssets.length > 0) {
            reports.push({
                source: game.source,
                id: game.id,
                name: typeof game.name === 'string' ? game.name : 
                    typeof game.name === 'object' && game.name !== null ? game.name.default : 
                        'Unknown Game',
                missingAssets
            });
        }
    }

    return reports;
}

export function formatReportForGitHub(reports: MissingAssetReport[]): string {
    const reportData = {
        reports: reports.map(report => ({
            source: report.source,
            id: report.id,
            name: report.name,
            missingAssets: report.missingAssets.map(asset => asset.type)
        }))
    };

    return JSON.stringify(reportData);
} 