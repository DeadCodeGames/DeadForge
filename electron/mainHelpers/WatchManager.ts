import { EventEmitter } from "events";
import chokidar, { FSWatcher } from "chokidar";
import { getPathsFromDB } from "./DataDB";
import { readItchDB } from "./ItchStuff";
import { default as db } from "./DataDB";
import { normalizeCaveToGame, normalizeEpicManifestToGame, normalizeSteamDLCEntryToDLC, normalizeSteamEntryToGame, prepareDLCForSQL, prepareGameForSQL } from "./GameNormalizer";
import { deleteRow, insertRow, selectRows } from "./dbHelpers";
import { getInstalledSteamDLCs, getInstalledSteamGames } from "./SteamStuff";
import { getInstalledEpicGames } from "./EpicStuff";
import { NormalizedDLC, NormalizedGame } from "../types";
import { notifyGamesUpdate } from "../main";

type Watchers = {
    steamInfo?: FSWatcher;
    steamFolders?: FSWatcher;
    epic?: FSWatcher;
    itchio?: FSWatcher;
};

const watchers: Watchers = {};
const emitter = new EventEmitter();

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
        }
    });

    runTransaction(normalizedGames);
    
    // Emit an event to notify that games have been updated
    emitter.emit("gamesUpdated");
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

    // Emit an event to notify that games have been updated
    emitter.emit("gamesUpdated");
}

async function watchSteam(path: string | undefined) {
    watchers.steamInfo?.close();
    watchers.steamFolders?.close();
    if (!path) return;

    const watchSteamHelper = async () => {
        let gamesData = await getInstalledSteamGames(`${path}/appcache/appinfo.vdf`, `${path}/steamapps/libraryfolders.vdf`);
        let dlcsData = await getInstalledSteamDLCs(`${path}/appcache/appinfo.vdf`, `${path}/steamapps/libraryfolders.vdf`);
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
        
        insertGamesTransaction('steamGames', currentSteamGamesIds, newGameIds, normalizedGames);
        insertDLCsTransaction('steamDLCs', currentSteamDLCsIds, newDLCIds, normalizedDLCs);
    }
    await watchSteamHelper();

    watchers.steamInfo = chokidar.watch(`${path}/appcache/appinfo.vdf`, { persistent: true });
    watchers.steamFolders = chokidar.watch(`${path}/steamapps/libraryfolders.vdf`, { persistent: true });
    watchers.steamInfo.on("all", watchSteamHelper);
    watchers.steamFolders.on("all", watchSteamHelper);
}

async function watchEpic(path: string | undefined) {
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

        const games = Object.values(data);
        const normalizedGames = games.map(normalizeEpicManifestToGame).filter((game): game is NormalizedGame => game !== undefined);
        
        insertGamesTransaction('epicGames', currentIds, newIds, normalizedGames);
    }
    
    await watchEpicHelper();
    
    watchers.epic.on("all", watchEpicHelper);
}

async function watchItchio(path: string | undefined) {
    watchers.itchio?.close();
    if (!path) return;
    
    watchers.itchio = chokidar.watch(`${path}/db/butler.db`, { persistent: true });

    const watchItchioHelper = async () => {
        const cavesData = (await readItchDB(`${path}/db/butler.db`))?.caves;
        if (!cavesData) return;

        const currentItchDB = selectRows(db(), 'itchGames');
        const currentIds = new Set(currentItchDB.map((row: any) => row.id));
        const newIds = new Set(cavesData.map(cave => cave.id));

        for (const id of currentIds) {
            if (!newIds.has(id)) {
                deleteRow(db(), 'itchGames', { id });
            }
        }

        cavesData.forEach(async (cave) => {
            const normalizedGame = await normalizeCaveToGame(cave);
            const sqlData = prepareGameForSQL(normalizedGame);
            
            insertRow(db(), 'itchGames', sqlData, 'replace');
        });
    }

    watchers.itchio.on("change", async () => {
        console.log("itch.io butler.db changed");
        await watchItchioHelper();
    });

    await watchItchioHelper();
}

function updateWatcher(key: string, val: string | undefined) {
    //console.log(key, val)
    switch (key) {
        case "steam": return watchSteam(val);
        case "epic": return watchEpic(val);
        case "itchio": return watchItchio(val);
    }
}

export function initWatchers() {
    const paths = getPathsFromDB();
    //console.log(paths);
    for (const [key, val] of Object.entries(paths)) {
        updateWatcher(key, val);
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
