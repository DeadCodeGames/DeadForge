import Database from 'better-sqlite3';

export function readItchDB(dbPath: string): Promise<{
    installLocations: any[];
    caves: any[];
    games: any[];
} | null> {
    try {
        const db = new Database(dbPath, { readonly: true });

        const installLocations = db.prepare('SELECT * FROM install_locations').all();

        const caves = db.prepare('SELECT * FROM caves').all().map((cave: any) => ({
            ...cave,
            verdict: JSON.parse(cave.verdict),
        }));
        
        const games = db.prepare('SELECT * FROM games').all();

        db.close();

        return Promise.resolve({ installLocations, caves, games });
    } catch (err: any) {
        console.error('Error reading Itch DB:', err.message);
        return Promise.resolve(null);
    }
}
