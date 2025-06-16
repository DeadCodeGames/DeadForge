import { SteamLauncherData } from "../preload";
import { LaunchOption, NormalizedDLC, NormalizedGame } from "../types";
import { join } from "path";
import { getInstalledSteamGamePath } from "./SteamStuff";
import { getFriendlyOSName } from "./idkOtherRandomStuffLMAO";

export async function normalizeCaveToGame(cave: any, games: any[]): Promise<NormalizedGame> {
    const candidates = cave.verdict?.candidates ?? [];

    const launchOptions: LaunchOption[] = candidates.map((candidate: any, index: number) => ({
        name: `Launch Option ${index + 1}`,
        executable: join(cave.verdict?.basePath, candidate.path),
        arguments: [],
        flavor: candidate.path.toLowerCase().endsWith('.html') ? 'html' : undefined
    }));

    // Map itch.io classifications to our internal types
    const classificationToType: Record<string, string> = {
        'game': 'Game',
        'tool': 'Tool',
        'game_mod': 'Mod',
        'assets': 'Dev',
        'book': 'Book',
        'soundtrack': 'Soundtrack',
        'physical_game': 'Game',
        'comic': 'Book',
        'other': 'Other'
    };

    // Find the corresponding game data
    const gameData = games.find(g => g.id === cave.game_id);

    return {
        id: cave.game_id,
        source: 'itch',
        name: gameData?.title,
        installPath: cave.verdict?.basePath,
        launchOptions,
        sizeBytes: cave.verdict?.totalSize,
        media: {
            iconUrl: undefined,
            logoUrl: undefined,
            heroUrl: undefined,
            headerUrl: undefined,
            capsuleUrl: undefined,
        },
        raw: null,
        type: classificationToType[gameData?.classification] || 'Game'
    };
}

export async function normalizeSteamEntryToGame(SteamPath: string, entry: SteamLauncherData["datasets"][number]): Promise<NormalizedGame | undefined> {
    if (!(entry.data.appinfo?.config?.launch && SteamPath !== undefined)) return undefined;
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
    const names = {
        "default": entry.data.appinfo.common.name,
        ...entry.data.appinfo.common.name_localized
    }

    return ({
        id: String(entry.id),
        source: 'steam',
        name: names,
        installPath: await getInstalledSteamGamePath(join(SteamPath, 'appcache', 'appinfo.vdf'), join(SteamPath, 'steamapps', 'libraryfolders.vdf'), entry.id),
        launchOptions,
        sizeBytes: entry.size,
        media: {
            iconUrl: entry.data.appinfo.common.icon + ".jpg",
            logoUrl: JSON.stringify(entry.data.appinfo.common?.library_assets_full?.library_logo),
            heroUrl: JSON.stringify(entry.data.appinfo.common?.library_assets_full?.library_hero),
            headerUrl: JSON.stringify(entry.data.appinfo.common?.library_assets_full?.library_header) || JSON.stringify(entry.data.appinfo.common?.header_image),
            capsuleUrl: JSON.stringify(entry.data.appinfo.common?.library_assets_full?.library_capsule) || JSON.stringify(entry.data.appinfo.common?.small_capsule),
        },
        raw: null,
        type: entry.data.appinfo.common.type === "Game" ? (entry?.data?.appinfo.extended.requiredappid ? "Mod" : "Game") : entry.data.appinfo.common.type
    })
}

export async function normalizeSteamDLCEntryToDLC(SteamPath: string, entry: SteamLauncherData["datasets"][number]): Promise<NormalizedDLC | undefined> {
    if (!entry?.data?.appinfo?.extended?.dlcforappid) return undefined;
    const names = {
        "default": entry.data.appinfo.common.name,
        ...entry.data.appinfo.common.name_localized
    }
    return {
        id: String(entry.id),
        parentGameId: String(entry.data.appinfo.extended.dlcforappid),
        source: 'steam',
        name: names,
        sizeBytes: entry.size,
        media: {
            headerUrl: JSON.stringify(entry.data.appinfo.common.header_image) || JSON.stringify(entry.data.appinfo.common.library_assets_full?.library_header),
            capsuleUrl: JSON.stringify(entry.data.appinfo.common.small_capsule) || JSON.stringify(entry.data.appinfo.common.library_assets_full?.library_capsule),
        },
        raw: null,
        type: entry.data.appinfo.common.type
    }
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
            const args: string[] = [];

            if (manifest.LaunchCommand) args.push(manifest.LaunchCommand);

            launchOptions.push({
                name: 'Default',
                executable: join(manifest.InstallLocation, executable),
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
                heroUrl: undefined,
                headerUrl: undefined,
                capsuleUrl: undefined,
            },
            raw: manifest,
            type: 'Game'
        };

        return normalizedGame;
    } catch (error) {
        console.error('Error normalizing Epic manifest:', error);
        return undefined;
    }
}

export function prepareGameForSQL(game: NormalizedGame) {
    return {
        id: game.id,
        name: typeof game.name === 'string' ? game.name : JSON.stringify(game.name),
        installPath: game.installPath ?? null,
        launchOptions: JSON.stringify(game.launchOptions ?? []),
        icon: game.media?.iconUrl ?? null,
        logo: game.media?.logoUrl ?? null,
        header: game.media?.headerUrl ?? null,
        hero: game.media?.heroUrl ?? null,
        capsule: game.media?.capsuleUrl ?? null,
        raw: null,
        type: game.type
    };
}

export function prepareDLCForSQL(dlc: NormalizedDLC) {
    return {
        id: dlc.id,
        parentGameId: dlc.parentGameId,
        name: typeof dlc.name === 'string' ? dlc.name : JSON.stringify(dlc.name),
        header: dlc.media?.headerUrl ?? null,
        capsule: dlc.media?.capsuleUrl ?? null,
        raw: null,
        type: dlc.type
    };
}
