// main.js - Incognito, History, and Restore shortcuts

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;
let splashWindow;

function createSplashWindow() {
    splashWindow = new BrowserWindow({
        width: 300,
        height: 300,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        center: true
    });
    splashWindow.loadFile(path.join(__dirname, 'splash.html'));
}

function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        icon: path.join(__dirname, 'assets/icon.png'),
        show: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webviewTag: true
        }
    });

    mainWindow.loadFile('index.html');
    mainWindow.setMenu(null);

    mainWindow.once('ready-to-show', () => {
        // Only show if splash exists (it might have been closed already)
        setTimeout(() => {
            if (splashWindow && !splashWindow.isDestroyed()) splashWindow.destroy();
            mainWindow.show();
        }, 1500);
    });
}

// --- NEW: Incognito Window Function ---
function createIncognitoWindow() {
    const incognitoWin = new BrowserWindow({
        width: 1200,
        height: 800,
        icon: path.join(__dirname, 'assets/icon.png'),
        title: "Sol Browser (Incognito)",
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webviewTag: true,
            // The 'partition' string makes the session unique and temporary
            partition: 'incognito_view_' + Date.now() 
        }
    });

    incognitoWin.loadFile('index.html');
    incognitoWin.setMenu(null);
    // Add a dark gray background to distinguish it
    incognitoWin.setBackgroundColor('#1a1a1a'); 
}

app.whenReady().then(() => {
    createSplashWindow();
    createMainWindow();

    // --- ROBUST SHORTCUT HANDLER ---
    app.on('web-contents-created', (e, contents) => {
        if (contents.getType() === 'webview') {
            contents.on('before-input-event', (event, input) => {
                if (input.type !== 'keyDown') return;

                const modifier = input.control || input.meta;
                const isShift = input.shift;

                if (modifier) {
                    switch (input.code) {
                        // TABS
                        case 'KeyT': 
                            if (isShift) {
                                // Ctrl + Shift + T (Restore)
                                mainWindow.webContents.send('shortcut-restore-tab');
                            } else {
                                // Ctrl + T (New Tab)
                                mainWindow.webContents.send('shortcut-new-tab');
                            }
                            event.preventDefault();
                            break;
                        
                        // CLOSE
                        case 'KeyW': 
                            mainWindow.webContents.send('shortcut-close-tab');
                            event.preventDefault();
                            break;
                        
                        // UI
                        case 'KeyS': 
                            mainWindow.webContents.send('shortcut-toggle-sidebar');
                            event.preventDefault();
                            break;

                        // HISTORY
                        case 'KeyH':
                            mainWindow.webContents.send('shortcut-history');
                            event.preventDefault();
                            break;

                        // INCOGNITO
                        case 'KeyN':
                            if (isShift) {
                                createIncognitoWindow();
                                event.preventDefault();
                            }
                            break;
                    }
                }
            });
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
    }
});

// IPC Listeners
ipcMain.on('toggle-fullscreen', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) window.setFullScreen(!window.isFullScreen());
});

ipcMain.on('toggle-devtools', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) window.webContents.toggleDevTools();
});

ipcMain.on('quit-app', () => {
    app.quit();
});