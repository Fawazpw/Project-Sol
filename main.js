// main.js - Fixed Incognito & robust handling

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
        icon: path.join(__dirname, 'assets/Sol Logo.png'),
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
        setTimeout(() => {
            if (splashWindow && !splashWindow.isDestroyed()) splashWindow.destroy();
            mainWindow.show();
        }, 1500);
    });
}

// --- Incognito Window Function ---
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
            // This partition string creates a temporary, isolated session
            partition: 'incognito_view_' + Date.now() 
        }
    });

    incognitoWin.loadFile('index.html');
    incognitoWin.setMenu(null);
    // Dark background to distinguish
    incognitoWin.setBackgroundColor('#222'); 
}

app.whenReady().then(() => {
    createSplashWindow();
    createMainWindow();

    // --- Global Keyboard Shortcuts (Inside Webviews) ---
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
                                mainWindow.webContents.send('shortcut-restore-tab');
                            } else {
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

// IPC Listeners (Commands from Renderer)
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

// NEW: Listen for incognito request from renderer
ipcMain.on('new-incognito-window', () => {
    createIncognitoWindow();
});