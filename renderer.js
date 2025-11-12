// renderer.js - Now with Ctrl+W shortcut!

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


// A global variable to track the currently active tab ID
let activeTabId = null;

// --- 2. Helper Functions ---

/**
 * Gets the webview element that is currently active
 * @returns {HTMLElement} The active <webview> element
 */
function getActiveWebview() {
    return document.querySelector(`.webview-item.active`);
}

/**
 * Closes a tab and its webview
 * @param {string} tabId - The unique ID of the tab to close
 */
function closeTab(tabId) {
    const tabButton = document.querySelector(`.tab-item[data-id="${tabId}"]`);
    const webview = document.querySelector(`.webview-item[data-id="${tabId}"]`);

    // Guard clause: Don't do anything if tab doesn't exist
    if (!tabButton || !webview) return;

    // Get the ID of the tab to activate next
    let nextTabId = null;
    if (activeTabId === tabId) { // Only find a new tab if we're closing the active one
        const nextTab = tabButton.nextElementSibling;
        const prevTab = tabButton.previousElementSibling;
        
        if (nextTab) {
            nextTabId = nextTab.dataset.id;
        } else if (prevTab) {
            nextTabId = prevTab.dataset.id;
        }
    }

    // Remove the tab and webview from the DOM
    tabButton.remove();
    webview.remove();

    // If we determined a new tab to activate, do it
    if (nextTabId) {
        activateTab(nextTabId);
    } else {
        // Check if any tabs are left at all
        const remainingTabs = document.querySelectorAll('.tab-item');
        if (remainingTabs.length === 0) {
            // We closed the last tab. Let's create a new one.
            createNewTab();
        } else if (activeTabId === tabId) {
            // We closed the active tab, but it was the last one.
            // Activate the first tab in the list.
            activateTab(remainingTabs[0].dataset.id);
        }
    }
}

/**
 * Activates a tab. This is the core "switching" logic.
 * @param {string} tabId - The unique ID of the tab to activate
 */
function activateTab(tabId) {
    // 1. Remove 'active' class from all tabs and webviews
    document.querySelectorAll('.tab-item.active').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.webview-item.active').forEach(view => {
        view.classList.remove('active');
    });

    // 2. Add 'active' class to the clicked tab and its matching webview
    const tabButton = document.querySelector(`.tab-item[data-id="${tabId}"]`);
    const webview = document.querySelector(`.webview-item[data-id="${tabId}"]`);
    
    // Guard clause: If tab/webview was just closed, it might not exist
    if (!tabButton || !webview) return;

    tabButton.classList.add('active');
    webview.classList.add('active');

    // 3. Update the global URL bar and nav buttons
    
    // Check if the webview is ready by seeing if its functions exist
    if (typeof webview.getURL === 'function') {
        // It's an existing, ready tab. Get its real URL.
        const url = webview.getURL();
        urlBar.value = url;
        backBtn.disabled = !webview.canGoBack();
        forwardBtn.disabled = !webview.canGoForward();
    } else {
        // It's a brand new tab that isn't ready.
        urlBar.value = webview.src;
        backBtn.disabled = true;
        forwardBtn.disabled = true;
    }

    // 4. Set this as the new active tab
    activeTabId = tabId;
}


/**
 * Creates a new tab and its matching webview
 * @param {string} [url="https.www.google.com"] - The URL to load
 */
function createNewTab(url = "https://www.google.com") {
    const tabId = "tab-" + Date.now(); // Simple unique ID

    // 1. Create the tab button and its inner elements
    const tabButton = document.createElement('div');
    tabButton.className = 'tab-item';
    tabButton.setAttribute('data-id', tabId);

    const titleSpan = document.createElement('span');
    titleSpan.className = 'tab-title';
    titleSpan.textContent = 'New Tab';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'tab-close-btn';
    closeBtn.innerHTML = '&#10005;'; // HTML 'X' character

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

    // --- 3. Add all our webview event listeners ---
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
    tabList.appendChild(tabButton);
    webviewContainer.appendChild(webview);

    // 5. Activate the new tab
    activateTab(tabId);
}

// --- 3. Global Event Listeners (UPDATED) ---

window.addEventListener('keydown', (event) => {
    // "New Tab" shortcut
    if (event.ctrlKey && event.key === 't') {
        event.preventDefault(); // Stop any default browser action
        createNewTab();
    }
    
    // "Close Tab" shortcut
    else if (event.ctrlKey && event.key === 'w') {
        event.preventDefault(); // Stop any default browser action
        if (activeTabId) {
            closeTab(activeTabId);
        }
    }
});

// URL Bar "Enter" key
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
    if (!activeWebview) return; // Guard clause
    
    if (reloadBtn.innerHTML.includes('✕')) {
        activeWebview.stop();
    } else {
        activeWebview.reload();
    }
});

// --- NEW: Resizer Logic ---
function initResizer() {
    let initialX = 0;
    let initialWidth = 0;

    const handleMouseMove = (e) => {
        const deltaX = e.clientX - initialX;
        let newWidth = initialWidth + deltaX;

        // Enforce min/max widths from CSS
        const minWidth = parseInt(getComputedStyle(sidebar).minWidth);
        const maxWidth = parseInt(getComputedStyle(sidebar).maxWidth);

        if (newWidth < minWidth) newWidth = minWidth;
        if (newWidth > maxWidth) newWidth = maxWidth;

        // Use flex-basis to set the width
        sidebar.style.flexBasis = `${newWidth}px`;
    };

    const handleMouseUp = () => {
        resizer.classList.remove('is-resizing');
        // Remove global listeners
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };

    resizer.addEventListener('mousedown', (e) => {
        e.preventDefault(); // Stop text selection
        resizer.classList.add('is-resizing');
        
        initialX = e.clientX;
        initialWidth = sidebar.offsetWidth;

        // Add listeners to the whole window
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    });
}


// --- 4. Initialization ---
createNewTab();
initResizer();


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