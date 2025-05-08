import { SteamLauncherData } from "../preload";
import { LaunchOption, NormalizedGame } from "../types";
import { join } from "path";
import { getInstalledSteamGamePath } from "./SteamStuff";
import { getFriendlyOSName } from "./idkOtherRandomStuffLMAO";

export async function normalizeCaveToGame(cave: any): Promise<NormalizedGame> {
    const candidates = cave.verdict?.candidates ?? [];

    const launchOptions: LaunchOption[] = candidates.map((candidate: any, index: number) => ({
        name: `Launch Option ${index + 1}`,
        executable: candidate.path,
        arguments: [],
    }));

    return {
        id: cave.game_id,
        source: 'itch',
        name: cave.title,
        installPath: cave.verdict?.basePath,
        launchOptions,
        sizeBytes: cave.verdict?.totalSize,
        media: {
            iconUrl: undefined,
            logoUrl: undefined,
            heroUrl: undefined,
        },
        raw: null,
    };
}

export async function normalizeSteamEntryToGame(SteamPath: string, entry: SteamLauncherData["datasets"][number]): Promise<NormalizedGame | undefined> {
    if (!(entry.data.appinfo?.config?.launch)) return undefined;
    console.log({
        iconUrl: entry.data.appinfo.common.icon + ".jpg",
        logoUrl: JSON.stringify(entry.data.appinfo.common?.library_assets_full?.library_logo),
        heroUrl: JSON.stringify(entry.data.appinfo.common?.library_assets_full?.library_hero),
    })
    const launchOptions: LaunchOption[] = await Promise.all(entry.data.appinfo.config.launch
        .filter(option => (option.config?.oslist?.includes(getFriendlyOSName(process.platform)) || option.executable.endsWith(".exe")))
        .map(async (option, index) => ({
            name: option.description || `Launch Option ${index + 1}`,
            executable: join(
                await getInstalledSteamGamePath(
                    join(SteamPath, 'appcache', 'appinfo.vdf'),
                    join(SteamPath, 'steamapps', 'libraryfolders.vdf'),
                    entry.id
                ) as string,
                option.executable
            ),
            arguments: option.arguments ? [option.arguments] : [],
        })));

    return ({
        id: String(entry.id),
        source: 'steam',
        name: entry.data.appinfo.common.name,
        installPath: await getInstalledSteamGamePath(join(SteamPath, 'appcache', 'appinfo.vdf'), join(SteamPath, 'steamapps', 'libraryfolders.vdf'), entry.id),
        launchOptions,
        sizeBytes: entry.size,
        media: {
            iconUrl: entry.data.appinfo.common.icon + ".jpg",
            logoUrl: JSON.stringify(entry.data.appinfo.common?.library_assets_full?.library_logo),
            heroUrl: JSON.stringify(entry.data.appinfo.common?.library_assets_full?.library_hero),
        },
        raw: null,
    })
}

export function normalizeEpicManifestToGame(manifest: any): NormalizedGame | undefined {
    try {
        // Basic validation - ensure we have required fields
        if (!manifest || !manifest.InstallationGuid || !manifest.DisplayName) {
            return undefined;
        }

        // Create the launch option if we have the necessary data
        const launchOptions: LaunchOption[] = [];
        if (manifest.LaunchExecutable) {
            const executable = manifest.LaunchExecutable;
            let args: string[] = [];

            if (manifest.LaunchCommand) args.push(manifest.LaunchCommand);

            launchOptions.push({
                name: 'Default',
                executable,
                arguments: args
            });
        }

        // Construct the normalized game object
        const normalizedGame: NormalizedGame = {
            id: manifest.AppName,
            source: 'epic',
            name: manifest.DisplayName,
            installPath: manifest.InstallLocation,
            launchOptions: launchOptions.length > 0 ? launchOptions : undefined,
            sizeBytes: manifest.InstallSize || undefined,
            media: {
                iconUrl: undefined,
                logoUrl: undefined,
                heroUrl: undefined
            },
            raw: manifest
        };

        return normalizedGame;
    } catch (error) {
        console.error('Error normalizing Epic manifest:', error);
        return undefined;
    }
}

export function prepareGameForSQL(game: NormalizedGame) {
    console.log(game);
    return {
        id: game.id,
        name: game.name,
        installPath: game.installPath ?? null,
        launchOptions: JSON.stringify(game.launchOptions ?? []),
        icon: game.media?.iconUrl ?? `%USERDATA%/game_assets/${game.id}.icon.png`,
        logo: game.media?.logoUrl ?? `%USERDATA%/game_assets/${game.id}.logo.png`,
        header: game.media?.heroUrl ?? `%USERDATA%/game_assets/${game.id}.header.png`,
        raw: null,
    };
}
