// renderer.js - Fixed Incognito Startup Screen & UI Polish

const Sortable = require('sortablejs');
const { ipcRenderer } = require('electron');

// --- 1. Detect Incognito Mode & Force Theme ---
const isIncognito = window.process.argv.includes('--is-incognito');

if (isIncognito) {
    document.body.dataset.theme = 'dark';
    document.title += " (Incognito)";
    document.addEventListener('DOMContentLoaded', () => {
        const toggleBtn = document.getElementById('dark-mode-toggle-btn');
        if (toggleBtn) {
            toggleBtn.disabled = true;
            toggleBtn.textContent = "Dark Mode Locked (Incognito)";
        }
    });
}

// --- 2. DOM Elements ---
const sidebar = document.getElementById('sidebar');
const resizer = document.getElementById('resizer');
const urlBar = document.getElementById('url-bar');
const backBtn = document.getElementById('back-btn');
const forwardBtn = document.getElementById('forward-btn');
const reloadBtn = document.getElementById('reload-btn');
const tabList = document.getElementById('tab-list');
const webviewContainer = document.getElementById('webview-container');

// Theme & Settings
const darkModeToggleBtn = document.getElementById('dark-mode-toggle-btn');
const colorPicker = document.getElementById('sidebar-color-picker');
const resetColorBtn = document.getElementById('reset-color-btn');
const settingsBtn = document.getElementById('settings-btn');
const themeControls = document.getElementById('theme-controls');

// Context Menu
const contextMenu = document.getElementById('context-menu');
const ctxAddFolder = document.getElementById('ctx-add-folder');
const ctxAddNestedFolder = document.getElementById('ctx-add-nested-folder');
const ctxRenameFolder = document.getElementById('ctx-rename-folder');
const ctxDeleteFolder = document.getElementById('ctx-delete-folder');

// Menu Buttons
const toggleFullscreenBtn = document.getElementById('toggle-fullscreen-btn');
const toggleDevtoolsBtn = document.getElementById('toggle-devtools-btn');
const quitBtn = document.getElementById('quit-btn');

// Spotlight
const spotlightOverlay = document.getElementById('spotlight-overlay');
const spotlightInput = document.getElementById('spotlight-input');

// Global State
let activeTabId = null;
let contextMenuTargetContainer = null;

// Load history and bookmarks only if NOT incognito
let historyLog = [];
let bookmarks = [];

if (!isIncognito) {
    try {
        historyLog = JSON.parse(localStorage.getItem('solHistory')) || [];
    } catch (e) { console.error("Error loading history", e); }

    try {
        bookmarks = JSON.parse(localStorage.getItem('solBookmarks')) || [];
    } catch (e) { console.error("Error loading bookmarks", e); }
}

// Session Persistence
function saveSession() {
    if (isIncognito) return;
    const tabs = [];
    document.querySelectorAll('.tab-item').forEach(tab => {
        const id = tab.dataset.id;
        const webview = document.querySelector(`.webview-item[data-id="${id}"]`);
        if (webview) {
            const url = webview.getURL() || webview.src;
            tabs.push({
                url: url,
                title: webview.getTitle(),
                active: tab.classList.contains('active')
            });
        }
    });
    localStorage.setItem('solSession', JSON.stringify(tabs));
}

function restoreSession() {
    if (isIncognito) return null;
    try {
        const savedSession = JSON.parse(localStorage.getItem('solSession'));
        if (savedSession && Array.isArray(savedSession) && savedSession.length > 0) {
            return savedSession;
        }
    } catch (e) { console.error("Session restore failed", e); }
    return null;
}

// Bookmarks Logic
function toggleBookmark() {
    const activeWebview = getActiveWebview();
    if (!activeWebview) return;

    const url = activeWebview.getURL();
    const title = activeWebview.getTitle();

    if (!url || url.startsWith('data:') && !url.includes('sol://')) return;
    if (url.startsWith('data:')) return;

    const index = bookmarks.findIndex(b => b.url === url);
    const btn = document.getElementById('bookmark-btn');

    if (index === -1) {
        bookmarks.push({ title: title || url, url, timestamp: Date.now() });
        if (btn) {
            btn.classList.add('active');
            btn.textContent = "★";
        }
    } else {
        bookmarks.splice(index, 1);
        if (btn) {
            btn.classList.remove('active');
            btn.textContent = "☆";
        }
    }

    if (!isIncognito) localStorage.setItem('solBookmarks', JSON.stringify(bookmarks));
}

