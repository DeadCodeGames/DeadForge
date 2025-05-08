import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import Zip from "adm-zip";
import { Preferences } from '../preferences';

const PREFERENCES_FILENAME = 'preferences.json';
const DATABASE_FILENAME = 'user.sqlite3';
const preferencesPath = path.join(app.getPath('userData'), PREFERENCES_FILENAME);
const databasePath = path.join(app.getPath('userData'), 'db', 'user.sqlite3');

export function exportBackup(zipTargetPath: string) {
    return new Promise<string>((resolve, reject) => {
        try {
            const zip = new Zip();
            zip.addFile(PREFERENCES_FILENAME, fs.readFileSync(preferencesPath));
            zip.addFile(DATABASE_FILENAME, fs.readFileSync(databasePath));
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
        if (!(prefsEntry && dbEntry)) { reject(`${prefsEntry ? DATABASE_FILENAME : PREFERENCES_FILENAME} not found in zip file.`) } else {
            try {
                const prefsBuffer = prefsEntry.getData();
                const dbBuffer = dbEntry.getData();
                fs.writeFileSync(preferencesPath, prefsBuffer);
                fs.writeFileSync(databasePath, dbBuffer);
            } catch (e) {
                reject(e);
            }
            resolve([zipSourcePath, JSON.parse(zip.readAsText(PREFERENCES_FILENAME))]);
            app.relaunch(); app.exit(0);
        } 
    })
}

export function validateBackup(backupPath: string) {
    return new Promise<[true, Preferences] | [false, {}]>((resolve, reject) => {
        if (!fs.existsSync(backupPath)) { resolve([false, {}]) }
        const zip = new Zip(backupPath);
        const prefsEntry = zip.getEntry(PREFERENCES_FILENAME);
        const dbEntry = zip.getEntry(DATABASE_FILENAME);
        if (!(prefsEntry && dbEntry)) { resolve([false, {}]) } else { resolve([true, JSON.parse(zip.readAsText(PREFERENCES_FILENAME))]); } 
    })
}