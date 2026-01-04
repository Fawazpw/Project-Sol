// main.js - Final Version with Incognito Detection

const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');

// Disable Hardware Acceleration to fix GPU errors
app.disableHardwareAcceleration();
// app.commandLine.appendSwitch('disable-software-rasterizer'); // Caused fatal failure
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-gpu-compositing');
app.commandLine.appendSwitch('disable-gpu-rasterization');
app.commandLine.appendSwitch('disable-gpu-sandbox');
app.commandLine.appendSwitch('--no-sandbox');

const { ElectronBlocker } = require('@cliqz/adblocker-electron');
const { ElectronChromeExtensions } = require('electron-chrome-extensions');
const fetch = require('cross-fetch');

// Enable AdBlocker
let blockerInstance;
let isAdBlockEnabled = true;

ElectronBlocker.fromPrebuiltAdsAndTracking(fetch).then((blocker) => {
    blockerInstance = blocker;
    if (isAdBlockEnabled) {
        blocker.enableBlockingInSession(session.defaultSession);
        console.log("AdBlocker enabled by default.");
    }
});

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

    // Enable AdBlocker for Incognito Session
    // ElectronBlocker.fromPrebuiltAdsAndTracking(fetch).then((blocker) => {
    //    const incognitoSession = session.fromPartition('incognito_session');
    //    blocker.enableBlockingInSession(incognitoSession);
    // });

    incognitoWin.loadFile('index.html');
    incognitoWin.setMenu(null);
    incognitoWin.setBackgroundColor('#1a1a1a');
}

app.whenReady().then(async () => {
    // Phase 4: Extensions
    try {
        const extensions = new ElectronChromeExtensions({
            license: 'GPL-3.0', // Valid license for the library
        });
        // await extensions.loadExtension('/path/to/extension/unpacked'); // Manual loading if needed
    } catch (err) {
        console.error("Failed to initialize Chrome Extensions:", err);
    }

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

// Downloads Handler
ipcMain.on('clear-data', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
        win.webContents.session.clearCache();
        win.webContents.session.clearStorageData();
    }
});

// Ad-Blocker IPC
ipcMain.on('get-adblock-state', (event) => {
    event.sender.send('update-adblock-state', isAdBlockEnabled);
});

ipcMain.on('toggle-adblock', (event) => {
    isAdBlockEnabled = !isAdBlockEnabled;
    if (blockerInstance) {
        if (isAdBlockEnabled) {
            blockerInstance.enableBlockingInSession(session.defaultSession);
        } else {
            blockerInstance.disableBlockingInSession(session.defaultSession);
        }
    }
    // Send to all windows
    BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('update-adblock-state', isAdBlockEnabled);
    });
});

app.on('session-created', (session) => {
    session.on('will-download', (event, item, webContents) => {
        // We can send progress to the window that initiated the download
        // But getting the browser window from webContents might be the webview's owner?
        // Standard session: shared. Invoking window...

        const win = BrowserWindow.fromWebContents(webContents);
        // Note: webContents in will-download might be the webview's contents.
        // We need to send ipc to the renderer (which is the parent of webview).
        // Since we are in a single window app (mostly), we can find the owner.
        // Actually, for webview, we might need to send to all windows or find the specific one.

        // Let's assume the main window or incognito window that owns it.
        // Unfortunately, finding the embedder is tricky without context.
        // Simpler approach: Send to all windows, renderer filters?

        item.on('updated', (event, state) => {
            if (state === 'interrupted') {
                // handle?
            } else if (state === 'progressing') {
                if (item.isPaused()) {
                    // paused
                } else {
                    const percent = item.getReceivedBytes() / item.getTotalBytes();
                    BrowserWindow.getAllWindows().forEach(w => {
                        w.webContents.send('download-progress', {
                            filename: item.getFilename(),
                            percent: percent,
                            state: 'progressing'
                        });
                    });
                }
            }
        });
        item.once('done', (event, state) => {
            BrowserWindow.getAllWindows().forEach(w => {
                w.webContents.send('download-complete', {
                    filename: item.getFilename(),
                    state: state
                });
            });
        });
    });
});