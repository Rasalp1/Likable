# ✨ Designify - AI Live Website Redesign

**Designify** is a Chrome extension (Manifest V3) paired with a lightweight local bridge daemon that ingests any active website, sends a multimodal snapshot (high-res viewport screenshot + semantic interactive DOM tree) to your local **Claude Code** (`claude -p`) or **Codex** (`codex exec`) CLI, and projects a brand new modern redesign on top of the live website inside an isolated **Shadow DOM overlay**.

The redesign aims to preserve website functionality—such as clicks, link navigations, typing into search bars, and form submissions—through real-time **Bi-directional Event Mirroring**. Compatibility varies by site.

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
The bridge server invokes your local `claude` or `codex` CLI. It binds to loopback and requires a per-installation token.

```bash
# Clone the repository
git clone https://github.com/Rasalp1/Designify.git
cd Designify

# Start the local bridge
npm start
# or
node server/index.js
```

The first run creates `.bridge_token` (already ignored by git) and prints the token in the terminal. Keep it private. You can also provide a token explicitly with `DESIGNIFY_BRIDGE_TOKEN`.

### 2. Load the Chrome Extension
1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** in the top-right corner.
3. (Optional) Run `npm run build` to create the production `dist/` bundle.
4. Click **Load unpacked**.
5. Select the project directory (or the `dist/` directory).
6. The **Designify** extension will appear in your Chrome toolbar!

### 3. Redesign Any Website
1. Visit any website (e.g. Wikipedia, Reddit, or Hacker News). Avoid pages containing confidential information unless you understand the data-flow described below.
2. Click the Designify extension icon, paste the bridge token, and click **Save**.
3. Click **Activate HUD on Tab**. Designify only injects after this explicit action.
4. Select an aesthetic preset (e.g. *Linear*) or type a custom prompt.
5. Click **Redesign Now**.
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

## Privacy and security

Designify is intentionally local-first, but “local” does not mean that data can never leave your computer. When you request a redesign, the extension captures the current viewport screenshot and a semantic subset of the page DOM. This can include visible text, URLs, image metadata, page title/description, and non-sensitive prefilled input values. The payload is sent to the local bridge and then passed to the selected CLI; that CLI may send it to its own provider according to your account and CLI configuration.

Designify does not intentionally collect passwords, hidden inputs, file inputs, or fields whose names resemble credentials. Do not use it on sensitive pages unless you have reviewed the behavior of your chosen CLI. The extension is user-activated and requests only `activeTab` access rather than injecting into every page automatically.

The bridge token protects the local command endpoint. Do not commit `.bridge_token`, paste it into issue reports, or share it with other extensions. If the token is compromised, stop the bridge, delete `.bridge_token`, and restart it to generate a new token.

For security reports, see [SECURITY.md](SECURITY.md).

## Testing

`npm test` runs deterministic bridge security and validation tests without invoking an AI provider. After starting the bridge and configuring a token, `npm run test:integration` performs the optional live Claude integration test. `npm run test:codex` does the same for Codex and may incur provider usage.
