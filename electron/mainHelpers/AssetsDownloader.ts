import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import https from 'https';
import http from 'http';
import crypto from 'crypto';
import { GameAsset } from '../types';
import getDB from './DataDB';
import { insertRow, updateRow, selectRows } from './dbHelpers';

export const CURATED_LIST_URL = 'https://deadcode.is-a.dev/DeadForgeExternalData/curated/list.json';
export const OFFICIAL_LIST_URL = 'https://deadcode.is-a.dev/DeadForgeExternalData/official/list.json';

// Map media type to database field
const MEDIA_TO_DB_FIELD: Record<string, string> = {
    'iconUrl': 'icon',
    'logoUrl': 'logo',
    'heroUrl': 'hero',
    'headerUrl': 'header',
    'capsuleUrl': 'capsule',
};

/**
 * Downloads a file from a remote URL to a local destination path
 * @returns Promise resolving to the destination path if successful
 */
export async function downloadFile(remoteUrl: string, destinationPath: string): Promise<string> {
    await fs.promises.mkdir(path.dirname(destinationPath), { recursive: true });

    return new Promise((resolve, reject) => {
        const client = remoteUrl.startsWith('https') ? https : http;
        client.get(remoteUrl, res => {
            if (res.statusCode !== 200) {
                return reject(new Error(`Failed to get '${remoteUrl}' (${res.statusCode})`));
            }

            const fileStream = fs.createWriteStream(destinationPath);
            res.pipe(fileStream);
            fileStream.on('finish', () => {
                fileStream.close(() => resolve(destinationPath));
            });
        }).on('error', reject);
    });
}

/**
 * Resolves template paths by replacing placeholders with actual paths
 */
function resolvePath(templatePath: string): string {
    return templatePath.replace('%USERDATA%', app.getPath('userData'));
}

/**
 * Normalizes locale object handling by converting both string and object formats
 * to a consistent array format
 */
function normalizeLocaleEntries(obj: Record<string, string> | string): [string, string][] {
    return typeof obj === 'string' ? [['', obj]] : Object.entries(obj);
}

/**
 * Calculates MD5 hash of a file
 * @returns Promise resolving to the hash string
 */
