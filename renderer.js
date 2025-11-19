// renderer.js - Clean titles (No more "- Google Search")

const Sortable = require('sortablejs');
const { ipcRenderer } = require('electron');

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

// Context Menu elements
const contextMenu = document.getElementById('context-menu');
const ctxAddFolder = document.getElementById('ctx-add-folder');
const ctxAddNestedFolder = document.getElementById('ctx-add-nested-folder');
const ctxRenameFolder = document.getElementById('ctx-rename-folder');
const ctxDeleteFolder = document.getElementById('ctx-delete-folder');

// Settings Toggle Elements
const settingsBtn = document.getElementById('settings-btn');
const themeControls = document.getElementById('theme-controls');

// Menu buttons
const toggleFullscreenBtn = document.getElementById('toggle-fullscreen-btn');
const toggleDevtoolsBtn = document.getElementById('toggle-devtools-btn');
const quitBtn = document.getElementById('quit-btn');

// Spotlight Elements
const spotlightOverlay = document.getElementById('spotlight-overlay');
const spotlightInput = document.getElementById('spotlight-input');


// A global variable to track the currently active tab ID
let activeTabId = null;

// Global var to store the target for a new folder
let contextMenuTargetContainer = null;

// --- 2. Helper Functions ---

function getActiveWebview() {
    return document.querySelector(`.webview-item.active`);
}

/**
 * Determines if input is a URL or a Search Query
 */
function processUrl(input) {
    if (input.includes(' ')) {
        return 'https://www.google.com/search?q=' + encodeURIComponent(input);
    }
    const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
    if (domainRegex.test(input) || input.startsWith('localhost') || input.includes('://')) {
        if (!input.startsWith('http://') && !input.startsWith('https://') && !input.startsWith('file://')) {
            return 'https://' + input;
        }
        return input;
    }
    return 'https://www.google.com/search?q=' + encodeURIComponent(input);
}

function closeTab(tabId) {
    const tabButton = document.querySelector(`.tab-item[data-id="${tabId}"]`);
    const webview = document.querySelector(`.webview-item[data-id="${tabId}"]`);

    if (!tabButton || !webview) return;

    let nextTabId = null;
    if (activeTabId === tabId) {
        const allTabs = Array.from(document.querySelectorAll('.tab-item'));
        const currentIndex = allTabs.findIndex(tab => tab.dataset.id === tabId);

        if (currentIndex !== -1) {
            if (currentIndex < allTabs.length - 1) {
                nextTabId = allTabs[currentIndex + 1].dataset.id;
            } 
            else if (currentIndex > 0) {
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

    tabList.appendChild(tabButton);
    tabList.scrollTop = tabList.scrollHeight;

    // --- PART 2: Create the Webview ---
    setTimeout(() => {
        const webview = document.createElement('webview');
        webview.className = 'webview-item';
        webview.setAttribute('data-id', tabId);
        webview.src = url;

        // Add webview event listeners
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
            
            // --- THIS IS THE FIX ---
            // Get title, remove "- Google Search", then truncate
            let cleanTitle = webview.getTitle().replace(' - Google Search', '');
            titleSpan.textContent = cleanTitle.substring(0, 25) || "New Tab";
            // -----------------------
        });

        webview.addEventListener('did-navigate', (event) => {
            if (webview.getAttribute('data-id') === activeTabId) {
                urlBar.value = event.url;
            }
        });

        webviewContainer.appendChild(webview);
        activateTab(tabId);
        
    }, 50);
}

function createNewFolder(parentElement) {
    const folderId = "folder-" + Date.now();

    // 1. Create Folder Header
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

    // 2. Create Folder Content (the drop zone)
    const folderContent = document.createElement('div');
    folderContent.className = 'folder-content';
    folderContent.id = folderId;

    // 3. Add Collapse/Expand listener
    folderItem.addEventListener('click', (e) => {
        if (e.target.className === 'folder-title') return;
        folderItem.classList.toggle('collapsed');
    });

    // 4. Add to DOM
    parentElement.appendChild(folderItem);
    parentElement.appendChild(folderContent);

    // 5. Make the new folder content area sortable
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

// --- Spotlight Logic ---
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

spotlightOverlay.addEventListener('click', (e) => {
    if (e.target === spotlightOverlay) {
        toggleSpotlight();
    }
});

spotlightInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        let input = spotlightInput.value;
        if (input) {
            let validUrl = processUrl(input);
            createNewTab(validUrl); 
            toggleSpotlight(); 
        }
    } else if (e.key === 'Escape') {
        toggleSpotlight();
    }
});


// --- 3. Global Event Listeners ---

window.addEventListener('keydown', (event) => {
    if (event.ctrlKey && event.key === 't') {
        event.preventDefault();
        toggleSpotlight(); 
    }
    else if (event.ctrlKey && event.key === 'w') {
        event.preventDefault();
        if (activeTabId) {
            closeTab(activeTabId);
        }
    }
    else if (event.ctrlKey && event.key === 's') {
        event.preventDefault();
        sidebar.classList.toggle('hidden');
        resizer.classList.toggle('hidden');
    }
    else if (event.key === 'Escape' && spotlightOverlay.classList.contains('visible')) {
        toggleSpotlight();
    }
});

// Sidebar URL Bar Listener
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

backBtn.addEventListener('click', () => {
    getActiveWebview()?.goBack();
});
forwardBtn.addEventListener('click', () => {
    getActiveWebview()?.goForward();
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
        handle: '.tab-item, .folder-item',
        filter: '.folder-content',
        animation: 150,
    });
}

// --- 4. Initialization ---
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

// --- 6. Context Menu Logic ---

window.addEventListener('click', () => {
    contextMenu.style.display = 'none';
});

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

ctxAddFolder.addEventListener('click', () => {
    createNewFolder(tabList);
    contextMenu.style.display = 'none';
});

ctxAddNestedFolder.addEventListener('click', () => {
    const folderId = contextMenu.dataset.targetId;
    const folderContent = document.getElementById(folderId);
    if (folderContent) {
        createNewFolder(folderContent);
    }
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
        while (folderContent.firstChild) {
            parentContainer.insertBefore(folderContent.firstChild, folderHeader);
        }
        folderHeader.remove();
        folderContent.remove();
    }
    contextMenu.style.display = 'none';
});

// --- 7. Settings Toggle Logic ---
settingsBtn.addEventListener('click', () => {
    themeControls.classList.toggle('visible');
    settingsBtn.classList.toggle('active');
});

// --- 8. Menu Button IPC Listeners ---
toggleFullscreenBtn.addEventListener('click', () => {
    ipcRenderer.send('toggle-fullscreen');
});

toggleDevtoolsBtn.addEventListener('click', () => {
    ipcRenderer.send('toggle-devtools');
});

quitBtn.addEventListener('click', () => {
    ipcRenderer.send('quit-app');
});