import path from "path";
import fs from "fs";
import { app } from "electron";
import Database from "better-sqlite3";
import { createTable, deleteRow, insertRow, selectRows, updateRow } from "./dbHelpers";
import { notifyPathChanged } from "./WatchManager";
import { NormalizedDLC, NormalizedGame, NormalizedGameJoin } from "../types";

let db: Database.Database;

export default function getDB() { return db };

export function initUserDB() {
    const dbDir = path.join(app.getPath("userData"), "db");
    const dbPath = path.join(dbDir, "user.sqlite3");

    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }

    db = new Database(dbPath);

    const makeGameSchema = (client: string): Record<string, string> => {
        const idType = client === "epicGames" ? "TEXT PRIMARY KEY" : "INTEGER PRIMARY KEY";
        return {
            id: idType,
            name: "TEXT",
            installPath: "TEXT",
            launchOptions: "TEXT",
            icon: "TEXT",
            logo: "TEXT",
            hero: "TEXT",
            header: "TEXT",
            capsule: "TEXT",
            raw: "TEXT",
            type: "TEXT",
        };
    };

    const makeDLCSchema = (client: string): Record<string, string> => {
        return {
            id: "INTEGER PRIMARY KEY",
            parentGameId: "INTEGER",
            name: "TEXT",
            header: "TEXT",
            capsule: "TEXT",
            raw: "TEXT",
            type: "TEXT",
        };
    };

    const clients = ["steamGames", "itchGames", "epicGames"] as const;
    const DLCclients = ["steamDLCs"] as const;

    const tables: Record<string, Record<string, string>> = {
        paths: {
            key: "TEXT PRIMARY KEY",
            val: "TEXT",
        },
        ...Object.fromEntries(clients.map(client => [client, makeGameSchema(client)])),
        ...Object.fromEntries(DLCclients.map(client => [client, makeDLCSchema(client)])),
        joinedGames: {
            id: "INTEGER PRIMARY KEY AUTOINCREMENT",
            clients: "TEXT", // stringified JSON
            defaultClient: "TEXT",
            preferences: "TEXT"
        }
    };


    Object.entries(tables).forEach(([tableName, columns]) => {
        createTable(db, tableName, columns);
    });

    console.log("DB initialized at", dbPath);
    return db;
}

export function insertPathIntoDB(key: string, val: string) {
    const prev = getPathsFromDB(key);
    const res = insertRow(db, "paths", { key, val }, "replace");
    if (prev !== val) notifyPathChanged(key, val);
    return res;
}


export function getPathsFromDB(): Record<string, string>
export function getPathsFromDB(key: string): string
export function getPathsFromDB(path?: string) {
    if (path) return selectRows(db, "paths", `key = '${path}'`)?.[0]?.val;
    return Object.fromEntries(selectRows(db, "paths").map(p => [p.key, p.val]));
}

export function removePathFromDB(key: string) {
    const res = deleteRow(db, "paths", { key });
    notifyPathChanged(key, undefined);
    return res;
}

export function insertJoinedGame(data: {
    name?: string,
    clients: Record<string, string>,
    defaultClient?: string,
    preferences?: Record<string, any>
}) {
    return insertRow(db, "joinedGames", {
        clients: JSON.stringify(data.clients),
        defaultClient: data.defaultClient || null,
        preferences: JSON.stringify(data.preferences || {})
    });
}

export function getJoinedGames(): any[] {
    return selectRows(db, "joinedGames").map(row => ({
        ...row,
        clients: JSON.parse(row.clients),
        preferences: row.preferences ? JSON.parse(row.preferences) : {}
    }));
}

export function updateJoinedGame(id: number, updates: {
    addClients?: Record<string, string>,
    removeClients?: string[],
    defaultClient?: string,
    preferences?: Record<string, any>
}) {
    const row = selectRows(db, "joinedGames", `id = ${id}`)?.[0];
    if (!row) throw new Error(`Joined game with ID ${id} not found`);

    const existingClients = JSON.parse(row.clients || "{}");
    const updatedClients = { ...existingClients, ...updates.addClients };

    if (updates.removeClients) {
        for (const client of updates.removeClients) {
            delete updatedClients[client];
        }
    }

    const existingPrefs = row.preferences ? JSON.parse(row.preferences) : {};
    const updatedPrefs = updates.preferences ? { ...existingPrefs, ...updates.preferences } : existingPrefs;

    return updateRow(db, "joinedGames", {
        clients: JSON.stringify(updatedClients),
        defaultClient: updates.defaultClient ?? row.defaultClient,
        preferences: JSON.stringify(updatedPrefs)
    }, `id = ${id}`, {});
}


/**
 * Closes the current database connection. There is NO WAY to reopen the database, so only run this at the end of the app's life-cycle.
 */
export function closeDB() {
    if (db.open) db.close();
}

