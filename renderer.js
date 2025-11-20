// renderer.js - History, Restore, and Incognito logic added

const Sortable = require('sortablejs');
const { ipcRenderer } = require('electron');

// --- 1. DOM Elements ---
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

// --- Global State ---
let activeTabId = null;
let contextMenuTargetContainer = null;

// NEW: Data Storage
const historyLog = []; // Stores { title, url, time }
const closedTabsStack = []; // Stores URLs of closed tabs (LIFO)

// --- 2. Helper Functions ---

function getActiveWebview() {
    return document.querySelector(`.webview-item.active`);
}

function processUrl(input) {
    // Handle internal history page
    if (input === 'sol://history') return input; 

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

// --- NEW: Restore Last Closed Tab ---
function restoreClosedTab() {
    if (closedTabsStack.length > 0) {
        const lastUrl = closedTabsStack.pop();
        createNewTab(lastUrl);
    }
}

// --- NEW: Open History Tab ---
function openHistoryTab() {
    // Generate a simple HTML page for history
    let listItems = historyLog.map(item => `
        <li style="margin-bottom: 10px; padding: 10px; background: #333; border-radius: 6px;">
            <div style="font-weight:bold; color: #fff;">${item.title}</div>
            <div style="color: #aaa; font-size: 0.9em;">${item.url}</div>
            <div style="color: #666; font-size: 0.8em;">${item.time}</div>
        </li>
    `).reverse().join('');

    const htmlContent = `
        data:text/html,
        <html>
        <head>
            <title>History</title>
            <style>
                body { font-family: system-ui; background: #222; color: white; padding: 40px; }
                h1 { border-bottom: 1px solid #444; padding-bottom: 10px; }
                ul { list-style: none; padding: 0; }
            </style>
        </head>
        <body>
            <h1>Browsing History</h1>
            <ul>${listItems}</ul>
        </body>
        </html>
    `;
    
    createNewTab(htmlContent);
}

function closeTab(tabId) {
    if (!tabId) {
        const activeItem = document.querySelector('.tab-item.active');
        if (activeItem) {
            tabId = activeItem.dataset.id;
        } else {
            return; 
        }
    }

    const tabButton = document.querySelector(`.tab-item[data-id="${tabId}"]`);
    const webview = document.querySelector(`.webview-item[data-id="${tabId}"]`);

    if (!tabButton || !webview) return;

    // --- NEW: Save URL before closing ---
    // Don't save if it's the history page or blank
    const currentUrl = webview.getURL();
    if (currentUrl && !currentUrl.startsWith('data:')) {
        closedTabsStack.push(currentUrl);
    }
    // ------------------------------------

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

    if (nextTabId) {
        activateTab(nextTabId);
    }

    tabButton.classList.add('closing');

    setTimeout(() => {
        tabButton.remove();
        webview.remove();

        const remainingTabs = document.querySelectorAll('.tab-item');
        if (remainingTabs.length === 0) {
             activeTabId = null;
             urlBar.value = ''; 
        }
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

    if (typeof webview.getURL === 'function') {
        // Handle special history URL display
        const currentUrl = webview.getURL();
        if (currentUrl.startsWith('data:')) {
             urlBar.value = "sol://history";
        } else {
             urlBar.value = currentUrl;
        }
        
        backBtn.disabled = !webview.canGoBack();
        forwardBtn.disabled = !webview.canGoForward();
    } else {
        urlBar.value = webview.src;
        backBtn.disabled = true;
        forwardBtn.disabled = true;
    }
    activeTabId = tabId;
}

function createNewTab(url = "https://www.google.com") {
    const tabId = "tab-" + Date.now(); 
    const tabButton = document.createElement('div');
    tabButton.className = 'tab-item';
    tabButton.setAttribute('data-id', tabId);

    const titleSpan = document.createElement('span');
    titleSpan.className = 'tab-title';
    titleSpan.textContent = 'New Tab';

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
            if (activeWebview && webview.getAttribute('data-id') === activeWebview.getAttribute('data-id')) {
                const currentUrl = webview.getURL();
                // Clean up data URLs for the URL bar
                if (currentUrl.startsWith('data:')) {
                    urlBar.value = "sol://history";
                    titleSpan.textContent = "History";
                } else {
                    urlBar.value = currentUrl;
                    backBtn.disabled = !webview.canGoBack();
                    forwardBtn.disabled = !webview.canGoForward();
                    let cleanTitle = webview.getTitle().replace(' - Google Search', '');
                    titleSpan.textContent = cleanTitle.substring(0, 25) || "New Tab";
                }
                reloadBtn.innerHTML = '&#x21bb;';
            }
        });

        // --- NEW: History Tracking ---
        webview.addEventListener('did-navigate', (event) => {
            if (webview.getAttribute('data-id') === activeTabId) {
                if (!event.url.startsWith('data:')) {
                    urlBar.value = event.url;
                }
            }
            
            // Log to history array
            if (event.url && !event.url.startsWith('data:')) {
                historyLog.push({
                    title: webview.getTitle() || event.url,
                    url: event.url,
                    time: new Date().toLocaleTimeString()
                });
            }
        });

        webviewContainer.appendChild(webview);
        activateTab(tabId);
    }, 50);
}

// ... (createNewFolder, stopEditingFolderTitle, handleRenameKeys remain unchanged) ...
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

// Spotlight Logic
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

// NEW: Listeners for Keyboard Shortcuts from Main Process
ipcRenderer.on('shortcut-new-tab', () => toggleSpotlight());
ipcRenderer.on('shortcut-close-tab', () => closeTab()); 
ipcRenderer.on('shortcut-toggle-sidebar', () => {
    sidebar.classList.toggle('hidden');
    resizer.classList.toggle('hidden');
});
ipcRenderer.on('shortcut-restore-tab', () => restoreClosedTab()); // Ctrl+Shift+T
ipcRenderer.on('shortcut-history', () => openHistoryTab());       // Ctrl+H

// Local Key Listeners
window.addEventListener('keydown', (event) => {
    if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 't') { // Restore
        event.preventDefault();
        restoreClosedTab();
    }
    else if (event.ctrlKey && event.key === 't') { // New Tab
        event.preventDefault();
        toggleSpotlight(); 
    }
    else if (event.ctrlKey && event.key === 'w') { // Close
        event.preventDefault();
        closeTab(); 
    }
    else if (event.ctrlKey && event.key === 's') { // Toggle Sidebar
        event.preventDefault();
        sidebar.classList.toggle('hidden');
        resizer.classList.toggle('hidden');
    }
    else if (event.ctrlKey && event.key === 'h') { // History
        event.preventDefault();
        openHistoryTab();
    }
    else if (event.key === 'Escape' && spotlightOverlay.classList.contains('visible')) {
        toggleSpotlight();
    }
});

// Sidebar URL Bar
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

initResizer();
initSortable();

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