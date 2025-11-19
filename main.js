// main.js - Robust Keyboard Shortcut Handling

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
            if (splashWindow) splashWindow.destroy();
            mainWindow.show();
        }, 1500);
    });
}

app.whenReady().then(() => {
    createSplashWindow();
    createMainWindow();

    // --- ROBUST SHORTCUT HANDLER ---
    app.on('web-contents-created', (e, contents) => {
        // Listen to events inside webviews
        if (contents.getType() === 'webview') {
            contents.on('before-input-event', (event, input) => {
                // Check for key down
                if (input.type !== 'keyDown') return;

                // Check for CTRL (Windows/Linux) or CMD (Mac)
                const modifier = input.control || input.meta;

                if (modifier) {
                    switch (input.code) {
                        case 'KeyT': // Ctrl + T
                            mainWindow.webContents.send('shortcut-new-tab');
                            event.preventDefault(); // Stop website from seeing it
                            break;
                        case 'KeyW': // Ctrl + W
                            mainWindow.webContents.send('shortcut-close-tab');
                            event.preventDefault();
                            break;
                        case 'KeyS': // Ctrl + S
                            mainWindow.webContents.send('shortcut-toggle-sidebar');
                            event.preventDefault();
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