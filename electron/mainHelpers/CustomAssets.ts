import { app, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import getDB from './DataDB';
import { insertRow } from './dbHelpers';

/**
 * Opens a file dialog for selecting an image file
 */
export async function selectCustomAsset() {
    const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
            { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }
        ]
    });

    if (!result.canceled && result.filePaths.length > 0) {
        return {
            success: true,
            filePath: result.filePaths[0]
        };
    }

    return {
        success: false,
        filePath: null
    };
}

/**
 * Saves a custom asset for a game
 */
export async function saveCustomAsset(params: {
    source: string,
    gameId: string,
    assetType: 'hero' | 'logo',
    filePath: string
}) {
    const { source, gameId, assetType, filePath } = params;
    const db = getDB();

    try {
        // Create custom assets directory if it doesn't exist
        const customAssetsDir = path.join(app.getPath("userData"), "custom_assets");
        if (!fs.existsSync(customAssetsDir)) {
            fs.mkdirSync(customAssetsDir, { recursive: true });
        }

        // Generate destination filename with _custom suffix
        const ext = path.extname(filePath);
        const destFileName = `${source}_${gameId}_${assetType}_custom${ext}`;
        const destPath = path.join(customAssetsDir, destFileName);

        // Copy the file
        fs.copyFileSync(filePath, destPath);

        // Update the database
        const updateData: Record<string, any> = {
            source,
            gameId,
            [`${assetType}Source`]: 'custom'
        };

        // Set the asset path based on type
        if (assetType === 'hero') {
            updateData.hero = destPath;
        } else if (assetType === 'logo') {
            updateData.logo = destPath;
        }

        // Insert or update the record
        insertRow(db, 'customAssets', updateData, 'replace');

        return { success: true };
    } catch (error: any) {
        console.error('Failed to save custom asset:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Updates the logo position for a game
 */
export async function updateLogoPosition(params: {
    source: string,
    gameId: string,
    position: {
        pinned_position: string,
        width_pct: number,
        height_pct: number
    }
}) {
    const { source, gameId, position } = params;
    const db = getDB();

    try {
        // Update the database
        const updateData = {
            source,
            gameId,
            logoPosition: JSON.stringify(position)
        };

        // Insert or update the record
        insertRow(db, 'customAssets', updateData, 'replace');

        return { success: true };
    } catch (error: any) {
        console.error('Failed to update logo position:', error);
        return { success: false, error: error.message };
    }
}