// main.js - Final Version with Incognito Detection

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
            webviewTag: true,
            // We add a custom argument so the renderer knows this is NOT incognito
            additionalArguments: ['--is-main-window']
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

function createIncognitoWindow() {
    const incognitoWin = new BrowserWindow({
        width: 1200,
        height: 800,
        icon: path.join(__dirname, 'assets/Sol Logo.png'),
        title: "Sol Browser (Incognito)",
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webviewTag: true,
            // FIXED: Use a static string so all Incognito windows share cookies!
            // (No 'persist:' prefix means it clears when the app closes)
            partition: 'incognito_session'
        }
    });

    incognitoWin.loadFile('index.html');
    incognitoWin.setMenu(null);
    incognitoWin.setBackgroundColor('#1a1a1a');
}

app.whenReady().then(() => {
    createSplashWindow();
    createMainWindow();

    // Global Shortcut Handler
    app.on('web-contents-created', (e, contents) => {
        if (contents.getType() === 'webview') {
            contents.on('before-input-event', (event, input) => {
                if (input.type !== 'keyDown') return;
                const modifier = input.control || input.meta;
                const isShift = input.shift;

                if (modifier) {
                    switch (input.code) {
                        case 'KeyT':
                            if (isShift) contents.getOwnerBrowserWindow().webContents.send('shortcut-restore-tab');
                            else contents.getOwnerBrowserWindow().webContents.send('shortcut-new-tab');
                            event.preventDefault();
                            break;
                        case 'KeyW':
                            contents.getOwnerBrowserWindow().webContents.send('shortcut-close-tab');
                            event.preventDefault();
                            break;
                        case 'KeyS':
                            contents.getOwnerBrowserWindow().webContents.send('shortcut-toggle-sidebar');
                            event.preventDefault();
                            break;
                        case 'KeyH':
                            contents.getOwnerBrowserWindow().webContents.send('shortcut-history');
                            event.preventDefault();
                            break;
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
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
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

ipcMain.on('new-incognito-window', () => {
    createIncognitoWindow();
});