import { EventEmitter } from "events";
import chokidar, { FSWatcher } from "chokidar";
import { getPathsFromDB } from "./DataDB";
import { readItchDB } from "./ItchStuff";
import { default as db } from "./DataDB";
import { normalizeCaveToGame, normalizeEpicManifestToGame, normalizeSteamEntryToGame, prepareGameForSQL } from "./GameNormalizer";
import { deleteRow, insertRow, selectRows } from "./dbHelpers";
import { getInstalledSteamGames } from "./SteamStuff";
import { getInstalledEpicGames } from "./EpicStuff";
import { NormalizedGame } from "../types";

type Watchers = {
    steam?: FSWatcher;
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
        console.log(games);
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
}

async function watchSteam(path: string | undefined) {
    watchers.steam?.close();
    if (!path) return;

    const watchSteamHelper = async () => {
        const data = await getInstalledSteamGames(`${path}/appcache/appinfo.vdf`, `${path}/steamapps/libraryfolders.vdf`);
        if (!data) return;

        const currentSteamDB = selectRows(db(), 'steamGames');
        const currentIds = new Set(currentSteamDB.map((row: any) => row.id));
        const newIds = new Set(data.datasets.map(game => String(game.id)));

        const games = data.datasets;
        const normalizedGames: NormalizedGame[] = [];
        
        for (const game of games) {
            const normalizedGame = await normalizeSteamEntryToGame(path, game);
            if (normalizedGame) {
                normalizedGames.push(normalizedGame);
            }
        }
        
        insertGamesTransaction('steamGames', currentIds, newIds, normalizedGames);
    }
    await watchSteamHelper();

    watchers.steam = chokidar.watch(`${path}/appcache/appinfo.vdf`, { persistent: true });
    watchers.steam.on("change", watchSteamHelper);
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
}

emitter.on("pathChanged", (key: string, val: string | undefined) => {
    console.log(`Path for ${key} changed, updating watcher...`);
    updateWatcher(key, val);
});

export function notifyPathChanged(key: string, val: string | undefined) {
    emitter.emit("pathChanged", key, val);
}
