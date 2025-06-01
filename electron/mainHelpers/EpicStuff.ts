import fs from 'fs';
import path from 'path';

export function getInstalledEpicGames (manifestsDir: string): Record<string, any> | null {
    try {
        const files = fs.readdirSync(manifestsDir);
        const manifests: Record<string, any> = {};

        for (const file of files) {
            if (file.endsWith('.item')) {
                const fullPath = path.join(manifestsDir, file);
                const content = fs.readFileSync(fullPath, 'utf-8');
                try {
                    const parsed = JSON.parse(content);
                    manifests[file] = parsed;
                } catch (err) {
                    console.warn(`Failed to parse manifest ${file}`, err);
                }
            }
        }

        return manifests;
    } catch (e) {
        console.error('Error reading Epic manifests:', e);
        return null;
    }
};
