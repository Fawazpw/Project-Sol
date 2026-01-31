# ☀️ Project Sol

> **A modern, privacy-focused, and customizable web browser built with Electron.**

Project Sol is designed to provide a clean, distraction-free browsing experience with powerful productivity tools built right into the interface. With a unique sidebar-first design, it organizes your web life efficiently while keeping privacy at the forefront.

![License](https://img.shields.io/badge/license-ISC-blue.svg) ![Electron](https://img.shields.io/badge/built%20with-Electron-orange.svg)

## ✨ Key Features

### 🛡️ Privacy First
- **Incognito Mode**: Browse securely without saving history or cookies (`Ctrl + Shift + N`).
- **Built-in Ad-Blocker**: Integrated ad-blocking capabilities to keep your browsing clean and fast.

### 🎨 Modern & Customizable UI
- **Sidebar Navigation**: Vertical tab management with folder support for better organization.
- **Theming**: Toggle between Dark and Light modes, or pick a custom accent color for your sidebar.
- **Minimalist Aesthetics**: A clean, unified interface using modern font stacks (Inter, Roboto, San Francisco).

### 🚀 Productivity Tools
- **Split Screen (MVP)**: View two pages side-by-side within the same tab for multitasking (Right-click tab -> Split Screen).
- **Workspace Organization**: Create folders and nested folders to group related tabs.
- **Spotlight Search**: A powerful command palette to search tabs, history, and run browser commands (`Ctrl + T`).
- **Notepad**: Built-in scratchpad to jot down quick notes without leaving the browser.
- **Lazy Loading**: Tabs are loaded only when activated to save memory and improve startup time.

---

## 🛠️ Installation & Development

To build and run Project Sol locally, ensure you have [Node.js](https://nodejs.org/) installed.

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/project-sol.git
    cd project-sol
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Run the browser**
    ```bash
    npm start
    ```

---

## ⌨️ Keyboard Shortcuts

Maximize your efficiency with these global shortcuts:

| Shortcut | Action |
| :--- | :--- |
| `Ctrl + T` | **Toggle Spotlight Search** (Command Palette & URL Bar) |
| `Ctrl + W` | **Close Current Tab** |
| `Ctrl + Shift + T` | **Restore Last Closed Tab** |
| `Ctrl + S` | **Toggle Sidebar Visibility** (Focus Mode) |
| `Ctrl + H` | **Open History** |
| `Ctrl + Shift + N` | **Open New Incognito Window** |
| `Ctrl + R` | **Reload Page** |
| `Ctrl + L` | **Focus URL Bar** |
| `F12` | **Toggle Developer Tools** |

---

## 📂 Project Structure

- **`main.js`**: The main process entry point. Handles window creation, lifecycle events, and global shortcuts.
- **`renderer.js`**: The renderer process logic. Manages the DOM, tab system, webview handling, and UI interactions.
- **`index.html`**: The primary HTML structure of the browser window.
- **`splash.html`**: The startup splash screen with Lottie animation support.
- **`assets/`**: Icons, logos, and animation files.

---

## 🗺️ Roadmap

- [x] Basic Tab & Window Management
- [x] History & Bookmarks System
- [x] Dark/Light Mode & Theming
- [ ] **Advanced Split Screen**: Drag & drop support for split views.
- [ ] **Widgets**: Calculator and other sidebar widgets.
- [ ] **Command Palette**: Expanded commands for browser control.

---

## 🤝 Contributing

Contributions are welcome! Feel free to submit a Pull Request.

1.  Fork the project
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

---

*Made with ❤️ by Fawazpw*
