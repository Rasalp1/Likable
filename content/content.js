/**
 * Designify - Main Content Script Coordinator
 * Orchestrates DOM ingestion, screenshot capture, bridge communication,
 * and Shadow DOM projection.
 */

const BRIDGE_URL = 'http://127.0.0.1:3030';

function ensureStylesInjected() {
  if (!document.getElementById('designify-hud-style')) {
    const link = document.createElement('link');
    link.id = 'designify-hud-style';
    link.rel = 'stylesheet';
    link.href = chrome.runtime.getURL('content/hud.css');
    (document.head || document.documentElement).appendChild(link);
  }
}

window.DesignifyCoordinator = {
  initialized: false,

  init() {
    ensureStylesInjected();

    // Initialize HUD and Overlay
    if (window.DesignifyHUD) {
      window.DesignifyHUD.init();
      window.DesignifyHUD.show();
    }
    if (window.DesignifyOverlay) {
      window.DesignifyOverlay.init();
    }

    if (this.initialized) return;
    this.initialized = true;

    console.log('[Designify] Initializing Designify suite on active tab...');
  },

  /**
   * Main pipeline: Ingest -> Capture Screenshot -> Call Bridge -> Project in Shadow DOM
   */
  async runRedesign({ theme, engine, customPrompt }) {
    console.log(`[Designify] Starting redesign pipeline (Theme: ${theme}, Engine: ${engine})...`);

    // 1. Ingest DOM and tag elements
    const pageData = window.DesignifyIngester.extractPageData();

    // 2. Capture high-res screenshot of current viewport via background service worker
    let screenshotBase64 = null;
    try {
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: 'capture_visible_tab' }, resolve);
      });
      if (response && response.success) {
        screenshotBase64 = response.dataUrl;
        console.log('[Designify] Viewport screenshot captured successfully.');
      } else {
        console.warn('[Designify] Screenshot capture skipped or failed:', response?.error);
      }
    } catch (e) {
      console.warn('[Designify] Background screenshot message failed:', e);
    }

    // 3. Assemble payload
    const payload = {
      url: pageData.url,
      title: pageData.title,
      metaDescription: pageData.metaDescription,
      theme,
      engine,
      customPrompt,
      domTree: pageData.domTree,
      screenshotBase64
    };

    // 4. Send to Local Bridge Server
    console.log(`[Designify] Sending request to local bridge at ${BRIDGE_URL}/api/redesign...`);
    let result = null;

    try {
      const response = await fetch(`${BRIDGE_URL}/api/redesign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Bridge returned error ${response.status}: ${errorText}`);
      }

      result = await response.json();
    } catch (err) {
      console.warn('[Designify] Bridge request failed or timed out:', err);
      // Fallback: If bridge server was unreachable, throw with clear instructions
      throw new Error(`Could not communicate with Designify Bridge Server at ${BRIDGE_URL}. Make sure 'node server/index.js' is running! (${err.message})`);
    }

    if (!result || !result.html) {
      throw new Error('Designify bridge did not return valid redesign markup.');
    }

    console.log('[Designify] Redesign received from AI! Projecting into Shadow DOM...');

    // 5. Project the redesign inside the Shadow DOM overlay
    window.DesignifyOverlay.render({
      html: result.html,
      css: result.css,
      summary: result.summary,
      themeName: result.themeName || theme
    });

    // 6. Persist into Design Cache
    if (window.DesignifyCache) {
      await window.DesignifyCache.saveDesign({
        themeKey: theme,
        themeName: result.themeName || theme,
        summary: result.summary,
        customPrompt,
        engineUsed: engine,
        html: result.html,
        css: result.css
      });

      // Update HUD so history chips immediately appear
      if (window.DesignifyHUD) {
        window.DesignifyHUD.hasGenerated = true;
        window.DesignifyHUD.render();
      }
    }
  }
};

// Auto-boot if loaded in browser tab
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => window.DesignifyCoordinator.init());
} else {
  window.DesignifyCoordinator.init();
}
