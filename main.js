// main.js - NOW WITH A SPLASH SCREEN

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Keep global references to our windows
let mainWindow;
let splashWindow;

/**
 * Creates the new, small, frameless splash window
 */
function createSplashWindow() {
    splashWindow = new BrowserWindow({
        width: 300,
        height: 300,
        frame: false,       // No "File, Edit, View" bar
        transparent: true,  // Allows for a transparent background (if your PNG is)
        alwaysOnTop: true,  // Stays on top of other windows
        center: true
    });
    
    // Load the new splash.html file
    splashWindow.loadFile(path.join(__dirname, 'splash.html'));
}

/**
 * Creates the main browser window (this is your old createWindow function)
 */
function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        icon: path.join(__dirname, 'assets/icon.png'),
        show: false, // <-- CRITICAL: Create the window hidden
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webviewTag: true
        }
    });

    // Load your main index.html file
    mainWindow.loadFile('index.html');
    
    // Remove the default menu
    mainWindow.setMenu(null);

    // --- CRITICAL: Show the main window only when it's ready ---
    mainWindow.once('ready-to-show', () => {
        // We add a small delay to make the splash feel intentional
        setTimeout(() => {
            if (splashWindow) {
                splashWindow.destroy(); // Close the splash screen
            }
            mainWindow.show(); // Show the main window
        }, 1500); // 1.5 second delay
    });
}

// --- App Lifecycle ---

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(() => {
    // Show the splash screen first
    createSplashWindow();
    // Then create the main window in the background
    createMainWindow();
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    // On macOS, re-create a window when the dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
    }
});

// --- IPC Listeners ---
// (Moved out of createWindow to prevent duplicate listeners)

ipcMain.on('toggle-fullscreen', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) {
        window.setFullScreen(!window.isFullScreen());
    }
});

ipcMain.on('toggle-devtools', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) {
        window.webContents.toggleDevTools();
    }
});

ipcMain.on('quit-app', () => {
    app.quit();
});