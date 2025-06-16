import { app, BrowserWindow } from 'electron';
import * as path from 'path';

// Function to handle protocol URLs
export function handleProtocolUrl(url: string, mainWindow: BrowserWindow | null) {
    console.log(url);
    try {
        // Remove the protocol part and any trailing slashes
        const path = url.replace('deadforge://', '').replace(/\/$/, '');

        // If the window exists, navigate to the route
        if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
            mainWindow.webContents.send('protocol:navigate', `/${path}`);
        }
    } catch (error) {
        console.error('Error handling protocol URL:', error);
    }
}

// Function to register the protocol handler
export function registerProtocolHandler() {
    if (process.defaultApp) {
        if (process.argv.length >= 2) {
            app.setAsDefaultProtocolClient('deadforge', process.execPath, [path.resolve(process.argv[1])]);
        }
    } else {
        app.setAsDefaultProtocolClient('deadforge');
    }
}
