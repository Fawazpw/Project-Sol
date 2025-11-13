// renderer.js - Now with a custom context menu!

const Sortable = require('sortablejs');

// --- 1. Get elements from the DOM ---
const sidebar = document.getElementById('sidebar');
const resizer = document.getElementById('resizer');

const urlBar = document.getElementById('url-bar');
const backBtn = document.getElementById('back-btn');
const forwardBtn = document.getElementById('forward-btn');
const reloadBtn = document.getElementById('reload-btn');

const tabList = document.getElementById('tab-list');
const webviewContainer = document.getElementById('webview-container');

// Get theme control elements
const darkModeToggleBtn = document.getElementById('dark-mode-toggle-btn');
const colorPicker = document.getElementById('sidebar-color-picker');
const resetColorBtn = document.getElementById('reset-color-btn');
// const addFolderBtn = document.getElementById('add-folder-btn'); // <-- DELETED
// Settings Toggle Elements
const settingsBtn = document.getElementById('settings-btn');
const themeControls = document.getElementById('theme-controls');

// Context Menu elements
const contextMenu = document.getElementById('context-menu');
const ctxAddFolder = document.getElementById('ctx-add-folder');
const ctxRenameFolder = document.getElementById('ctx-rename-folder');
const ctxDeleteFolder = document.getElementById('ctx-delete-folder');


// A global variable to track the currently active tab ID
let activeTabId = null;

// --- 2. Helper Functions ---

function getActiveWebview() {
    return document.querySelector(`.webview-item.active`);
}

function closeTab(tabId) {
    const tabButton = document.querySelector(`.tab-item[data-id="${tabId}"]`);
    const webview = document.querySelector(`.webview-item[data-id="${tabId}"]`);

    if (!tabButton || !webview) return;

    let nextTabId = null;
    if (activeTabId === tabId) {
        const nextTab = tabButton.nextElementSibling;
        const prevTab = tabButton.previousElementSibling;
        
        if (nextTab) {
            nextTabId = nextTab.dataset.id;
        } else if (prevTab) {
            nextTabId = prevTab.dataset.id;
        }
    }

    tabButton.remove();
    webview.remove();

    if (nextTabId) {
        activateTab(nextTabId);
    } else {
        const remainingTabs = document.querySelectorAll('.tab-item');
        if (remainingTabs.length === 0) {
            createNewTab();
        } else if (activeTabId === tabId) {
            activateTab(remainingTabs[0].dataset.id);
        }
    }
}

function activateTab(tabId) {
    document.querySelectorAll('.tab-item.active').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.webview-item.active').forEach(view => {
        view.classList.remove('active');
    });

    const tabButton = document.querySelector(`.tab-item[data-id="${tabId}"]`);
    const webview = document.querySelector(`.webview-item[data-id="${tabId}"]`);
    
    if (!tabButton || !webview) return;

    tabButton.classList.add('active');
    webview.classList.add('active');

    if (typeof webview.getURL === 'function') {
        const url = webview.getURL();
        urlBar.value = url;
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

    // 1. Create the tab button
    const tabButton = document.createElement('div');
    tabButton.className = 'tab-item';
    tabButton.setAttribute('data-id', tabId);

    const titleSpan = document.createElement('span');
    titleSpan.className = 'tab-title';
    titleSpan.textContent = 'New Tab';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'tab-close-btn';
    closeBtn.innerHTML = '&#10005;';

    // --- Add Listeners ---
    titleSpan.addEventListener('click', () => {
        activateTab(tabId);
    });
    tabButton.addEventListener('click', (e) => {
        if (e.target === tabButton) {
            activateTab(tabId);
        }
    });
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation(); 
        closeTab(tabId);
    });

    tabButton.appendChild(titleSpan);
    tabButton.appendChild(closeBtn);
    
    // 2. Create the webview
    const webview = document.createElement('webview');
    webview.className = 'webview-item';
    webview.setAttribute('data-id', tabId);
    webview.src = url;

    // --- 3. Add webview event listeners ---
    webview.addEventListener('did-start-loading', () => {
        if (webview.getAttribute('data-id') === activeTabId) {
            reloadBtn.innerHTML = '&#10005;';
        }
    });

    webview.addEventListener('did-stop-loading', () => {
        const activeWebview = getActiveWebview();
        if (activeWebview && webview.getAttribute('data-id') === activeWebview.getAttribute('data-id')) {
            urlBar.value = webview.getURL();
            backBtn.disabled = !webview.canGoBack();
            forwardBtn.disabled = !webview.canGoForward();
            reloadBtn.innerHTML = '&#x21bb;';
        }
        
        titleSpan.textContent = webview.getTitle().substring(0, 25) || "New Tab";
    });

    webview.addEventListener('did-navigate', (event) => {
        if (webview.getAttribute('data-id') === activeTabId) {
            urlBar.value = event.url;
        }
    });
    
    // 4. Add the new elements to the DOM
    tabList.appendChild(tabButton); // Always add to the main list
    webviewContainer.appendChild(webview);

    // 5. Activate the new tab
    activateTab(tabId);
}

/**
 * --- UPDATED: Creates a new folder ---
 */
