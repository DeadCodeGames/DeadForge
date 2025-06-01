import { getResourcePath } from "../main";
import { spawn } from "child_process";
import { parse } from "vdf";
import fs from "fs";
import { SteamLauncherData } from "../preload";
import { join } from "path";
import { maybeConvertArray } from "./idkOtherRandomStuffLMAO";

interface BinaryVDFCache {
    [filePath: string]: {
        data: any;
        timestamp: number;
        lastModified: number;
    }
}

const vdfParserPath = getResourcePath('bin', 'VDFParser', 'VDFparse.exe');
const binaryVDFCache: BinaryVDFCache = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

// Track pending parse operations
const pendingParseOperations: Map<string, Promise<any>> = new Map();

function getCachedBinaryVDF(filePath: string): any | null {
    const cached = binaryVDFCache[filePath];
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > CACHE_TTL) {
        delete binaryVDFCache[filePath];
        return null;
    }

    // Check if file has been modified
    try {
        const stats = fs.statSync(filePath);
        if (stats.mtimeMs > cached.lastModified) {
            delete binaryVDFCache[filePath];
            return null;
        }
    } catch {
        delete binaryVDFCache[filePath];
        return null;
    }

    return cached.data;
}

function setCachedBinaryVDF(filePath: string, data: any): void {
    const stats = fs.statSync(filePath);
    binaryVDFCache[filePath] = {
        data,
        timestamp: Date.now(),
        lastModified: stats.mtimeMs
    };
}

async function performBinaryVDFParse(inputFilePath: string, ranFrom: "getInstalledSteamGames" | "getInstalledSteamDLCs" | "getInstalledSteamGamePath"): Promise<any> {
    return new Promise((resolve, reject) => {
        console.log(`spawning VDFParse from ${ranFrom}`);
        const parser = spawn(vdfParserPath, [inputFilePath]);

        const chunks: Buffer[] = [];
        let errorOutput = '';

        parser.stdout.on('data', (chunk: Buffer) => {
            chunks.push(chunk);
        });

        parser.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        parser.on('close', (code) => {
            if (code !== 0) {
                pendingParseOperations.delete(inputFilePath);
                reject(new Error(`VDFParse exited with code ${code}: ${errorOutput}`));
            } else {
                try {
                    const output = Buffer.concat(chunks).toString('utf8');
                    let json = JSON.parse(output);
                    json = Object.fromEntries(Object.entries(json).map(([key, value]) =>
                        [key, maybeConvertArray(value)]
                    ));
                    setCachedBinaryVDF(inputFilePath, json);
                    pendingParseOperations.delete(inputFilePath);
                    resolve(json);
                } catch (err: any) {
                    pendingParseOperations.delete(inputFilePath);
                    reject(new Error(`Failed to parse VDF output as JSON: ${err.message}`));
                }
            }
        });
    });
}

export function parseBinaryVDF(inputFilePath: string, ranFrom: "getInstalledSteamGames" | "getInstalledSteamDLCs" | "getInstalledSteamGamePath") {
    // Check cache first
    const cached = getCachedBinaryVDF(inputFilePath);
    const pendingOperation = pendingParseOperations.get(inputFilePath);
    if (cached && ranFrom === "getInstalledSteamGamePath") {
        console.log(`Using cached VDF data from ${ranFrom}`);
        return Promise.resolve(cached);
    } else if (pendingOperation) {
        console.log(`Waiting for existing parse operation to complete from ${ranFrom}`);
        return pendingOperation;
    } else {
        const parsePromise = performBinaryVDFParse(inputFilePath, ranFrom);
        pendingParseOperations.set(inputFilePath, parsePromise);
        return parsePromise;
    }
}

export function parseJSONVDF(inputFilePath: string) {
    const parsed = parse(fs.readFileSync(inputFilePath, 'utf-8'));
    return parsed;
}

