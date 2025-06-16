import type { Software } from "../types";
import axios from "axios";
import { BrowserWindow, app } from "electron";
import * as path from "path";
import * as fs from "fs";
import * as fsPromises from "fs/promises";
import AdmZip from "adm-zip";
import { HKEY, RegistryValueType, setValue, createKey } from "registry-js";
import { updateRow } from "./dbHelpers";
import getDB from "./DataDB";

const SOFTWARE_LIST_URL = "https://deadcode.is-a.dev/DeadForge/store/data/software.json";
const REGISTRY_BASE_PATH = "Software\\DeadForge\\Software";

interface GitHubRelease {
    tag_name: string;
    assets: Array<{
        name: string;
        browser_download_url: string;
        size: number;
    }>;
}

interface LaunchOption {
    name: string;
    executable: string;
    arguments: string[];
}

export class InstallationError extends Error {
    // eslint-disable-next-line no-unused-vars
    constructor(message: string, public readonly code: string) {
        super(message);
        this.name = "InstallationError";
    }
}

interface InstallationResult {
    success: boolean;
    error: { message: string; code: string } | null;
    software?: Software;
    installPath?: string;
    size?: number;
}

async function ensureTempDirectory(): Promise<string> {
    const tempDir = path.join(app.getPath("temp"), "deadforge", "downloads");
    await fsPromises.mkdir(tempDir, { recursive: true });
    return tempDir;
}