function updateBookmarkButton() {
    const activeWebview = getActiveWebview();
    const btn = document.getElementById('bookmark-btn');
    if (!activeWebview || !btn) return;

    const url = activeWebview.getURL();
    const isBookmarked = bookmarks.some(b => b.url === url);

    if (isBookmarked) {
        btn.classList.add('active');
        btn.textContent = "★";
    } else {
        btn.classList.remove('active');
        btn.textContent = "☆";
    }
}

const closedTabsStack = [];

// --- 3. Helper Functions ---

function getActiveWebview() {
    return document.querySelector(`.webview-item.active`);
}

function processUrl(input) {
    if (input === 'sol://history') return input;
    if (input === 'sol://incognito') return input;
    if (input === 'sol://bookmarks') return input;
    if (input === 'sol://settings') return input;

    if (input.includes(' ')) {
        return 'https://www.google.com/search?q=' + encodeURIComponent(input);
    }
    const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
    if (domainRegex.test(input) || input.startsWith('localhost') || input.includes('://')) {
        if (!input.startsWith('http://') && !input.startsWith('https://') && !input.startsWith('file://') && !input.startsWith('data:')) {
            return 'https://' + input;
        }
        return input;
    }
    return 'https://www.google.com/search?q=' + encodeURIComponent(input);
}

function restoreClosedTab() {
    if (closedTabsStack.length > 0) {
        const lastUrl = closedTabsStack.pop();
        createNewTab(lastUrl);
    }
}

// Generic page style for consistency
const COMMON_STYLE = `
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #121212; color: #e0e0e0; margin: 0; padding: 0; min-height: 100vh; display: flex; flex-direction: column; align-items: center; }
    .container { width: 100%; max-width: 900px; padding: 40px 20px; box-sizing: border-box; }
    h1 { font-weight: 600; font-size: 28px; margin-bottom: 5px; color: #fff; letter-spacing: -0.5px; }
    .subtitle { color: #888; font-size: 14px; margin-bottom: 40px; }
    .card-list { display: flex; flex-direction: column; gap: 8px; }
    .card { 
        display: flex; align-items: center; padding: 16px 20px; 
        background: #1e1e1e; border-radius: 12px; border: 1px solid #333;
        transition: all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
        text-decoration: none; color: inherit;
    }
    .card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.4); border-color: #444; background: #252525; }
    .card-icon { width: 40px; height: 40px; border-radius: 8px; background: #333; display: flex; align-items: center; justify-content: center; margin-right: 16px; font-size: 20px; }
    .card-info { flex: 1; min-width: 0; }
    .card-title { font-weight: 500; font-size: 15px; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #fff; }
    .card-url { font-size: 13px; color: #888; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .card-date { font-size: 12px; color: #555; margin-left: 16px; min-width: 80px; text-align: right; }
    .card-actions { margin-left: 16px; }
    .btn-icon { background: none; border: none; cursor: pointer; color: #666; padding: 8px; border-radius: 6px; transition: color 0.2s, background 0.2s; }
    .btn-icon:hover { color: #fe5f55; background: rgba(254, 95, 85, 0.1); }
    input#search { 
        width: 100%; padding: 14px 20px; border-radius: 12px; border: 1px solid #333; 
        background: #1e1e1e; color: white; font-size: 15px; margin-bottom: 30px; 
        box-sizing: border-box; transition: border-color 0.2s; outline: none;
    }
    input#search:focus { border-color: #555; }
    .section-title { font-size: 13px; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 1.2px; margin: 30px 0 10px 0; }
    
    /* Settings specific */
    .setting-group { background: #1e1e1e; border-radius: 12px; border: 1px solid #333; overflow: hidden; }
    .setting-row { display: flex; justify-content: space-between; align-items: center; padding: 20px; border-bottom: 1px solid #333; }
    .setting-row:last-child { border-bottom: none; }
    .setting-label { font-weight: 500; color: #ddd; }
    .setting-desc { font-size: 13px; color: #888; margin-top: 4px; }
    .btn-primary { background: #fff; color: #000; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: opacity 0.2s; }
    .btn-primary:hover { opacity: 0.9; }
    .btn-danger { background: rgba(255, 69, 58, 0.15); color: #ff453a; border: 1px solid rgba(255, 69, 58, 0.3); padding: 10px 20px; border-radius: 8px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
    .btn-danger:hover { background: rgba(255, 69, 58, 0.25); border-color: #ff453a; }
`;