async function calculateFileHash(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        try {
            if (!fs.existsSync(filePath)) {
                return resolve('');
            }
            
            const hash = crypto.createHash('md5');
            const stream = fs.createReadStream(filePath);
            
            stream.on('data', data => hash.update(data));
            stream.on('end', () => resolve(hash.digest('hex')));
            stream.on('error', reject);
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Checks if a file needs to be downloaded based on hash
 * @returns true if download is needed, false otherwise
 */
async function isDownloadNeeded(filePath: string, expectedHash?: string): Promise<boolean> {
    // Special case: if the expected hash is "404", it means the file couldn't be reached during deployment
    if (expectedHash === "404") {
        // If the file already exists locally, don't replace it with a potentially broken file
        if (fs.existsSync(filePath)) {
            console.log(`File ${filePath} exists and expected hash is "404". Keeping existing file.`);
            return false;
        }
        // If file doesn't exist, we'll still try downloading (might be a temporary error)
        return true;
    }

    // Normal flow for valid hashes
    if (!fs.existsSync(filePath)) {
        return true; // File doesn't exist, download needed
    }
    
    if (!expectedHash) {
        return false; // No hash to compare, assume file is good
    }
    
    try {
        const currentHash = await calculateFileHash(filePath);
        return currentHash !== expectedHash; // Download only if hash doesn't match
    } catch (error) {
        console.error(`Error checking file hash: ${error}`);
        return true; // If error checking hash, download to be safe
    }
}

/**
 * Downloads assets for games from the curated list based on provided targets
 */
export async function DownloadCuratedAssets(...targets: { source: string, id: string }[]) {
    console.log(targets)
    try {    // Fetch the curated list
        const responseCurated = await fetch(CURATED_LIST_URL);
        const responseOfficial = await fetch(OFFICIAL_LIST_URL)
        const curatedList = await responseCurated.json() as GameAsset[];
        const officialList = await responseOfficial.json() as GameAsset[];
        const combinedList = [...officialList, ...curatedList]

        // Prepare database updates for the curatedAssets table
        const dbUpdates: Set<{
            updateData: Record<string, any>,
            source: string,
            gameId: string
        }> = new Set<{
            updateData: Record<string, any>,
            source: string,
            gameId: string
        }>();
        const db = getDB();

        for (const { source, id } of targets) {
            // Find the matching asset in the curated list
            const match = combinedList.find(entry =>
                entry.matches?.some(m => m.source === source && m.id === String(id))
            );
            if (source === "deadforge") console.log("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", match)

            if (!match) {
                console.warn(`No match found for source: ${source}, id: ${id}`);
                continue;
            }

            console.log(match);

            const media = match.media || {};
            const mediaKeys = Object.keys(media) as (keyof GameAsset['media'])[];

            const dbUpdate: Record<string, string | null> = {};

            dbUpdate.executablesToWatch = match.executablesToWatch ? JSON.stringify(match.executablesToWatch) : null;

            for (const mediaKey of mediaKeys) {
                const mediaEntry = media[mediaKey];
                if (!mediaEntry.remoteUrl || !mediaEntry.filePath) continue;

                const dbField = MEDIA_TO_DB_FIELD[mediaKey];
                if (!dbField) continue; // Skip unknown media types

                // Get hash field name based on media type
                const hashField = `${dbField}Hash`;

                // Normalize entries to handle both string and object formats
                const remoteEntries = normalizeLocaleEntries(mediaEntry.remoteUrl);
                const localEntries = normalizeLocaleEntries(mediaEntry.filePath);
                const hashEntries = mediaEntry.hash ? 
                    (typeof mediaEntry.hash === 'string' ? [['', mediaEntry.hash]] : Object.entries(mediaEntry.hash)) : 
                    [];

                // Special handling for icon (should be a plain string, not JSON)
                if (dbField === 'icon') {
                    // For icon, we only use the first entry (ignoring localization)
                    const [locale, remoteUrl] = remoteEntries[0];
                    const localPath = localEntries.find(([loc]) => loc === locale)?.[1] || localEntries[0]?.[1];
                    const expectedHash = hashEntries.find(([loc]) => loc === locale)?.[1] || hashEntries[0]?.[1] || '';

                    if (localPath) {
                        const resolvedPath = resolvePath(localPath);
                        const downloadNeeded = await isDownloadNeeded(resolvedPath, expectedHash);
                        
                        if (downloadNeeded) {
                            try {
                                await downloadFile(remoteUrl, resolvedPath);
                                console.log(`Downloaded icon ${remoteUrl} -> ${resolvedPath}`);
                                
                                // Verify the download was successful by checking if file exists
                                if (fs.existsSync(resolvedPath)) {
                                    // Store the plain template path for icons
                                    dbUpdate[dbField] = localPath;  // Store icon as plain string
                                    
                                    // Only store hash if it's not "404" and download succeeded
                                    if (expectedHash !== "404") {
                                        dbUpdate[hashField] = expectedHash; // Store hash
                                    }
                                }
                            } catch (err: any) {
                                console.error(`Failed to download icon ${remoteUrl}: ${err.message}`);
                                
                                // If file already exists, keep using it but don't update the hash
                                if (fs.existsSync(resolvedPath)) {
                                    dbUpdate[dbField] = localPath;
                                }
                            }
                        } else {
                            console.log(`Skipping icon download, hash match for ${resolvedPath}`);
                            
                            // Store path and hash for existing valid file
                            dbUpdate[dbField] = localPath;
                            
                            // Only store non-404 hashes
                            if (expectedHash !== "404") {
                                dbUpdate[hashField] = expectedHash;
                            }
                        }
                    }
                    continue; // Skip the rest of the loop for icons
                }

                // For non-icon assets, prepare data structure
                const currentData: Record<string, any> = {
                    image: {},
                };

                // Store hashes as a separate object in the JSON structure
                const hashesData: Record<string, string> = {};

                // Check if we have a single entry
                const isSingleEntry = remoteEntries.length === 1 && remoteEntries[0][0] === "";

                // Download files and update paths
                for (const [locale, remoteUrl] of remoteEntries) {
                    const localPath = localEntries.find(([loc]) => loc === locale)?.[1];
                    if (!localPath) continue;

                    const resolvedPath = resolvePath(localPath);
                    
                    // Find matching hash entry
                    const expectedHash = hashEntries.find(([loc]) => loc === locale)?.[1] || '';
                    
                    const downloadNeeded = await isDownloadNeeded(resolvedPath, expectedHash);
                    
                    if (downloadNeeded) {
                        try {
                            // Use the returned file path from downloadFile
                            const downloadedPath = await downloadFile(remoteUrl, resolvedPath);
                            console.log(`Downloaded ${remoteUrl} -> ${downloadedPath}`);
                            
                            // Verify the download was successful
                            if (fs.existsSync(resolvedPath)) {
                                if (isSingleEntry) {
                                    // For single entries, store the path directly
                                    currentData.image = localPath;
                                } else {
                                    // For multiple entries, use locale-based object structure
                                    const localeKey = locale || 'english';
                                    currentData.image[localeKey] = localPath;
                                }
                                
                                // Store hash only if it's not "404" and download succeeded
                                if (expectedHash !== "404") {
                                    if (isSingleEntry) {
                                        hashesData[''] = expectedHash;
                                    } else {
                                        hashesData[locale || 'english'] = expectedHash;
                                    }
                                }
                            }
                        } catch (err: any) {
                            console.error(`Failed to download ${remoteUrl}: ${err.message}`);
                            
                            // If file already exists, keep using it but don't update the hash
                            if (fs.existsSync(resolvedPath)) {
                                if (isSingleEntry) {
                                    currentData.image = localPath;
                                } else {
                                    const localeKey = locale || 'english';
                                    currentData.image[localeKey] = localPath;
                                }
                            }
                        }
                    } else {
                        console.log(`Skipping download, hash match for ${resolvedPath}`);
                        
                        // Store path and valid hash info for existing file
                        if (isSingleEntry) {
                            currentData.image = localPath;
                            // Only store non-404 hashes
                            if (expectedHash !== "404") {
                                hashesData[''] = expectedHash;
                            }
                        } else {
                            const localeKey = locale || 'english';
                            currentData.image[localeKey] = localPath;
                            // Only store non-404 hashes
                            if (expectedHash !== "404") {
                                hashesData[localeKey] = expectedHash;
                            }
                        }
                    }
                }

                if (mediaKey === 'logoUrl' && 'logo_position' in mediaEntry) {
                    currentData.logo_position = mediaEntry.logo_position;
                }

                // Update the database with the proper structure
                dbUpdate[dbField] = JSON.stringify(currentData);
                
                // Store hash data if available
                if (Object.keys(hashesData).length > 0) {
                    dbUpdate[hashField] = JSON.stringify(hashesData);
                }
            }

            if (source === "deadforge") console.log("DEADFORGE DB UPDATE", dbUpdate);

            if (Object.keys(dbUpdate).length > 0) {
                // Add to the update set if not already present
                const updateKey = JSON.stringify({ source, gameId: id });
                if (!Array.from(dbUpdates).some(u => JSON.stringify({ source: u.source, gameId: u.gameId }) === updateKey)) {
                    dbUpdates.add({
                        updateData: dbUpdate,
                        source,
                        gameId: id
                    });
                }
            }
        }

        if (dbUpdates.size > 0) {
            for (const update of dbUpdates) {
                try {
                    if (update.source === 'deadforge') {
                        console.log("DEADFORGE DB UPDATE", update);
                        
                    }
                    const tableName = update.source === 'deadforge' ? 'deadforgeGames' : 'curatedAssets';
                    const whereCheck = update.source === 'deadforge' ? 'id = @id' : 'source = @source AND gameId = @gameId';
                    const whereCheckData = update.source === 'deadforge' ? { id: String(update.gameId) } : { source: update.source, gameId: String(update.gameId) }
                    
                    // Check if record already exists using selectRows helper
                    const existing = selectRows(db, tableName, whereCheck, whereCheckData)[0];
                    
                    if (existing) {
                        // Update existing record
                        updateRow(
                            db,
                            tableName,
                            update.updateData,
                            whereCheck,
                            whereCheckData
                        );
                    } else {
                        // Insert new record
                        const insertData = {
                            source: update.source,
                            gameId: String(update.gameId),
                            ...update.updateData
                        };
                        
                        insertRow(db, tableName, insertData, 'replace');
                    }
                    
                    console.log(`Updated ${tableName} for ${update.source} game ${update.gameId} with new media paths`);
                } catch (err: any) {
                    console.error(`Failed to update curated assets tables for ${update.source} game ${update.gameId}: ${err.message}`);
                }
            }
        }
    } catch (e) {
        console.log(e);
    }
}