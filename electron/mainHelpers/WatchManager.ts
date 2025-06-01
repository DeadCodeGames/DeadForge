//
import { EventEmitter } from "events";
import chokidar, { FSWatcher } from "chokidar";
import path from 'path';
import { getPathsFromDB } from "./DataDB";
import { readItchDB } from "./ItchStuff";
import { default as db } from "./DataDB";
import { normalizeCaveToGame, normalizeEpicManifestToGame, normalizeSteamDLCEntryToDLC, normalizeSteamEntryToGame, prepareDLCForSQL, prepareGameForSQL } from "./GameNormalizer";
import { deleteRow, insertRow, selectRows } from "./dbHelpers";
import { getInstalledSteamDLCs, getInstalledSteamGames } from "./SteamStuff";
import { getInstalledEpicGames } from "./EpicStuff";
import { NormalizedDLC, NormalizedGame } from "../types";
import { notifyGamesUpdate } from "../main";
import { DownloadCuratedAssets } from "./AssetsDownloader";

type Watchers = {
    steamInfo?: FSWatcher;
    steamFolders?: FSWatcher;
    epic?: FSWatcher;
    itchio?: FSWatcher;
};

const watchers: Watchers = {};
const emitter = new EventEmitter();

const processing = {
    steam: false,
    itch: false,
    epic: false
}

function getLauncherEntry(source: 'steam' | 'epic' | 'itch'): NormalizedGame {
    const paths = getPathsFromDB();

    let launchOptions: { name: string; executable: string; arguments: string[] }[] = [], installPath: string | undefined;

    switch (source) {
        case 'steam': {
            const steamPath = paths.steam;
            if (steamPath) {
                launchOptions = [{
                    name: "Launch",
                    executable: path.join(steamPath, 'Steam.exe'),
                    arguments: []
                }];
                installPath = steamPath;
            }
            break;
        }
        case 'epic': {
            const epicExe = paths.epic_exe;
            if (epicExe) {
                launchOptions = [{
                    name: "Launch",
                    executable: epicExe,
                    arguments: []
                }];
                installPath = epicExe.split("\\Launcher")[0];
            }
            break;
        }
        case 'itch': {
            const itchBasePath = paths.itchio_exe;
            if (itchBasePath) {
                launchOptions = [{
                    name: "Launch",
                    executable: path.join(itchBasePath, 'CONST_ITCHEXEC'),
                    arguments: []
                }];
                installPath = itchBasePath;
            }
            break;
        }
    }

    return {
        id: '-1',
        source,
        name: {
            steam: "Steam",
            epic: "Epic Games Launcher",
            itch: "itch",
        }[source],
        type: "Launcher",
        installPath,
        launchOptions,
    };
}

function insertGamesTransaction(
    table: string,
    currentIds: Set<string>,
    newIds: Set<string>,
    normalizedGames: NormalizedGame[]
) {
    const runTransaction = db().transaction((games) => {
        for (const id of currentIds) {
            if (!newIds.has(id)) {
                deleteRow(db(), table, { id });
            }
        }
        for (const game of games) {
            const sqlData = prepareGameForSQL(game);
            insertRow(db(), table, sqlData, 'replace');
            DownloadCuratedAssets({ source: game.source, id: game.id });
        }
    });

    runTransaction(normalizedGames);
}

function insertDLCsTransaction(
    table: string,
    currentIds: Set<string>,
    newIds: Set<string>,
    normalizedDLCs: NormalizedDLC[]
) {
    const runTransaction = db().transaction((dlcs) => {
        for (const id of currentIds) {
            if (!newIds.has(id)) {
                deleteRow(db(), table, { id });
            }
        }
        for (const dlc of dlcs) {
            const sqlData = prepareDLCForSQL(dlc);
            insertRow(db(), table, sqlData, 'replace');
        }
    });

    runTransaction(normalizedDLCs);
}

async function watchSteam(path: string | undefined) {
    processing.steam = true
    watchers.steamInfo?.close();
    watchers.steamFolders?.close();
    if (!path) return;

    const watchSteamHelper = async () => {
        const gamesData = await getInstalledSteamGames(`${path}/appcache/appinfo.vdf`, `${path}/steamapps/libraryfolders.vdf`);
        const dlcsData = await getInstalledSteamDLCs(`${path}/appcache/appinfo.vdf`, `${path}/steamapps/libraryfolders.vdf`);
        if (!gamesData || !dlcsData) return;

        const currentSteamGamesDB = selectRows(db(), 'steamGames');
        const currentSteamDLCsDB = selectRows(db(), 'steamDLCs');
        const currentSteamGamesIds = new Set(currentSteamGamesDB.map((row: any) => row.id));
        const currentSteamDLCsIds = new Set(currentSteamDLCsDB.map((row: any) => row.id));
        const newGameIds = new Set(gamesData.datasets.filter((game: any) => game.data.appinfo.type !== "DLC").map(game => String(game.id)));
        const newDLCIds = new Set(dlcsData.datasets.filter((game: any) => game.data.appinfo.type === "DLC").map(game => String(game.data.appinfo.extended.dlcforappid)));

        const datasets = [...gamesData.datasets, ...dlcsData.datasets];
        const normalizedGames: NormalizedGame[] = [];
        const normalizedDLCs: NormalizedDLC[] = [];
        
        for (const dataset of datasets) {
            const normalizedGame = await normalizeSteamEntryToGame(path, dataset);
            const normalizedDLC = await normalizeSteamDLCEntryToDLC(path, dataset);
            if (normalizedGame) {
                normalizedGames.push(normalizedGame);
            } else if (normalizedDLC) {
                normalizedDLCs.push(normalizedDLC);
            }
        }

        normalizedGames.push(getLauncherEntry('steam'));
        newGameIds.add('-1');
        
        insertGamesTransaction('steamGames', currentSteamGamesIds, newGameIds, normalizedGames);
        insertDLCsTransaction('steamDLCs', currentSteamDLCsIds, newDLCIds, normalizedDLCs);
        const allGames = new Set<{ source: "steam", id: string }>();
        for (const id of currentSteamGamesIds) {
            allGames.add({ source: "steam", id });
        }
        for (const id of newGameIds) {
            allGames.add({ source: "steam", id });
        }
        
        processing.steam = false;
        await DownloadCuratedAssets({source: "steam", id: "-1"});
        if (Object.values(processing).every(p => p === true))
            emitter.emit("gamesUpdated");
    }
    await watchSteamHelper();

    watchers.steamInfo = chokidar.watch(`${path}/appcache/appinfo.vdf`, { persistent: true });
    watchers.steamFolders = chokidar.watch(`${path}/steamapps/libraryfolders.vdf`, { persistent: true });
    watchers.steamInfo.on("all", watchSteamHelper);
    watchers.steamFolders.on("all", watchSteamHelper);
}

