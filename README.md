# ✨ Designify - AI Live Website Redesign

**Designify** is a Chrome extension (Manifest V3) paired with a lightweight local bridge daemon that ingests any active website, sends a multimodal snapshot (high-res viewport screenshot + semantic interactive DOM tree) to your local **Claude Code** (`claude -p`) or **Codex** (`codex exec`) CLI, and projects a brand new modern redesign on top of the live website inside an isolated **Shadow DOM overlay**.

All original website functionality—such as clicks, link navigations, typing into search bars, and form submissions—remains **100% functional** through real-time **Bi-directional Event Mirroring**.

---

## 🚀 Key Features

- **Isolated Shadow DOM Projection**: Redesigns are rendered in an isolated Shadow DOM container, preventing style pollution with the host page.
- **Bi-directional Event Mirroring**:
  - Clicks on redesigned buttons/links automatically trigger the native website's corresponding elements (`element.click()`).
  - Typing in redesigned inputs/search bars synchronizes values and dispatches native `input`/`change` events.
  - Submitting forms in the overlay executes the native form submission.
- **Local CLI Authentication**:
  - Leverages your existing local `claude` (Claude Code) or `codex` CLI credentials—**no manual API keys or billing configurations required**.
- **Floating Glassmorphic HUD**:
  - Sleek, draggable dock with 3 curated aesthetic presets:
    - **Linear**: Sleek graphite, subtle violet borders, crisp typography.
    - **Apple**: Clean minimalist whitespace, refined hierarchy, subtle frosted glass.
    - **Lovable**: Vibrant, modern AI SaaS aesthetic with obsidian canvas, luminous accents, and high-craft pill badges.
  - Custom natural language prompt input.
  - Toggle between Claude Code CLI and Codex CLI.
- **Interactive Inspection & Export Tools**:
  - **Before/After Split Slider**: Draggable divider comparing the original site vs the redesign side-by-side.
  - **Quick Peek Hotkey**: Hold `Space` (when not typing in an input) to instantly peek at the original website.
  - **Opacity Slider**: Smoothly adjust overlay opacity from 0% to 100%.
  - **1-Click Code Export**: Download standalone redesigned HTML + CSS package or copy to clipboard.

---

## 🛠️ Quickstart

### 1. Start the Local Bridge Server
The bridge server enables the Chrome extension to safely invoke your local `claude` or `codex` CLIs:

```bash
cd "/path/to/likable"
npm start
# or
node server/index.js
```

The server will start on `http://127.0.0.1:3030` and automatically verify that `claude` and `codex` CLIs are detected on your system.

### 2. Load the Chrome Extension
1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** in the top-right corner.
3. Click **Load unpacked**.
4. Select the project folder:
   `/path/to/likable`
5. The **Designify** extension will appear in your Chrome toolbar!

### 3. Redesign Any Website
1. Visit any website (e.g. Wikipedia, Reddit, Hacker News, or an internal dashboard).
2. The Designify floating HUD will appear at the bottom center of the page (or click the Designify extension icon in the toolbar).
3. Select an aesthetic preset (e.g. *Linear*) or type a custom prompt.
4. Click **Redesign Now**.
5. Watch as the AI redesign transforms the site in real-time right before your eyes!
6. Click buttons, type into search inputs, drag the **Split Slider**, or hold **Space** to compare!

---

## 📁 Project Structure

```
designify/
├── manifest.json              # Chrome Extension MV3 Manifest
├── background.js              # Service Worker (screenshot capture, bridge health)
├── content/
│   ├── content.js             # Main content script coordinator
│   ├── ingester.js            # DOM extractor and mirror ID tagger
│   ├── overlay.js             # Shadow DOM projection & bi-directional event mirroring
│   ├── hud.js                 # Floating glassmorphic dock UI
│   └── hud.css                # Glassmorphic HUD styles and animations
├── popup/
│   ├── popup.html             # Extension action popup
│   ├── popup.js               # Bridge status check and activation
│   └── popup.css              # Popup styling
├── server/
│   ├── package.json           # Bridge server config
│   ├── index.js               # Node.js bridge server handling CLI invocations
│   └── prompts.js             # Specialized prompts for Claude Code and Codex
├── icons/                     # Extension branding icons (16px, 48px, 128px)
└── test_bridge.js             # End-to-end test script
```