function createNewFolder() {
    const folderId = "folder-" + Date.now();

    // 1. Create Folder Header
    const folderItem = document.createElement('div');
    folderItem.className = 'folder-item';
    folderItem.setAttribute('data-id', folderId); // <-- Store its ID

    const toggle = document.createElement('span');
    toggle.className = 'folder-toggle';
    toggle.innerHTML = '&#9660;'; // Down arrow
    
    const title = document.createElement('span');
    title.className = 'folder-title';
    title.textContent = 'New Folder';
    // title.setAttribute('contenteditable', 'true'); // <-- REMOVED

    folderItem.appendChild(toggle);
    folderItem.appendChild(title);

    // 2. Create Folder Content (the drop zone)
    const folderContent = document.createElement('div');
    folderContent.className = 'folder-content';
    folderContent.id = folderId; // Give it an ID for Sortable

    // 3. Add Collapse/Expand listener
    folderItem.addEventListener('click', (e) => {
        // Don't collapse when clicking the title (e.g., during rename)
        if (e.target.className === 'folder-title') return;
        folderItem.classList.toggle('collapsed');
    });

    // 4. Add to DOM
    tabList.appendChild(folderItem);
    tabList.appendChild(folderContent);

    // 5. Make the new folder content area sortable
    new Sortable(folderContent, {
        group: 'shared-tabs', // Must match the main list
        animation: 150,
    });
}

/**
 * --- NEW: Finishes the rename process ---
 */
function stopEditingFolderTitle(titleElement) {
    titleElement.setAttribute('contenteditable', 'false');
    titleElement.removeEventListener('blur', stopEditingFolderTitle);
    titleElement.removeEventListener('keydown', handleRenameKeys);
    // Clear selection
    window.getSelection().removeAllRanges();
}

/**
 * --- NEW: Handles Enter/Escape during rename ---
 */
function handleRenameKeys(e) {
    if (e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault();
        stopEditingFolderTitle(e.target);
    }
}

// --- 3. Global Event Listeners ---

window.addEventListener('keydown', (event) => {
    if (event.ctrlKey && event.key === 't') {
        event.preventDefault();
        createNewTab();
    }
    else if (event.ctrlKey && event.key === 'w') {
        event.preventDefault();
        if (activeTabId) {
            closeTab(activeTabId);
        }
    }
});

urlBar.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        let url = urlBar.value;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }
        getActiveWebview().loadURL(url);
    }
});

// Nav buttons
backBtn.addEventListener('click', () => {
    getActiveWebview().goBack();
});
forwardBtn.addEventListener('click', () => {
    getActiveWebview().goForward();
});
reloadBtn.addEventListener('click', () => { 
    const activeWebview = getActiveWebview();
    if (!activeWebview) return;
    
    if (reloadBtn.innerHTML.includes('✕')) {
        activeWebview.stop();
    } else {
        activeWebview.reload();
    }
});

// --- Resizer Logic ---
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
        animation: 150,
        filter: '.folder-content',
        handle: '.tab-item'
    });
}

// --- 4. Initialization ---
createNewTab();
initResizer();
initSortable();

// --- 5. Theme Logic ---

colorPicker.addEventListener('input', (e) => {
    const newColor = e.target.value;
    document.body.style.setProperty('--bg-sidebar', newColor);
});
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

// --- 6. NEW: Context Menu Logic ---

// Hide menu on any left-click
window.addEventListener('click', () => {
    contextMenu.style.display = 'none';
});

// Main context menu listener for the sidebar
sidebar.addEventListener('contextmenu', (e) => {
    e.preventDefault();

    // Find what we clicked on
    const clickedFolder = e.target.closest('.folder-item');

    // Hide all buttons first
    ctxAddFolder.style.display = 'none';
    ctxRenameFolder.style.display = 'none';
    ctxDeleteFolder.style.display = 'none';

    if (clickedFolder) {
        // We right-clicked a folder
        ctxRenameFolder.style.display = 'block';
        ctxDeleteFolder.style.display = 'block';
        // Store which folder we clicked
        contextMenu.dataset.targetId = clickedFolder.dataset.id;
    } else {
        // We clicked on empty space (or a tab, but we'll just show 'Add Folder')
        ctxAddFolder.style.display = 'block';
        contextMenu.dataset.targetId = ''; // Clear target
    }

    // Position and show the menu
    contextMenu.style.top = `${e.clientY}px`;
    contextMenu.style.left = `${e.clientX}px`;
    contextMenu.style.display = 'block';
});

// --- NEW: Context Menu Button Listeners ---

ctxAddFolder.addEventListener('click', () => {
    createNewFolder();
    contextMenu.style.display = 'none';
});

ctxRenameFolder.addEventListener('click', () => {
    const folderId = contextMenu.dataset.targetId;
    const folderHeader = document.querySelector(`.folder-item[data-id="${folderId}"]`);
    if (folderHeader) {
        const titleElement = folderHeader.querySelector('.folder-title');
        
        // Make it editable
        titleElement.setAttribute('contenteditable', 'true');
        
        // Add listeners to stop editing
        titleElement.addEventListener('blur', () => stopEditingFolderTitle(titleElement));
        titleElement.addEventListener('keydown', handleRenameKeys);

        // Focus and select the text
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
        // Move all tabs inside this folder back to the main tabList
        const tabsInFolder = folderContent.querySelectorAll('.tab-item');
        tabsInFolder.forEach(tab => {
            tabList.appendChild(tab); // Move it
        });
        
        // Now, delete the empty folder
        folderHeader.remove();
        folderContent.remove();
    }
contextMenu.style.display = 'none';
// --- 7. NEW: Settings Toggle Logic ---
settingsBtn.addEventListener('click', () => {
// Toggle the panel
themeControls.classList.toggle('visible');
// Toggle the button's "active" state
settingsBtn.classList.toggle('active');
});
});