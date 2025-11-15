// main.js

const { app, BrowserWindow, ipcMain } = require('electron'); // <-- Make sure ipcMain is here
const path = require('path');

function createWindow() {
  // Create the browser window.
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, 'assets/Sol Logo.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true
    }
  });

  // Load the "face" of your app (the HTML file)
  win.loadFile('index.html');
  
  // win.webContents.openDevTools();

  // --- THIS IS THE FIX ---
  // It removes the default "File, Edit, View..." menu
  win.setMenu(null);
  // -----------------------

  // --- Listen for messages from the settings panel ---
  
  // Listen for "toggle-fullscreen"
  ipcMain.on('toggle-fullscreen', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) {
      window.setFullScreen(!window.isFullScreen());
    }
  });

  // Listen for "toggle-devtools"
  ipcMain.on('toggle-devtools', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) {
      window.webContents.toggleDevTools();
    }
  });

  // Listen for "quit-app"
  ipcMain.on('quit-app', () => {
    app.quit();
  });
}

// Electron is ready to go! Let's create the window.
app.whenReady().then(createWindow);

// Quit when all windows are closed (standard behavior)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') { // 'darwin' is macOS
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});