export function getAllGamesFromDB() {
    const games: NormalizedGame[] = [];
    const steamPath = getPathsFromDB("steam");
    const clients = {
        "steam": "steamGames",
        "epic": "epicGames",
        "itch": "itchGames",
    } as const;
    for (const [client, tableName] of Object.entries(clients)) {
        const rows = selectRows(db, tableName);
        for (const row of rows) {
            let game = { id: row.id, name: row.name, installPath: row.installPath, launchOptions: row.launchOptions, raw: row.raw, source: client, media: { iconUrl: row.icon, logoUrl: row.logo, heroUrl: row.hero, headerUrl: row.header, capsuleUrl: row.capsule }, type: row.type } as NormalizedGame;
            if (client === "steam") {
                if (game.media) {
                    // Handle iconUrl (simple string path)
                    game.media.iconUrl && (game.media.iconUrl = path.join(steamPath, "appcache", "librarycache", String(game.id), game.media.iconUrl));

                    // Handle logoUrl (complex object)
                    if (game.media.logoUrl) {
                        try {
                            const logoObj = typeof game.media.logoUrl === 'string' ? JSON.parse(game.media.logoUrl) : game.media.logoUrl;

                            // Process image paths
                            if (logoObj.image) {
                                Object.keys(logoObj.image).forEach(lang => {
                                    logoObj.image[lang] = path.join(steamPath, "appcache", "librarycache", String(game.id), logoObj.image[lang]);
                                });
                            }

                            game.media.logoUrl = logoObj;
                        } catch (e) {
                        }
                    }

                    // Handle heroUrl (complex object)
                    if (game.media.heroUrl) {
                        try {
                            const heroObj = typeof game.media.heroUrl === 'string' ? JSON.parse(game.media.heroUrl) : game.media.heroUrl;

                            // Process image paths
                            if (heroObj.image) {
                                Object.keys(heroObj.image).forEach(lang => {
                                    heroObj.image[lang] = path.join(steamPath, "appcache", "librarycache", String(game.id), heroObj.image[lang]);
                                });
                            }

                            game.media.heroUrl = heroObj;
                        } catch (e) {
                        }
                    }

                    // handle headerUrl (complex object)
                    if (game.media.headerUrl) {
                        try {
                            const headerObj = typeof game.media.headerUrl === 'string' ? JSON.parse(game.media.headerUrl) : game.media.headerUrl;

                            if (headerObj.image) {
                                Object.keys(headerObj.image).forEach(lang => {
                                    headerObj.image[lang] = path.join(steamPath, "appcache", "librarycache", String(game.id), headerObj.image[lang]);
                                });
                            }

                            game.media.headerUrl = headerObj;
                        } catch (e) {
                        }
                    }

                    // handle capsuleUrl (complex object)
                    if (game.media.capsuleUrl) {
                        try {
                            const capsuleObj = typeof game.media.capsuleUrl === 'string' ? JSON.parse(game.media.capsuleUrl) : game.media.capsuleUrl;

                            if (capsuleObj.image) {
                                Object.keys(capsuleObj.image).forEach(lang => {
                                    capsuleObj.image[lang] = path.join(steamPath, "appcache", "librarycache", String(game.id), capsuleObj.image[lang]);
                                });
                            }

                            game.media.capsuleUrl = capsuleObj;
                        } catch (e) {
                        }
                    }
                }
            }
            games.push(game);
        }
    }
    return games;
}

export function getAllDLCsFromDB() {
    const dlcs: NormalizedDLC[] = [];
    const steamPath = getPathsFromDB("steam");
    const clients = {
        "steam": "steamDLCs",
    } as const;
    for (const [client, tableName] of Object.entries(clients)) {
        const rows = selectRows(db, tableName);

        for (const row of rows) {
            let dlc = { id: row.id, name: row.name, raw: row.raw, source: client, media: { headerUrl: row.header, capsuleUrl: row.capsule }, parentGameId: row.parentGameId, type: row.type } as NormalizedDLC;
            if (dlc.media) {
                // handle headerUrl (complex object)
                if (dlc.media.headerUrl) {
                    try {
                        const headerObj = typeof dlc.media.headerUrl === 'string' ? JSON.parse(dlc.media.headerUrl) : dlc.media.headerUrl;
                        if (headerObj) {
                            Object.keys(headerObj).forEach(lang => {
                                headerObj[lang] = path.join(steamPath, "appcache", "librarycache", String(dlc.id), headerObj[lang]);
                            });
                        }

                        dlc.media.headerUrl = headerObj;
                    } catch (e) {
                    }
                }

                if (dlc.media.capsuleUrl) {
                    try {
                        const capsuleObj = typeof dlc.media.capsuleUrl === 'string' ? JSON.parse(dlc.media.capsuleUrl) : dlc.media.capsuleUrl;
                        if (capsuleObj) {
                            Object.keys(capsuleObj).forEach(lang => {
                                capsuleObj[lang] = path.join(steamPath, "appcache", "librarycache", String(dlc.id), capsuleObj[lang]);
                            });
                        }

                        dlc.media.capsuleUrl = capsuleObj;
                    } catch (e) {
                    }
                }
            }
            dlcs.push(dlc);
        }
    }
    return dlcs;
}

export function getAllGameJoinsFromDB() {
    const gameJoins: NormalizedGameJoin[] = [];
    const rows = selectRows(db, "joinedGames");
    for (const row of rows) {
        gameJoins.push({
            id: row.id,
            clients: JSON.parse(row.clients),
            defaultClient: row.defaultClient,
            preferences: JSON.parse(row.preferences)
        });
    }
    return gameJoins;
}
