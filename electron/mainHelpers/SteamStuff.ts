import { getResourcePath } from "../main";
import { spawn } from "child_process";
import { parse } from "vdf";
import fs from "fs";
import { SteamLauncherData } from "../preload";
import { join } from "path";
import { maybeConvertArray } from "./idkOtherRandomStuffLMAO";

const vdfParserPath = getResourcePath('bin', 'VDFParser', 'VDFparse.exe');

export function parseJSONVDF(inputFilePath: string) {
    let parsed = parse(fs.readFileSync(inputFilePath, 'utf-8'));
    return parsed;
}

export function parseBinaryVDF(inputFilePath: string) {
    return new Promise((resolve, reject) => {
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
                reject(new Error(`VDFParse exited with code ${code}: ${errorOutput}`));
            } else {
                try {
                    const output = Buffer.concat(chunks).toString('utf8');
                    let json = JSON.parse(output);
                    json = Object.fromEntries(Object.entries(json).map(([key, value]) =>
                        [key, maybeConvertArray(value)]
                    ));
                    resolve(json);
                } catch (err: any) {
                    reject(new Error(`Failed to parse VDF output as JSON: ${err.message}`));
                }
            }
        });
    });
}

export async function getInstalledSteamGames(appInfoVdfPath: string, libraryFoldersVdfPath: string): Promise<SteamLauncherData | null> {
    try {
        const parsedBinaryJson: any = await parseBinaryVDF(appInfoVdfPath);
        const libraryFolders = parseJSONVDF(libraryFoldersVdfPath).libraryfolders;

        const installedGameIDs = Object.values(libraryFolders)
            .map((l: any) => l.apps)
            .map(o => Object.keys(o))
            .flat()
            .map(app => Number(app));

        parsedBinaryJson.datasets = parsedBinaryJson.datasets.filter((set: any) =>
            installedGameIDs.includes(set.id)
        );

        return parsedBinaryJson as SteamLauncherData;
    } catch (err: any) {
        console.error('Error reading Steam data:', err.message);
        return null;
    }
}

export async function getInstalledSteamGamePath(appInfoVdfPath: string, libraryFoldersVdfPath: string, appId: number): Promise<string | undefined> {
    try {
        const parsedBinaryJson: any = await parseBinaryVDF(appInfoVdfPath);
        const libraryFolders = parseJSONVDF(libraryFoldersVdfPath).libraryfolders;

        if (!(libraryFolders && parsedBinaryJson)) return undefined;

        const libraryFolderOfGame = (Object.values(libraryFolders)
            .find((l: any) => l.apps[String(appId)]) as any).path;

        if (!libraryFolderOfGame) return undefined;

        const installDirOfGame = (parsedBinaryJson as SteamLauncherData).datasets
            .find((set: any) => set.id === appId)!.data.appinfo.config.installdir;
        
        if (!installDirOfGame) return undefined;

        return join(libraryFolderOfGame, installDirOfGame);
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