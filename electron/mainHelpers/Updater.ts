import https from 'https';
import fs from 'fs';
import { spawn } from 'child_process';
import axios from 'axios';

export const DEADFORGE_RELEASES_URL = 'https://deadcode.is-a.dev/DeadForge/store/software-gh-pages-cache/deadforge.json';

export async function fetchDeadForgeReleases() {
    return new Promise<any[]>((resolve, reject) => {
        https.get(DEADFORGE_RELEASES_URL, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const releases = JSON.parse(data);
                    // Filter for v2+ releases
                    const filtered = releases.filter((r: any) => /^v[^01]/.test(r.tag_name));
                    // Sort by published_at descending
                    filtered.sort((a: any, b: any) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
                    resolve(filtered);
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

export function selectDeadForgeRelease(releases: any[], includeBeta: boolean) {
    if (!releases.length) return null;
    if (includeBeta) {
        return releases[0] || null;
    } else {
        return releases.find((r: any) => !r.prerelease) || null;
    }
}

export function findDeadForgeInstallerAsset(release: any) {
    if (!release || !release.assets) return null;
    return release.assets.find((a: any) => a.name.endsWith('.exe') && a.browser_download_url);
}

// eslint-disable-next-line no-unused-vars
export async function downloadDeadForgeInstaller(asset: any, destPath: string, onProgress: (percent: number) => void) {
    return new Promise<void>(async (resolve, reject) => {
        try {
            const writer = fs.createWriteStream(destPath);
            const response = await axios({
                method: 'get',
                url: asset.browser_download_url,
                responseType: 'stream',
            });
            const total = parseInt(response.headers['content-length'] || '0', 10);
            let downloaded = 0;
            response.data.on('data', (chunk: Buffer) => {
                downloaded += chunk.length;
                if (total > 0) {
                    onProgress(Math.round((downloaded / total) * 100));
                }
            });
            response.data.pipe(writer);
            writer.on('finish', () => {
                writer.close();
                resolve();
            });
            writer.on('error', (err) => {
                fs.unlink(destPath, () => reject(err));
            });
        } catch (err) {
            reject(err);
        }
    });
}

export function launchDeadForgeInstaller(installerPath: string) {
    // Launch with /S for silent install
    spawn(installerPath, [], {
        detached: true,
        stdio: 'ignore'
    }).unref();
}

export const handleDeadForgeUpdate = async () => {
    console.log("Autoupdater has not yet been implemented. This is just a placeholder for the actual thing that would happen.")
    await new Promise((resolve) => setTimeout(resolve, 0))
    console.log("deadforge autoupdate when send tweet")
    return;
}