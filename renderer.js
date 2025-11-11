// renderer.js - This is the "Wiring" for our "Face" (index.html)

// Get all the elements we need from the DOM
const webview = document.getElementById('browser-view');
const urlBar = document.getElementById('url-bar');
const backBtn = document.getElementById('back-btn');
const forwardBtn = document.getElementById('forward-btn');
const reloadBtn = document.getElementById('reload-btn');

// ---------------------------------
// 1. WEBVIEW EVENT LISTENERS
// ---------------------------------

// When the webview starts loading, show the URL in the bar
webview.addEventListener('did-start-loading', () => {
    // We'll add a loading spinner later
});

// When the webview finishes loading
webview.addEventListener('did-stop-loading', () => {
    const currentURL = webview.getURL();
    urlBar.value = currentURL;

    // Update button states
    backBtn.disabled = !webview.canGoBack();
    forwardBtn.disabled = !webview.canGoForward();
});

// When the page in the webview updates its URL (e.g., clicks a link)
webview.addEventListener('did-navigate', (event) => {
    urlBar.value = event.url;
});

// ---------------------------------
// 2. URL BAR EVENT LISTENERS
// ---------------------------------

// When the user presses "Enter" in the URL bar
urlBar.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        let url = urlBar.value;

        // Add "https://" if it's missing
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }

        // Tell the webview to load the URL
        webview.loadURL(url);
    }
});

// ---------------------------------
// 3. NAV BUTTON EVENT LISTENERS
// ---------------------------------

backBtn.addEventListener('click', () => {
    webview.goBack();
});

forwardBtn.addEventListener('click', () => {
    webview.goForward();
});

reloadBtn.addEventListener('click', () => {
    webview.reload();
});