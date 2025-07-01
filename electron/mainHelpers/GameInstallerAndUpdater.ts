import type { Software } from "../types";
import axios from "axios";
import { BrowserWindow, app } from "electron";
import * as path from "path";
import * as fs from "fs";
import * as fsPromises from "fs/promises";
import AdmZip from "adm-zip";
import { HKEY, RegistryValueType, setValue, createKey } from "registry-js";
import { updateRow, selectRows } from "./dbHelpers";
import getDB from "./DataDB";
import { notifyGamesUpdate } from "../main";

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

export class DownloadError extends Error {
    // eslint-disable-next-line no-unused-vars
    constructor(message: string, public readonly code: string) {
        super(message);
        this.name = "DownloadError";
    }
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

    const newestRelease = releases[releases.length - 2];

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

// Fetches user-data-files.txt from the newest release, splits by lines, returns array
async function fetchUserDataFiles(releases: GitHubRelease[]): Promise<string[]> {
    // Find the newest release (same logic as getNewestReleaseFullPackage)
    const newestRelease = releases[releases.length - 2];
    const userDataFileAsset = newestRelease.assets.find(asset => asset.name === "user-data-files.txt");
    if (!userDataFileAsset) return [];
    try {
        const response = await axios.get(userDataFileAsset.browser_download_url);
        const content = response.data as string;
        return content.split('\n').map(line => line.trim()).filter(Boolean);
    } catch (error) {
        console.error(`Failed to fetch user-data-files.txt:`, error);
        return [];
    }
}

// Helper: Clean install directory except for user data files
async function cleanInstallDirectory(installPath: string, userDataFiles: string[]) {
    const keepSet = new Set(userDataFiles.map(rel => path.resolve(installPath, rel)));
    async function removeExcept(currentPath: string) {
        const entries = await fsPromises.readdir(currentPath, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(currentPath, entry.name);
            if (keepSet.has(fullPath)) continue;
            if (entry.isDirectory()) {
                await fsPromises.rm(fullPath, { recursive: true, force: true });
            } else {
                await fsPromises.unlink(fullPath);
            }
        }
    }
    await removeExcept(installPath);
}

export async function installDeadForgeGame(gameId: string, installPath: string, mainWindow: BrowserWindow, reinstall?: boolean): Promise<InstallationResult> {
    let actualInstallPath = installPath;
    let userDataFilesArr: string[] = [];
    let preservedPaths: { src: string, dest: string }[] = [];
    let tempPreserveDir: string | undefined;
    try {
        const db = getDB();
        if (reinstall) {
            // Fetch installPath and userDataFiles from DB
            const row = selectRows(db, "deadforgeGames", `id = @id`, { id: gameId })[0];
            if (!row || !row.installPath) {
                mainWindow.webContents.send('game:stateChange', 'deadforge', gameId, 'idle');
                throw new InstallationError('Install path not found for reinstall', 'INSTALL_PATH_NOT_FOUND');
            }
            actualInstallPath = row.installPath;
            try {
                userDataFilesArr = row.userDataFiles ? JSON.parse(row.userDataFiles) : [];
            } catch {
                userDataFilesArr = [];
            }
            // Preserve user data files
            tempPreserveDir = path.join(await ensureTempDirectory(), `${gameId}-preserve`);
            await fsPromises.mkdir(tempPreserveDir, { recursive: true });
            mainWindow.webContents.send('game:stateChange', 'deadforge', gameId, 'preparing', "library.install.backingUpUserDataFiles")
            preservedPaths = [];
            for (const relPath of userDataFilesArr) {
                const src = path.resolve(actualInstallPath, relPath);
                const dest = path.resolve(tempPreserveDir, path.basename(relPath));
                try {
                    await fsPromises.copyFile(src, dest);
                    preservedPaths.push({ src, dest });
                } catch {
                    // Ignore if file doesn't exist
                }
            }
            mainWindow.webContents.send('game:stateChange', 'deadforge', gameId, 'installing', "library.install.cleaningUp")
            // Clean install directory except for user data files
            await cleanInstallDirectory(actualInstallPath, userDataFilesArr);
        }

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
        try {
            mainWindow.webContents.send('game:stateChange', 'deadforge', gameId, 'downloading', 0);
            await downloadFile(downloadUrl, downloadPath, mainWindow, gameId);
        } catch (e) {
            console.error(`Failed to download file:`, e);
            throw new InstallationError(
                `Failed to download game files: ${(e as Error).message}`,
                'DOWNLOAD_FAILED'
            );
        }

        // Set state to installing
        mainWindow.webContents.send('game:stateChange', 'deadforge', gameId, 'installing', "library.install.copyingFiles");

        // Extract and install
        try {
            // Ensure the installation directory exists
            await fsPromises.mkdir(actualInstallPath, { recursive: true });

            // Extract the downloaded zip file to the installation directory using adm-zip
            const zip = new AdmZip(downloadPath);
            zip.extractAllTo(actualInstallPath, true);

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

        // Restore preserved user data files if reinstall
        if (reinstall && preservedPaths.length > 0 && tempPreserveDir) {
            mainWindow.webContents.send('game:stateChange', 'deadforge', gameId, 'finishing', "library.install.restoringUserDataFiles")
            for (const { src, dest } of preservedPaths) {
                try {
                    await fsPromises.copyFile(dest, src);
                    await fsPromises.unlink(dest);
                } catch {
                    // Ignore errors
                }
            }
            // Optionally remove the tempPreserveDir
            try { await fsPromises.rmdir(tempPreserveDir); } catch { }
        }

        // After successful extraction, calculate actual installation size
        const actualSize = await getDirectorySize(actualInstallPath);
        const currentTime = Math.floor(Date.now() / 1000);
        const version = releases[releases.length - 2].tag_name;

        mainWindow.webContents.send('game:stateChange', 'deadforge', gameId, 'finishing', "library.install.updatingDeadForgeDB");

        // Fetch executable options
        const launchOptions = await fetchExecutableOptions(releases, actualInstallPath);
        // Fetch user data files

        userDataFilesArr = await fetchUserDataFiles(releases);

        // Update database with actual size, launch options, and user data files
        updateRow(getDB(), "deadforgeGames", {
            launchOptions: JSON.stringify(launchOptions),
            installedVersion: version,
            installed: "true",
            lastUpdated: currentTime,
            installPath: actualInstallPath,
            installSize: actualSize,
            updateAvailable: "",
            userDataFiles: JSON.stringify(userDataFilesArr)
        }, `id = @id`, { id: gameId });

        mainWindow.webContents.send('game:stateChange', 'deadforge', gameId, 'finishing', "library.install.updatingWindowsRegistry");

        // Update registry with actual size
        updateRegistry(gameId, actualInstallPath, version, actualSize);

        // Set state back to idle on success
        mainWindow.webContents.send('game:stateChange', 'deadforge', gameId, 'checking');

        checkForDeadForgeGameUpdates(gameId).then(() => mainWindow.webContents.send('game:stateChange', 'deadforge', gameId, 'idle'));

        return {
            success: true,
            error: null,
            software,
            installPath: actualInstallPath,
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

// Checks for updates for one or more DeadForge games and updates the updateAvailable column accordingly
export async function checkForDeadForgeGameUpdates<const ID extends string>(...ids: ID[]): Promise<Record<ID, "" | "update" | "reinstall">> {
    const db = getDB();
    const softwareList = await fetchSoftwareList();
    const result = {} as Record<ID, "" | "update" | "reinstall">;

    for (const gameId of ids) {
        // Get the installed game row
        const row = selectRows(db, "deadforgeGames", `id = @id`, { id: gameId })[0];
        if (!row) {
            result[gameId] = "reinstall";
            continue;
        }
        const installedVersion = row.installedVersion;
        if (!installedVersion) {
            result[gameId] = "reinstall";
            continue;
        }

        // Find the software entry
        const software = softwareList.find(s => s.id === gameId);
        if (!software) {
            result[gameId] = "reinstall";
            continue;
        }

        // Fetch releases
        let releases: GitHubRelease[] = [];
        try {
            releases = await validateAndFetchReleases(software);
        } catch {
            result[gameId] = "reinstall";
            continue;
        }
        if (!releases || releases.length === 0) {
            result[gameId] = "";
            continue;
        }

        // Get all release tags and the latest release tag
        const releaseTags = releases.map(r => r.tag_name);
        const latestReleaseTag = releases[0].tag_name;

        let updateAvailable: "" | "update" | "reinstall" = "";
        if (installedVersion === latestReleaseTag) {
            updateAvailable = ""; // Up to date
        } else if (releaseTags.includes(installedVersion)) {
            updateAvailable = "update"; // Update available
        } else {
            updateAvailable = "reinstall"; // Installed version not found in releases
        }

        // Update the database
        updateRow(db, "deadforgeGames", { updateAvailable }, `id = @id`, { id: gameId });
        result[gameId] = updateAvailable;
    }
    notifyGamesUpdate();
    return result;
}

/**
 * Applies a single patch.zip to the install directory.
 * @param patchZipPath Path to the downloaded patch.zip
 * @param installPath Path to the game installation directory
 */
async function applyPatchZip(patchZipPath: string, installPath: string): Promise<boolean> {
    try {
        console.log(patchZipPath);
        const zip = new AdmZip(patchZipPath);
        const tempExtractDir = path.join(installPath, ".deadforge_patch_temp", path.basename(patchZipPath, ".zip"));
        await fsPromises.mkdir(tempExtractDir, { recursive: true });
        zip.extractAllTo(tempExtractDir, true);

        // Read and parse diff
        const diffPath = path.join(tempExtractDir, "diff");
        const contentsDir = path.join(tempExtractDir, "contents");
        console.log(diffPath, contentsDir);
        let diffLines: string[] = [];
        try {
            const diffContent = await fsPromises.readFile(diffPath, "utf-8");
            diffLines = diffContent.split(/\r?\n/).filter(Boolean);
        } catch {
            throw new InstallationError("Patch diff file missing or unreadable", "PATCH_DIFF_MISSING");
        }

        // Apply diff
        for (const line of diffLines) {
            const [op, ...rest] = line.split(/\s+/);
            const relPath = rest.join(" ").trim();
            const targetPath = path.join(installPath, relPath);
            const sourcePath = path.join(contentsDir, relPath);
            try {
                if (op === "A" || op === "M") {
                    // Ensure parent directory exists
                    await fsPromises.mkdir(path.dirname(targetPath), { recursive: true });
                    // Copy file from contents
                    await fsPromises.copyFile(sourcePath, targetPath);
                } else if (op === "D") {
                    // Delete file if exists
                    try {
                        await fsPromises.unlink(targetPath);
                    } catch (e) {
                        console.error(e)
                    }
                }
            } catch (error) {
                console.error(error)
            }
        }
        // Clean up temp extract dir
        await fsPromises.rm(tempExtractDir, { recursive: true, force: true });
        return true;
    } catch (e) {
        console.log(e)
        return false;
    }
}

/**
 * Updates a DeadForge game by applying all patch.zip files from the installed version up to the latest.
 */
export async function updateDeadForgeGame(gameId: string, mainWindow: BrowserWindow): Promise<InstallationResult> {
    try {
        const db = getDB();
        // Get installed game row
        const row = selectRows(db, "deadforgeGames", `id = @id`, { id: gameId })[0];
        if (!row || !row.installPath) {
            mainWindow.webContents.send('game:stateChange', 'deadforge', gameId, 'idle');
            throw new InstallationError('Install path not found for update', 'INSTALL_PATH_NOT_FOUND');
        }
        const installPath = row.installPath;
        const installedVersion = row.installedVersion;
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
        // Find installed version index
        const releaseTags = releases.map(r => r.tag_name);
        const installedIdx = releaseTags.indexOf(installedVersion);
        if (installedIdx === -1) {
            mainWindow.webContents.send('game:stateChange', 'deadforge', gameId, 'idle');
            throw new InstallationError('Installed version not found in releases', 'INSTALLED_VERSION_NOT_FOUND');
        }
        if (installedIdx === 0) {
            // Already latest
            return { success: true, error: null, software, installPath };
        }
        // Get patch releases to apply (from installedIdx-1 down to 0, reversed for oldest to newest)
        const patchReleases = releases.slice(0, installedIdx).reverse();
        const totalPatches = patchReleases.length;
        const tempDir = await ensureTempDirectory();
        // First, download all patch.zip files
        const patchZipPaths: string[] = [];
        let currentPatch = 0;
        for (const release of patchReleases) {
            currentPatch++;
            const patchAsset = release.assets.find(a => a.name === "patch.zip");
            if (!patchAsset) {
                throw new InstallationError(`patch.zip not found in release ${release.tag_name}`, 'PATCH_NOT_FOUND');
            }
            const patchZipPath = path.join(tempDir, `${gameId}-patch-${release.tag_name}.zip`);
            mainWindow.webContents.send('game:stateChange', 'deadforge', gameId, 'downloadingPatch', 0, currentPatch, totalPatches);
            await downloadFileWithProgress(patchAsset.browser_download_url, patchZipPath, mainWindow, gameId, currentPatch, totalPatches);
            patchZipPaths.push(patchZipPath);
        }
        // Then, apply all patches in order
        currentPatch = 0;
        console.log(patchZipPaths.map((v, i) => [i, v] as [number, string]));
        for (const [i, patchZipPath] of patchZipPaths.map((v, i) => [i, v] as [number, string])) {
            currentPatch = i + 1;
            mainWindow.webContents.send('game:stateChange', 'deadforge', gameId, 'applyingPatch', `library.update.applyingPatch`, currentPatch, totalPatches);
            await applyPatchZip(patchZipPath, installPath);
            await fsPromises.unlink(patchZipPath);
        }
        // After all patches, update DB/registry as in install
        const actualSize = await getDirectorySize(installPath);
        const currentTime = Math.floor(Date.now() / 1000);
        const version = releases[0].tag_name;
        mainWindow.webContents.send('game:stateChange', 'deadforge', gameId, 'finishing', "library.install.updatingDeadForgeDB");
        // Fetch executable options
        const launchOptions = await fetchExecutableOptions(releases, installPath);
        // Fetch user data files
        const userDataFilesArr = await fetchUserDataFiles(releases);
        // Update database
        updateRow(getDB(), "deadforgeGames", {
            launchOptions: JSON.stringify(launchOptions),
            installedVersion: version,
            installed: "true",
            lastUpdated: currentTime,
            installPath: installPath,
            installSize: actualSize,
            updateAvailable: "",
            userDataFiles: JSON.stringify(userDataFilesArr)
        }, `id = @id`, { id: gameId });
        mainWindow.webContents.send('game:stateChange', 'deadforge', gameId, 'finishing', "library.install.updatingWindowsRegistry");
        updateRegistry(gameId, installPath, version, actualSize);
        mainWindow.webContents.send('game:stateChange', 'deadforge', gameId, 'checking');
        checkForDeadForgeGameUpdates(gameId).then(() => mainWindow.webContents.send('game:stateChange', 'deadforge', gameId, 'idle'));
        return {
            success: true,
            error: null,
            software,
            installPath,
            size: actualSize
        };
    } catch (error) {
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

// Helper for downloadFile with progress and patch info
async function downloadFileWithProgress(url: string, destination: string, mainWindow: BrowserWindow, gameId: string, currentFile: number, totalFiles: number): Promise<void> {
    const response = await axios({
        method: 'GET',
        url: url,
        responseType: 'stream',
        onDownloadProgress: (progressEvent) => {
            if (progressEvent.total) {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                mainWindow.webContents.send('game:stateChange', 'deadforge', gameId, 'downloading', percentCompleted, currentFile, totalFiles);
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