function openHistoryTab() {
    if (isIncognito) return;
    renderInternalPage("History", "Your browsing journey", historyLog, (item) => {
        const domain = new URL(item.url).hostname;
        const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
        const timeString = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        return `
        <a href="${item.url}" class="card" data-search="${(item.title + item.url).toLowerCase()}">
            <div class="card-icon"><img src="${faviconUrl}" style="width:20px;height:20px;"></div>
            <div class="card-info">
                <div class="card-title">${item.title || item.url}</div>
                <div class="card-url">${domain}</div>
            </div>
            <div class="card-date">${timeString}</div>
        </a>`;
    });
}

function openBookmarksTab() {
    if (isIncognito) return;
    renderInternalPage("Bookmarks", "Saved pages", bookmarks, (item) => {
        const domain = new URL(item.url).hostname;
        const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

        return `
        <div class="card" data-search="${(item.title + item.url).toLowerCase()}">
            <div class="card-icon"><img src="${faviconUrl}" style="width:20px;height:20px;"></div>
            <div class="card-info">
                <a href="${item.url}" class="card-title" style="text-decoration:none;display:block;">${item.title || item.url}</a>
                <div class="card-url">${domain}</div>
            </div>
            <div class="card-actions">
                <button onclick="window.removeBookmark('${item.url}')" class="btn-icon">✕</button>
            </div>
        </div>`;
    });
}

