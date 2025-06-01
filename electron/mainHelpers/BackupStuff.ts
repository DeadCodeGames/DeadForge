import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import Zip from "adm-zip";
import { Preferences } from '../preferences';

const PREFERENCES_FILENAME = 'preferences.json';
const COLLECTIONS_FILENAME = 'collections.json';
const DATABASE_FILENAME = 'user.sqlite3';
const GAME_ASSETS_FOLDER = 'game_assets';
export const preferencesPath = path.join(app.getPath('userData'), PREFERENCES_FILENAME);
export const collectionsPath = path.join(app.getPath('userData'), COLLECTIONS_FILENAME);
export const databasePath = path.join(app.getPath('userData'), 'db', 'user.sqlite3');
export const gameAssetsPath = path.join(app.getPath('userData'), GAME_ASSETS_FOLDER);

export function exportBackup(zipTargetPath: string) {
    return new Promise<string>((resolve, reject) => {
        try {
            const zip = new Zip();
            zip.addFile(PREFERENCES_FILENAME, fs.readFileSync(preferencesPath));
            zip.addFile(COLLECTIONS_FILENAME, fs.readFileSync(collectionsPath));
            zip.addFile(DATABASE_FILENAME, fs.readFileSync(databasePath));
            zip.addLocalFolder(gameAssetsPath, 'game_assets');
            zip.writeZip(zipTargetPath, (error) => {if (error) reject(error)});
            resolve(zipTargetPath);
        } catch (e) {
            console.log(e);
            reject(e);
        }
    })
}

export function importBackup(zipSourcePath: string) {
    return new Promise<[string, Preferences]>((resolve, reject) => {
        const zip = new Zip(zipSourcePath);
        const prefsEntry = zip.getEntry(PREFERENCES_FILENAME);
        const dbEntry = zip.getEntry(DATABASE_FILENAME);
        const collectionsEntry = zip.getEntry(COLLECTIONS_FILENAME);
        
        if (!(prefsEntry && dbEntry && collectionsEntry)) {
            let missingItem = "Unknown item";
            if (!prefsEntry) missingItem = PREFERENCES_FILENAME;
            else if (!dbEntry) missingItem = DATABASE_FILENAME;
            else if (!collectionsEntry) missingItem = COLLECTIONS_FILENAME;
            reject(`${missingItem} not found in zip file.`);
        } else {
            try {
                const prefsBuffer = prefsEntry.getData();
                const dbBuffer = dbEntry.getData();
                const collectionsBuffer = collectionsEntry.getData();
                
                fs.writeFileSync(preferencesPath, prefsBuffer);
                fs.writeFileSync(databasePath, dbBuffer);
                fs.writeFileSync(collectionsPath, collectionsBuffer);

                fs.mkdirSync(gameAssetsPath, { recursive: true });

                const zipEntries = zip.getEntries();
                zipEntries.forEach(zipEntry => {
                    if (zipEntry.entryName.startsWith(GAME_ASSETS_FOLDER + "/") && !zipEntry.isDirectory) {
                        zip.extractEntryTo(
                            zipEntry,
                            app.getPath('userData'),
                            true,
                            true
                        );
                    }
                });

            } catch (e) {
                reject(e);
            }
            resolve([zipSourcePath, JSON.parse(zip.readAsText(PREFERENCES_FILENAME))]);
            app.relaunch(); app.exit(0);
        } 
    })
}

export function validateBackup(backupPath: string) {
    return new Promise<[true, Preferences] | [false, Record<never, never>]>((resolve) => {
        if (!fs.existsSync(backupPath)) { resolve([false, {}]) }
        const zip = new Zip(backupPath);
        const prefsEntry = zip.getEntry(PREFERENCES_FILENAME);
        const collectionsEntry = zip.getEntry(COLLECTIONS_FILENAME);
        const dbEntry = zip.getEntry(DATABASE_FILENAME);
        if (!(prefsEntry && dbEntry && collectionsEntry)) { resolve([false, {}]) } else { resolve([true, JSON.parse(zip.readAsText(PREFERENCES_FILENAME))]); } 
    })
}