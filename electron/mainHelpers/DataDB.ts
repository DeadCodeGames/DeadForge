import path from "path";
import fs from "fs";
import { app } from "electron";
import Database from "better-sqlite3";
import { createTable, deleteRow, insertRow, selectRows } from "./dbHelpers";
import { notifyPathChanged } from "./WatchManager";

let db: Database.Database;

export default function getDB() {return db};

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
            header: "TEXT",
            raw: "TEXT",
        };
    };
    
    const clients = ["steamGames", "itchGames", "epicGames"] as const;
    
    const tables: Record<string, Record<string, string>> = {
        paths: {
            key: "TEXT PRIMARY KEY",
            val: "TEXT",
        },
        ...Object.fromEntries(clients.map(client => [client, makeGameSchema(client)])),
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

/**
 * Closes the current database connection. There is NO WAY to reopen the database, so only run this at the end of the app's life-cycle.
 */
export function closeDB() {
    if (db.open) db.close();
}