function openSettingsTab() {
    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Settings</title>
            <style>${COMMON_STYLE}</style>
        </head>
        <body>
            <div class="container">
                <h1>Settings</h1>
                <div class="subtitle">Customize your browser experience</div>
                
                <div class="section-title">Privacy & Security</div>
                <div class="setting-group">
                    <div class="setting-row">
                        <div>
                            <div class="setting-label">Clear Browsing Data</div>
                            <div class="setting-desc">Remove history, cookies, and cached images</div>
                        </div>
                        <button class="btn-danger" id="clear-data-btn">Clear Data</button>
                    </div>
                </div>

                <div class="section-title">Search Engine</div>
                <div class="setting-group">
                    <div class="setting-row">
                        <div class="setting-label">Default Search Engine</div>
                        <div style="color:#666; font-size:14px;">Google (Default)</div>
                    </div>
                </div>
            </div>

            <script>
                const { ipcRenderer } = require('electron');
                
                document.getElementById('clear-data-btn').addEventListener('click', () => {
                    if(confirm("Are you sure you want to clear all history, cookies, and cache?")) {
                        try {
                            const { ipcRenderer } = require('electron');
                            ipcRenderer.send('clear-data');
                            alert("Browsing data has been cleared.");
                        } catch(e) { alert("Error: " + e.message); }
                    }
                });
            </script>
        </body>
        </html>
    `;
    createNewTab('data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent));
}

// Generic Internal Page Renderer
function renderInternalPage(title, subtitle, dataList, itemRenderer) {
    let listHtml = '';
    const sortedData = [...dataList].reverse();

    if (title === "History") {
        const groups = {};
        sortedData.forEach(item => {
            const date = new Date(item.timestamp);
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            let dateKey = date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
            if (date.toDateString() === today.toDateString()) dateKey = "Today";
            else if (date.toDateString() === yesterday.toDateString()) dateKey = "Yesterday";

            if (!groups[dateKey]) groups[dateKey] = [];
            groups[dateKey].push(item);
        });
        for (const [dateLabel, items] of Object.entries(groups)) {
            listHtml += `<div class="section-title">${dateLabel}</div>`;
            listHtml += `<div class="card-list">`;
            items.forEach(item => listHtml += itemRenderer(item));
            listHtml += `</div>`;
        }
    } else {
        listHtml += `<div class="card-list">`;
        sortedData.forEach(item => listHtml += itemRenderer(item));
        listHtml += `</div>`;
    }

    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${title}</title>
            <style>${COMMON_STYLE}</style>
        </head>
        <body>
            <div class="container">
                <h1>${title}</h1>
                <div class="subtitle">${subtitle}</div>
                <input type="text" id="search" placeholder="Search ${title.toLowerCase()}...">
                <div id="list-container">${listHtml}</div>
            </div>
            <script>
                const searchInput = document.getElementById('search');
                searchInput.addEventListener('input', (e) => {
                    const term = e.target.value.toLowerCase();
                    const items = document.querySelectorAll('.card, .card-list > div'); 
                    // Simple search for now, could be improved
                    document.querySelectorAll('[data-search]').forEach(item => {
                         const text = item.getAttribute('data-search');
                         item.style.display = text.includes(term) ? 'flex' : 'none';
                    });
                });
                window.removeBookmark = (url) => {
                    alert("To remove a bookmark, navigate to the page and toggle the star button.");
                };
            </script>
        </body>
        </html>
    `;
    createNewTab('data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent));
}

function closeTab(tabId) {
    if (!tabId) {
        const activeItem = document.querySelector('.tab-item.active');
        if (activeItem) tabId = activeItem.dataset.id;
        else return;
    }

    const tabButton = document.querySelector(`.tab-item[data-id="${tabId}"]`);
    const webview = document.querySelector(`.webview-item[data-id="${tabId}"]`);

    if (!tabButton || !webview) return;

    const currentUrl = webview.getURL();
    if (!isIncognito && currentUrl && !currentUrl.startsWith('data:')) {
        closedTabsStack.push(currentUrl);
    }

    let nextTabId = null;
    if (activeTabId === tabId) {
        const allTabs = Array.from(document.querySelectorAll('.tab-item'));
        const currentIndex = allTabs.findIndex(tab => tab.dataset.id === tabId);

        if (currentIndex !== -1 && allTabs.length > 1) {
            if (currentIndex < allTabs.length - 1) {
                nextTabId = allTabs[currentIndex + 1].dataset.id;
            } else if (currentIndex > 0) {
                nextTabId = allTabs[currentIndex - 1].dataset.id;
            }
        }
    }

    if (nextTabId) activateTab(nextTabId);

    tabButton.classList.add('closing');

    setTimeout(() => {
        tabButton.remove();
        webview.remove();

        const remainingTabs = document.querySelectorAll('.tab-item');
        if (remainingTabs.length === 0) {
            activeTabId = null;
            urlBar.value = '';
        }
        saveSession();
    }, 200);
}

function activateTab(tabId) {
    document.querySelectorAll('.tab-item.active').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.webview-item.active').forEach(view => view.classList.remove('active'));

    const tabButton = document.querySelector(`.tab-item[data-id="${tabId}"]`);
    const webview = document.querySelector(`.webview-item[data-id="${tabId}"]`);

    if (!tabButton || !webview) return;

    tabButton.classList.add('active');
    webview.classList.add('active');

    // Update URL bar immediately
    updateUrlBarForWebview(webview);

    // Also attach these again in case they were lost (idempotent)
    activeTabId = tabId;
}

function updateUrlBarForWebview(webview) {
    let currentUrl = '';
    // webview might not be ready
    try { currentUrl = webview.getURL(); } catch (e) { }

    if (!currentUrl && webview.src) currentUrl = webview.src;

    if (currentUrl.startsWith('data:')) {
        if (currentUrl.includes('<title>History</title>')) urlBar.value = "sol://history";
        else if (currentUrl.includes('<title>Bookmarks</title>')) urlBar.value = "sol://bookmarks";
        else if (currentUrl.includes('<title>Settings</title>')) urlBar.value = "sol://settings";
        else if (currentUrl.includes('<title>You are Incognito</title>')) urlBar.value = "sol://incognito";
        else urlBar.value = ""; // Don't show raw data URIs
    } else {
        urlBar.value = currentUrl;
    }

    updateBookmarkButton();
    try {
        backBtn.disabled = !webview.canGoBack();
        forwardBtn.disabled = !webview.canGoForward();
    } catch (e) {
        backBtn.disabled = true;
        forwardBtn.disabled = true;
    }
}

function createNewTab(url) {
    // DEFAULT URL LOGIC
    if (!url) {
        if (isIncognito) {
            // Custom Incognito Landing Page
            const incognitoHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>You are Incognito</title>
                    <style>
                        body { background-color: #121212; color: #fff; font-family: 'Inter', sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                        .container { text-align: center; max-width: 600px; padding: 60px; border-radius: 24px; background: #1e1e1e; box-shadow: 0 20px 60px rgba(0,0,0,0.5); }
                        .icon { font-size: 80px; margin-bottom: 30px; opacity: 0.8; }
                        h1 { font-weight: 700; font-size: 32px; margin-bottom: 20px; letter-spacing: -1px; }
                        p { color: #aaa; line-height: 1.6; margin-bottom: 40px; font-size: 16px; }
                        .badge { background: #333; padding: 8px 16px; border-radius: 100px; font-size: 13px; letter-spacing: 1px; text-transform: uppercase; font-weight: 600; color: #fff; border: 1px solid #444; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="icon">🕶️</div>
                        <h1>Incognito Mode</h1>
                        <p>Browse privately. Your activity won't be saved to this device's history. Cookies and site data are cleared when you close all Incognito windows.</p>
                        <span class="badge">Secure Session</span>
                    </div>
                </body>
                </html>
            `;
            url = 'data:text/html;charset=utf-8,' + encodeURIComponent(incognitoHtml);
        } else {
            url = "https://www.google.com";
        }
    } else if (url === "sol://history") {
        openHistoryTab();
        return;
    } else if (url === "sol://bookmarks") {
        openBookmarksTab();
        return;
    } else if (url === "sol://settings") {
        openSettingsTab();
        return;
    }

    const tabId = "tab-" + Date.now();
    const tabButton = document.createElement('div');
    tabButton.className = 'tab-item';
    tabButton.setAttribute('data-id', tabId);

    const titleSpan = document.createElement('span');
    titleSpan.className = 'tab-title';
    titleSpan.textContent = isIncognito ? '🕶️ New Tab' : 'New Tab';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'tab-close-btn';
    closeBtn.innerHTML = '&#10005;';

    titleSpan.addEventListener('click', () => activateTab(tabId));
    tabButton.addEventListener('click', (e) => { if (e.target === tabButton) activateTab(tabId); });
    closeBtn.addEventListener('click', (e) => { e.stopPropagation(); closeTab(tabId); });

    tabButton.appendChild(titleSpan);
    tabButton.appendChild(closeBtn);
    tabList.appendChild(tabButton);
    tabList.scrollTop = tabList.scrollHeight;

    setTimeout(() => {
        const webview = document.createElement('webview');
        webview.className = 'webview-item';
        webview.setAttribute('data-id', tabId);
        webview.src = url;

        webview.addEventListener('did-start-loading', () => {
            if (webview.getAttribute('data-id') === activeTabId) reloadBtn.innerHTML = '&#10005;';
        });

        webview.addEventListener('did-stop-loading', () => {
            const activeWebview = getActiveWebview();
            // Check if this webview is still the active one
            if (activeWebview && webview.getAttribute('data-id') === activeWebview.getAttribute('data-id')) {
                updateUrlBarForWebview(webview);
                reloadBtn.innerHTML = '&#x21bb;';

                // Update Title
                let cleanTitle = webview.getTitle();
                const currentUrl = webview.getURL();

                if (currentUrl.startsWith('data:')) {
                    if (currentUrl.includes('<title>History</title>')) cleanTitle = "History";
                    else if (currentUrl.includes('<title>Bookmarks</title>')) cleanTitle = "Bookmarks";
                    else if (currentUrl.includes('<title>Settings</title>')) cleanTitle = "Settings";
                    else if (currentUrl.includes('<title>You are Incognito</title>')) cleanTitle = "Incognito";
                } else if (cleanTitle.includes(' - Google Search')) {
                    cleanTitle = cleanTitle.replace(' - Google Search', '');
                }
                if (isIncognito) cleanTitle = "🕶️ " + cleanTitle;
                titleSpan.textContent = cleanTitle.substring(0, 25) || "New Tab";
            }
        });

        webview.addEventListener('did-navigate', (event) => {
            // Only update URL bar if this is the active tab
            if (webview.getAttribute('data-id') === activeTabId) {
                updateUrlBarForWebview(webview);
            }

            // HISTORY LOGGING
            if (!isIncognito && event.url && !event.url.startsWith('data:')) {
                historyLog.push({
                    title: webview.getTitle() || event.url,
                    url: event.url,
                    time: new Date().toLocaleString(),
                    timestamp: Date.now()
                });
                localStorage.setItem('solHistory', JSON.stringify(historyLog));
            }
            saveSession();
            updateBookmarkButton();
        });

        webviewContainer.appendChild(webview);
        activateTab(tabId);
        saveSession();
    }, 50);
}

function createNewFolder(parentElement) {
    const folderId = "folder-" + Date.now();
    const folderItem = document.createElement('div');
    folderItem.className = 'folder-item';
    folderItem.setAttribute('data-id', folderId);
    const toggle = document.createElement('span');
    toggle.className = 'folder-toggle';
    toggle.innerHTML = '&#9660;';
    const title = document.createElement('span');
    title.className = 'folder-title';
    title.textContent = 'New Folder';
    folderItem.appendChild(toggle);
    folderItem.appendChild(title);
    const folderContent = document.createElement('div');
    folderContent.className = 'folder-content';
    folderContent.id = folderId;
    folderItem.addEventListener('click', (e) => {
        if (e.target.className === 'folder-title') return;
        folderItem.classList.toggle('collapsed');
    });
    parentElement.appendChild(folderItem);
    parentElement.appendChild(folderContent);
    new Sortable(folderContent, {
        group: 'shared-tabs',
        handle: '.tab-item, .folder-item',
        animation: 150,
    });
}
function stopEditingFolderTitle(titleElement) {
    titleElement.setAttribute('contenteditable', 'false');
    titleElement.removeEventListener('blur', stopEditingFolderTitle);
    titleElement.removeEventListener('keydown', handleRenameKeys);
    window.getSelection().removeAllRanges();
}
function handleRenameKeys(e) {
    if (e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault();
        stopEditingFolderTitle(e.target);
    }
}
function toggleSpotlight() {
    const isVisible = spotlightOverlay.classList.contains('visible');
    if (isVisible) {
        spotlightOverlay.classList.remove('visible');
    } else {
        spotlightOverlay.classList.add('visible');
        spotlightInput.value = '';
        spotlightInput.focus();
    }
}
spotlightOverlay.addEventListener('click', (e) => { if (e.target === spotlightOverlay) toggleSpotlight(); });
spotlightInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        let input = spotlightInput.value;
        if (input) {
            let validUrl = processUrl(input);
            createNewTab(validUrl);
            toggleSpotlight();
        }
    } else if (e.key === 'Escape') toggleSpotlight();
});

// --- 3. Event Listeners ---

ipcRenderer.on('shortcut-new-tab', () => toggleSpotlight());
ipcRenderer.on('shortcut-close-tab', () => closeTab());
ipcRenderer.on('shortcut-toggle-sidebar', () => {
    sidebar.classList.toggle('hidden');
    resizer.classList.toggle('hidden');
});
ipcRenderer.on('shortcut-restore-tab', () => restoreClosedTab());
ipcRenderer.on('shortcut-history', () => openHistoryTab());

ipcRenderer.on('download-progress', (event, { filename, percent }) => {
    const downloadsArea = document.getElementById('downloads-area');
    if (!downloadsArea) return;

    // Check if item exists
    let item = document.getElementById('dl-' + filename);
    if (!item) {
        item = document.createElement('div');
        item.id = 'dl-' + filename;
        item.className = 'download-item';
        // Style handled in index.html
        item.innerHTML = `
            <div class="download-title">${filename}</div>
            <div class="progress-bar"><div class="progress-fill" style="width: 0%"></div></div>
        `;
        downloadsArea.appendChild(item);
    }
    const fill = item.querySelector('.progress-fill');
    if (fill) fill.style.width = (percent * 100) + '%';
});

ipcRenderer.on('download-complete', (event, { filename, state }) => {
    const item = document.getElementById('dl-' + filename);
    if (item) {
        if (state === 'completed') {
            item.querySelector('.progress-fill').style.background = '#4caf50';
            setTimeout(() => item.remove(), 3000);
        } else {
            item.querySelector('.progress-fill').style.background = '#f44336';
        }
    }
});

// Bookmark Button Listener
const bookmarkBtn = document.getElementById('bookmark-btn');
if (bookmarkBtn) {
    bookmarkBtn.addEventListener('click', toggleBookmark);
}

window.addEventListener('keydown', (event) => {
    if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 't') {
        event.preventDefault();
        restoreClosedTab();
    }
    else if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        ipcRenderer.send('new-incognito-window');
    }
    else if (event.ctrlKey && event.key === 't') {
        event.preventDefault();
        toggleSpotlight();
    }
    else if (event.ctrlKey && event.key === 'w') {
        event.preventDefault();
        closeTab();
    }
    else if (event.ctrlKey && event.key === 's') {
        event.preventDefault();
        sidebar.classList.toggle('hidden');
        resizer.classList.toggle('hidden');
    }
    else if (event.ctrlKey && event.key === 'h') {
        event.preventDefault();
        openHistoryTab();
    }
    else if (event.key === 'Escape' && spotlightOverlay.classList.contains('visible')) {
        toggleSpotlight();
    }
});

urlBar.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        let input = urlBar.value;
        let validUrl = processUrl(input);
        const activeWebview = getActiveWebview();
        if (activeWebview) {
            activeWebview.loadURL(validUrl);
        } else {
            createNewTab(validUrl);
        }
    }
});

backBtn.addEventListener('click', () => getActiveWebview()?.goBack());
forwardBtn.addEventListener('click', () => getActiveWebview()?.goForward());
reloadBtn.addEventListener('click', () => {
    const activeWebview = getActiveWebview();
    if (!activeWebview) return;
    if (reloadBtn.innerHTML.includes('✕')) activeWebview.stop();
    else activeWebview.reload();
});

function initResizer() {
    let initialX = 0;
    let initialWidth = 0;
    const handleMouseMove = (e) => {
        const deltaX = e.clientX - initialX;
        let newWidth = initialWidth + deltaX;
        const minWidth = parseInt(getComputedStyle(sidebar).minWidth);
        const maxWidth = parseInt(getComputedStyle(sidebar).maxWidth);
        if (newWidth < minWidth) newWidth = minWidth;
        if (newWidth > maxWidth) newWidth = maxWidth;
        sidebar.style.flexBasis = `${newWidth}px`;
    };
    const handleMouseUp = () => {
        resizer.classList.remove('is-resizing');
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };
    resizer.addEventListener('mousedown', (e) => {
        e.preventDefault();
        resizer.classList.add('is-resizing');
        initialX = e.clientX;
        initialWidth = sidebar.offsetWidth;
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    });
}

function initSortable() {
    new Sortable(tabList, {
        group: 'shared-tabs',
        handle: '.tab-item, .folder-item',
        filter: '.folder-content',
        animation: 150,
    });
}

// --- 4. Initialization ---
initResizer();
initSortable();

// Init Session
if (isIncognito) {
    createNewTab();
} else {
    // Attempt session restore
    const session = restoreSession();
    if (session) {
        session.forEach(tabState => {
            createNewTab(tabState.url);
        });
    } else {
        createNewTab(); // Default new tab
    }
}

colorPicker.addEventListener('input', (e) => document.body.style.setProperty('--bg-sidebar', e.target.value));
resetColorBtn.addEventListener('click', () => {
    document.body.style.removeProperty('--bg-sidebar');
    colorPicker.value = (document.body.dataset.theme === 'dark') ? '#252525' : '#e9ebee';
});
darkModeToggleBtn.addEventListener('click', () => {
    const currentTheme = document.body.dataset.theme;
    if (currentTheme === 'dark') {
        document.body.removeAttribute('data-theme');
        darkModeToggleBtn.textContent = 'Switch to Dark Mode';
    } else {
        document.body.dataset.theme = 'dark';
        darkModeToggleBtn.textContent = 'Switch to Light Mode';
    }
    resetColorBtn.click();
});

if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.body.dataset.theme = 'dark';
    darkModeToggleBtn.textContent = 'Switch to Light Mode';
    colorPicker.value = '#252525';
} else {
    darkModeToggleBtn.textContent = 'Switch to Dark Mode';
    colorPicker.value = '#e9ebee';
}

window.addEventListener('click', () => contextMenu.style.display = 'none');
sidebar.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const clickedFolder = e.target.closest('.folder-item');
    ctxAddFolder.style.display = 'block';
    ctxAddNestedFolder.style.display = 'none';
    ctxRenameFolder.style.display = 'none';
    ctxDeleteFolder.style.display = 'none';
    if (clickedFolder) {
        ctxAddNestedFolder.style.display = 'block';
        ctxRenameFolder.style.display = 'block';
        ctxDeleteFolder.style.display = 'block';
        contextMenu.dataset.targetId = clickedFolder.dataset.id;
    } else {
        contextMenu.dataset.targetId = '';
    }
    contextMenuTargetContainer = e.target.closest('.folder-content') || tabList;
    contextMenu.style.top = `${e.clientY}px`;
    contextMenu.style.left = `${e.clientX}px`;
    contextMenu.style.display = 'block';
});

ctxAddFolder.addEventListener('click', () => { createNewFolder(tabList); contextMenu.style.display = 'none'; });
ctxAddNestedFolder.addEventListener('click', () => {
    const folderId = contextMenu.dataset.targetId;
    const folderContent = document.getElementById(folderId);
    if (folderContent) createNewFolder(folderContent);
    contextMenu.style.display = 'none';
});
ctxRenameFolder.addEventListener('click', () => {
    const folderId = contextMenu.dataset.targetId;
    const folderHeader = document.querySelector(`.folder-item[data-id="${folderId}"]`);
    if (folderHeader) {
        const titleElement = folderHeader.querySelector('.folder-title');
        titleElement.setAttribute('contenteditable', 'true');
        titleElement.addEventListener('blur', () => stopEditingFolderTitle(titleElement));
        titleElement.addEventListener('keydown', handleRenameKeys);
        titleElement.focus();
        document.execCommand('selectAll', false, null);
    }
    contextMenu.style.display = 'none';
});
ctxDeleteFolder.addEventListener('click', () => {
    const folderId = contextMenu.dataset.targetId;
    const folderHeader = document.querySelector(`.folder-item[data-id="${folderId}"]`);
    const folderContent = document.getElementById(folderId);
    if (folderHeader && folderContent) {
        const parentContainer = folderHeader.parentElement;
        while (folderContent.firstChild) parentContainer.insertBefore(folderContent.firstChild, folderHeader);
        folderHeader.remove();
        folderContent.remove();
    }
    contextMenu.style.display = 'none';
});

settingsBtn.addEventListener('click', () => {
    themeControls.classList.toggle('visible');
    settingsBtn.classList.toggle('active');
});
toggleFullscreenBtn.addEventListener('click', () => ipcRenderer.send('toggle-fullscreen'));
toggleDevtoolsBtn.addEventListener('click', () => ipcRenderer.send('toggle-devtools'));
quitBtn.addEventListener('click', () => ipcRenderer.send('quit-app'));