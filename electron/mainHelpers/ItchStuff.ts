import Database from 'better-sqlite3';

export function readItchDB(dbPath: string): Promise<{
    installLocations: any[];
    caves: any[];
} | null> {
    try {
        const db = new Database(dbPath, { readonly: true });

        const installLocations = db.prepare('SELECT * FROM install_locations').all();

        const caves = db.prepare('SELECT * FROM caves LEFT JOIN (SELECT id as game_id, title from games) as g ON caves.game_id = g.game_id').all().map((cave: any) => {return {
            ...cave,
            verdict: JSON.parse(cave.verdict),
        }});

        db.close();

        return Promise.resolve({ installLocations, caves });
    } catch (err: any) {
        console.error('Error reading Itch DB:', err.message);
        return Promise.resolve(null);
    }
}