export async function getInstalledSteamGames(appInfoVdfPath: string, libraryFoldersVdfPath: string): Promise<SteamLauncherData | null> {
    try {
        const parsedBinaryJson: any = await parseBinaryVDF(appInfoVdfPath, "getInstalledSteamGames");
        const libraryFolders = parseJSONVDF(libraryFoldersVdfPath).libraryfolders;

        const installedGameIDs = Object.values(libraryFolders)
            .map((l: any) => l.apps)
            .map(o => Object.keys(o))
            .flat()
            .map(app => Number(app));

        parsedBinaryJson.datasets = parsedBinaryJson.datasets.filter((set: any) =>
            {
                return installedGameIDs.includes(set.id)
            }
        );

        return parsedBinaryJson as SteamLauncherData;
    } catch (err: any) {
        console.error('Error reading Steam data:', err.message);
        return null;
    }
}

export async function getInstalledSteamDLCs(appInfoVdfPath: string, libraryFoldersVdfPath: string): Promise<SteamLauncherData | null> {
    try {
        const parsedBinaryJson: any = await parseBinaryVDF(appInfoVdfPath, "getInstalledSteamDLCs");

        const installedGames = await getInstalledSteamGames(appInfoVdfPath, libraryFoldersVdfPath).then((data) => data?.datasets);

        const installedDLCs = parsedBinaryJson.datasets.filter((set: any) =>{
            return set?.data?.appinfo?.common?.type === "DLC" && set?.data?.appinfo?.extended && set?.data?.appinfo?.extended?.dlcforappid && installedGames?.some((game: any) => game.id === set?.data?.appinfo?.extended?.dlcforappid)
        });

        parsedBinaryJson.datasets = installedDLCs;

        return parsedBinaryJson as SteamLauncherData;
    } catch (err: any) {
        console.error('Error reading Steam data:', err.message);
        return null;
    }
}

export async function getInstalledSteamGamePath(appInfoVdfPath: string, libraryFoldersVdfPath: string, appId: number): Promise<string | undefined> {
    try {
        const parsedBinaryJson: any = await parseBinaryVDF(appInfoVdfPath, "getInstalledSteamGamePath");
        const libraryFolders = parseJSONVDF(libraryFoldersVdfPath).libraryfolders;

        if (!(libraryFolders && parsedBinaryJson)) return undefined;

        const libraryFolderOfGame = (Object.values(libraryFolders)
            .find((l: any) => l.apps[String(appId)]) as any).path;

        if (!libraryFolderOfGame) return undefined;

        const installDirOfGame = (parsedBinaryJson as SteamLauncherData).datasets
            .find((set: any) => set.id === appId)!.data.appinfo.config.installdir;
        
        if (!installDirOfGame) return undefined;

        return join(libraryFolderOfGame, 'steamapps', 'common', installDirOfGame);
    } catch (err: any) {
        console.error('Error reading Steam data:', err.message);
        return undefined;
    }
}

export const steamLanguageMap: Record<string, string> = {
    "ar": "arabic",
    "bg": "bulgarian",
    "zh-CN": "schinese",
    "zh-TW": "tchinese",
    "cs": "czech",
    "da": "danish",
    "nl": "dutch",
    "en": "english",
    "fi": "finnish",
    "fr": "french",
    "de": "german",
    "el": "greek",
    "hu": "hungarian",
    "id": "indonesian",
    "it": "italian",
    "ja": "japanese",
    "ko": "koreana",
    "no": "norwegian",
    "pl": "polish",
    "pt": "portuguese",
    "pt-BR": "brazilian",
    "ro": "romanian",
    "ru": "russian",
    "es": "spanish",
    "es-419": "latam",
    "sv": "swedish",
    "th": "thai",
    "tr": "turkish",
    "uk": "ukrainian",
    "vi": "vietnamese"
}

export const steamLanguageMapFallbacks: Record<string, string[]> = {
    "sk": ["cs", "en"],
}