async function watchEpic(path: string | undefined) {
    processing.epic = true;
    watchers.epic?.close();
    if (!path) return;
    
    watchers.epic = chokidar.watch(`${path}/*`, { depth: 0, ignoreInitial: true });
    
    const watchEpicHelper = async () => {
        const data = getInstalledEpicGames(path);
        if (!data) return;

        const currentEpicDB = selectRows(db(), 'epicGames');
        const currentIds = new Set(currentEpicDB.map((row: any) => row.id));
        const newIds = new Set(Object.values(data).map((game: any) => game.AppName));

        for (const id of currentIds) {
            if (!newIds.has(id)) {
                deleteRow(db(), 'epicGames', { id });
            }
        }

        // First normalize the actual game manifests
        const normalizedGames = Object.values(data)
            .map(normalizeEpicManifestToGame)
            .filter((game): game is NormalizedGame => game !== undefined);
        
        // Add the launcher entry
        const launcherEntry = getLauncherEntry('epic');
        normalizedGames.push(launcherEntry);
        newIds.add('-1');
        
        insertGamesTransaction('epicGames', currentIds, newIds, normalizedGames);
        const allGames = new Set<{ source: "epic", id: string }>();
        for (const id of currentIds) {
            allGames.add({ source: "epic", id });
        }
        for (const id of newIds) {
            allGames.add({ source: "epic", id });
        }
        
        processing.epic = false;
        await DownloadCuratedAssets({source: "epic", id: "-1"});
        if (Object.values(processing).every(p => p === true))
            emitter.emit("gamesUpdated");
    }
    
    await watchEpicHelper();
    
    watchers.epic.on("all", watchEpicHelper);
}

async function watchItchio(path: string | undefined) {
    processing.itch = true;
    watchers.itchio?.close();
    if (!path) return;
    
    watchers.itchio = chokidar.watch(`${path}/db/butler.db`, { persistent: true });

    const watchItchioHelper = async () => {
        const dbData = await readItchDB(`${path}/db/butler.db`);
        if (!dbData?.caves || !dbData?.games) return;

        const currentItchDB = selectRows(db(), 'itchGames');
        const currentIds = new Set(currentItchDB.map((row: any) => row.id));
        const newIds = new Set(dbData.caves.map(cave => cave.id));

        for (const id of currentIds) {
            if (!newIds.has(id)) {
                deleteRow(db(), 'itchGames', { id });
            }
        }

        const launcher = getLauncherEntry('itch');
        insertRow(db(), 'itchGames', prepareGameForSQL(launcher), 'replace');
        newIds.add('-1');

        dbData.caves.forEach(async (cave) => {
            const normalizedGame = await normalizeCaveToGame(cave, dbData.games);
            const sqlData = prepareGameForSQL(normalizedGame);
            
            insertRow(db(), 'itchGames', sqlData, 'replace');
        });

        const allGames = new Set<{ source: "itch", id: string }>();
        for (const id of currentIds) {
            allGames.add({ source: "itch", id });
        }
        for (const id of newIds) {
            allGames.add({ source: "itch", id });
        }

        await DownloadCuratedAssets(...allGames);
        
        processing.itch = false;
        if (Object.values(processing).every(p => p === true))
            emitter.emit("gamesUpdated");
    }

    watchers.itchio.on("all", async () => {
        console.log("itch.io butler.db changed");
        await watchItchioHelper();
    });

    await watchItchioHelper();
}

function updateWatcher(key: string, val: string | undefined) {
    //console.log(key, val)
    switch (key) {
        case "steam": return watchSteam(val);
        case "epic_data": return watchEpic(val);
        case "epic_exe": return watchEpic(getPathsFromDB().epic_data);  // Re-trigger watcher with data path when exe changes
        case "itchio_data": return watchItchio(val);
        case "itchio_exe": return watchItchio(getPathsFromDB().itchio_data);  // Re-trigger watcher with data path when exe changes
    }
}

export function initWatchers() {
    const paths = getPathsFromDB();
    //console.log(paths);
    for (const [key, val] of Object.entries(paths)) {
        // Only initialize watchers for data paths, exe paths will be handled by the launcher entries
        if (!key.endsWith('_exe')) {
            updateWatcher(key, val);
        }
    }
    
    // Listen for games updates and notify the main process
    emitter.on("gamesUpdated", () => {
        console.log("Games database updated, notifying renderer...");
        notifyGamesUpdate();
    });
}

emitter.on("pathChanged", (key: string, val: string | undefined) => {
    console.log(`Path for ${key} changed, updating watcher...`);
    updateWatcher(key, val);
});

export function notifyPathChanged(key: string, val: string | undefined) {
    emitter.emit("pathChanged", key, val);
}
