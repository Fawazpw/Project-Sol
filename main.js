// main.js - The "Brain" of your Electron App

// Import the two main parts of Electron
const { app, BrowserWindow } = require('electron');

// A function that creates the actual browser window
function createWindow() {
  // Create the browser window.
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,      // Allows your window to use Node.js
      contextIsolation: false,   // For simplicity in this first step
      webPreferences: true, 
      webviewTag: true          // Enable <webview> tag in this window
    }
  });

  // Load the "face" of your app (the HTML file)
  win.loadFile('index.html');

  // Optional: Open the DevTools (like Chrome's "Inspect" tool)
  win.webContents.openDevTools();
}

// Electron is ready to go! Let's create the window.
app.whenReady().then(createWindow);

// Quit when all windows are closed (standard behavior)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') { // 'darwin' is macOS
    app.quit();
  }
});