async function downloadFile(url: string, destination: string, mainWindow: BrowserWindow, gameId: string): Promise<void> {
    const response = await axios({
        method: 'GET',
        url: url,
        responseType: 'stream',
        onDownloadProgress: (progressEvent) => {
            if (progressEvent.total) {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                mainWindow.webContents.send('game:stateChange', 'deadforge', gameId, 'downloading', percentCompleted);
            }
        }
    });

    const writer = fs.createWriteStream(destination);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

export async function fetchSoftwareList(): Promise<Software[]> {
    try {
        const response = await axios.get<Software[]>(SOFTWARE_LIST_URL);
        return response.data;
    } catch (error) {
        console.error("Failed to fetch software list:", error);
        throw new InstallationError("Failed to fetch software list", "FETCH_SOFTWARE_LIST_FAILED");
    }
}

async function validateAndFetchReleases(software: Software): Promise<GitHubRelease[]> {
    if (!software.releasesSource || !software.releasesLink) {
        throw new InstallationError(
            `Software ${software.id} is missing release information`,
            "MISSING_RELEASE_INFO"
        );
    }

    // TypeScript will ensure this is exhaustive if we add more release sources
    switch (software.releasesSource) {
        case "github":
            try {
                const response = await axios.get<GitHubRelease[]>(software.releasesLink);
                return response.data;
            } catch (error) {
                console.error(`Failed to fetch releases for ${software.id}:`, error);
                throw new InstallationError(
                    `Failed to fetch releases for ${software.id}`,
                    "FETCH_RELEASES_FAILED"
                );
            }
        default:
            throw new InstallationError(
                `Unsupported release source: ${software.releasesSource}`,
                "UNSUPPORTED_RELEASE_SOURCE"
            );
    }
}

function getNewestReleaseFullPackage(releases: GitHubRelease[]): { downloadUrl: string; size: number; tag_name: string } {
    if (releases.length === 0) {
        throw new InstallationError("No releases found", "NO_RELEASES_FOUND");
    }
    
    const newestRelease = releases[0];
    const releaseAsset = newestRelease.assets.find(asset => asset.name === "release.zip");
    
    if (!releaseAsset) {
        throw new InstallationError(
            `No release.zip found in latest release ${newestRelease.tag_name}`,
            "NO_RELEASE_ASSET"
        );
    }

    return {
        downloadUrl: releaseAsset.browser_download_url,
        size: releaseAsset.size,
        tag_name: newestRelease.tag_name
    };
}

function updateRegistry(gameId: string, installPath: string, version: string, size: number) {
    try {
        const keyPath = `${REGISTRY_BASE_PATH}\\${gameId}`;
        const now = new Date().toISOString();
        
        // Create the registry key if it doesn't exist
        createKey(HKEY.HKEY_CURRENT_USER, keyPath);
        
        setValue(
            HKEY.HKEY_CURRENT_USER,
            keyPath,
            "InstallPath",
            RegistryValueType.REG_SZ,
            installPath
        );
        
        setValue(
            HKEY.HKEY_CURRENT_USER,
            keyPath,
            "Version",
            RegistryValueType.REG_SZ,
            version
        );
        
        setValue(
            HKEY.HKEY_CURRENT_USER,
            keyPath,
            "InstallDate",
            RegistryValueType.REG_SZ,
            now
        );
        
        setValue(
            HKEY.HKEY_CURRENT_USER,
            keyPath,
            "LastUpdated",
            RegistryValueType.REG_SZ,
            now
        );
        
        setValue(
            HKEY.HKEY_CURRENT_USER,
            keyPath,
            "Size",
            RegistryValueType.REG_DWORD,
            String(size)
        );
        
        return true;
    } catch (error) {
        console.error("Failed to update registry:", error);
        return false;
    }
}

async function getDirectorySize(dirPath: string): Promise<number> {
    let totalSize = 0;
    
    async function calculateSize(currentPath: string) {
        const stats = await fsPromises.stat(currentPath);
        
        if (stats.isDirectory()) {
            const files = await fsPromises.readdir(currentPath);
            for (const file of files) {
                await calculateSize(path.join(currentPath, file));
            }
        } else {
            totalSize += stats.size;
        }
    }
    
    await calculateSize(dirPath);
    return totalSize;
}

async function fetchExecutableOptions(releases: GitHubRelease[], installPath: string): Promise<LaunchOption[]> {
    const launchOptions: LaunchOption[] = [];
    
    const newestRelease = releases[0];
    
    // Find all executable option files
    const optionFiles = newestRelease.assets.filter(asset => 
        asset.name.match(/^executable-option-\d+\.txt$/)
    );
    
    // Sort them by the number in the filename
    optionFiles.sort((a, b) => {
        const numA = parseInt(a.name.match(/executable-option-(\d+)\.txt/)?.[1] || "0");
        const numB = parseInt(b.name.match(/\d+/)?.[0] || "0");
        return numA - numB;
    });
    
    // Download and parse each file
    for (const file of optionFiles) {
        try {
            const response = await axios.get(file.browser_download_url);
            const content = response.data as string;
            const lines = content.split('\n').map(line => line.trim());
            
            if (lines.length >= 3) {
                const [name, executable, argsStr] = lines;
                let args: string[] = [];
                
                try {
                    args = JSON.parse(argsStr);
                } catch {
                    // If parsing fails, use empty array
                    args = [];
                }
                
                // Resolve the executable path relative to install path
                const resolvedExecutable = path.join(installPath, executable);
                
                launchOptions.push({
                    name,
                    executable: resolvedExecutable,
                    arguments: args
                });
            }
        } catch (error) {
            console.error(`Failed to parse executable option file ${file.name}:`, error);
        }
    }
    
    return launchOptions;
}

export async function installDeadForgeGame(gameId: string, installPath: string, mainWindow: BrowserWindow): Promise<InstallationResult> {
    try {
        // Set initial state to downloading
        mainWindow.webContents.send('game:stateChange', 'deadforge', gameId, 'downloading', 0);

        // Fetch software list and validate
        const softwareList = await fetchSoftwareList();
        const software = softwareList.find(s => s.id === gameId);
        
        if (!software) {
            mainWindow.webContents.send('game:stateChange', 'deadforge', gameId, 'idle');
            throw new InstallationError('Software not found', 'NOT_FOUND');
        }

        // Get releases and validate
        const releases = await validateAndFetchReleases(software);
        if (!releases || releases.length === 0) {
            mainWindow.webContents.send('game:stateChange', 'deadforge', gameId, 'idle');
            throw new InstallationError('No releases found', 'NO_RELEASES');
        }

        const { downloadUrl } = getNewestReleaseFullPackage(releases);

        // Create temp directory
        const tempDir = await ensureTempDirectory();
        const downloadPath = path.join(tempDir, `${gameId}.zip`);

        // Download the file
        await downloadFile(downloadUrl, downloadPath, mainWindow, gameId);

        // Set state to installing
        mainWindow.webContents.send('game:stateChange', 'deadforge', gameId, 'installing', "library.install.copyingFiles");

        // Extract and install
        try {
            // Ensure the installation directory exists
            await fsPromises.mkdir(installPath, { recursive: true });
            
            // Extract the downloaded zip file to the installation directory using adm-zip
            const zip = new AdmZip(downloadPath);
            zip.extractAllTo(installPath, true);
            
            // Clean up the downloaded zip file
            await fsPromises.unlink(downloadPath);
        } catch (error) {
            // Clean up the downloaded file if extraction fails
            try {
                await fsPromises.unlink(downloadPath);
            } catch (cleanupError) {
                console.error("Failed to clean up downloaded file:", cleanupError);
            }
            throw new InstallationError(
                `Failed to install game: ${(error as Error).message}`,
                "INSTALLATION_FAILED"
            );
        }

        // After successful extraction, calculate actual installation size
        const actualSize = await getDirectorySize(installPath);
        const currentTime = Math.floor(Date.now() / 1000);
        const version = releases[releases.length - 1].tag_name;
        const db = getDB();

        mainWindow.webContents.send('game:stateChange', 'deadforge', gameId, 'installing', "library.install.updatingDeadForgeDB");

        // Fetch executable options
        const launchOptions = await fetchExecutableOptions(releases, installPath);

        // Update database with actual size and launch options
        const updateDBRes = updateRow(db, "deadforgeGames", {
            launchOptions: JSON.stringify(launchOptions),
            installedVersion: version,
            installed: "true",
            lastUpdated: currentTime,
            installPath,
            installSize: actualSize
        }, `id = @id`, { id: gameId });

        console.log(updateDBRes);

        mainWindow.webContents.send('game:stateChange', 'deadforge', gameId, 'installing', "library.install.updatingWindowsRegistry");

        // Update registry with actual size
        updateRegistry(gameId, installPath, version, actualSize);

        // Set state back to idle on success
        mainWindow.webContents.send('game:stateChange', 'deadforge', gameId, 'idle');

        return {
            success: true,
            error: null,
            software,
            installPath,
            size: actualSize
        };
    } catch (error) {
        // Set state back to idle on error
        mainWindow.webContents.send('game:stateChange', 'deadforge', gameId, 'idle');
        
        if (error instanceof InstallationError) {
            return {
                success: false,
                error: {
                    message: error.message,
                    code: error.code
                }
            };
        }
        
        return {
            success: false,
            error: {
                message: error instanceof Error ? error.message : 'Unknown error occurred',
                code: 'UNKNOWN_ERROR'
            }
        };
    }
}

export async function getGameDownloadSize(gameId: string): Promise<{ success: boolean; size?: number; error?: string }> {
    try {
        const softwareList = await fetchSoftwareList();
        const software = softwareList.find(item => item.id === gameId);
        
        if (!software) {
            throw new Error(`Game with ID ${gameId} not found in software list`);
        }

        const releases = await validateAndFetchReleases(software);
        const { size } = getNewestReleaseFullPackage(releases);
        
        return { success: true, size };
    } catch (error) {
        console.error('Failed to get download size:', error);
        return { success: false, error: (error as Error).message };
    }
}