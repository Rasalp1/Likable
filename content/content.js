/**
 * Likeable - Main Content Script Coordinator
 * Orchestrates DOM ingestion, screenshot capture, bridge communication,
 * and Shadow DOM projection.
 */

function ensureStylesInjected() {
  if (!document.getElementById('designify-hud-style')) {
    const link = document.createElement('link');
    link.id = 'designify-hud-style';
    link.rel = 'stylesheet';
    link.href = chrome.runtime.getURL('content/hud.css');
    (document.head || document.documentElement).appendChild(link);
  }
}

window.LikeableCoordinator = window.DesignifyCoordinator = window.LikeableCoordinator || window.DesignifyCoordinator || {
  initialized: false,

  async init() {
    if (this._initPromise) return this._initPromise;
    this._initPromise = (async () => {
      ensureStylesInjected();
      await window.DesignifyHUD?.init();
      window.DesignifyOverlay?.init();
      this.initialized = true;
    })();
    return this._initPromise;
  },

  /**
   * Main pipeline: Ingest -> Capture Screenshot -> Call Bridge -> Project in Shadow DOM
   */
  async runRedesign({ theme, engine, customPrompt }) {
    console.log(`[Likeable] Starting redesign pipeline (Theme: ${theme}, Engine: ${engine})...`);

    // 1. Ingest DOM and tag elements
    window.DesignifyHUD?.updateProgress(20, 'Reading DOM elements...', 'Scanning page structure & tagging interactive elements');
    const pageData = window.DesignifyIngester.extractPageData();

    // 2. Capture high-res screenshot of current viewport via background service worker
    window.DesignifyHUD?.updateProgress(40, 'Capturing viewport screenshot...', 'Extracting high-resolution visual context for AI');
    let screenshotBase64 = null;
    try {
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: 'capture_visible_tab' }, resolve);
      });
      if (response && response.success) {
        screenshotBase64 = response.dataUrl;
        console.log('[Likeable] Viewport screenshot captured successfully.');
      } else {
        console.warn('[Likeable] Screenshot capture skipped or failed:', response?.error);
      }
    } catch (e) {
      console.warn('[Likeable] Background screenshot message failed:', e);
    }

    // 3. Assemble payload
    let customPreset = null;
    if (window.DesignifyHUD && Array.isArray(window.DesignifyHUD.customPresets)) {
      const found = window.DesignifyHUD.customPresets.find((p) => p.id === theme);
      if (found) {
        customPreset = {
          id: found.id,
          name: found.label || found.name,
          description: found.description || `Design system extracted from ${found.originUrl || found.url || 'a website'}`,
          originUrl: found.originUrl || found.url || '',
          url: found.url || found.originUrl || '',
          palette: found.palette,
          layout: found.layout,
          geometry: found.geometry,
          padding: found.padding,
          elevation: found.elevation,
          typography: found.typography,
          mandate: found.mandate
        };
      }
    }

    const payload = {
      url: pageData.url,
      title: pageData.title,
      metaDescription: pageData.metaDescription,
      theme,
      customPreset,
      engine,
      customPrompt,
      domTree: pageData.domTree,
      screenshotBase64
    };

    // 4. Send to Local Bridge Server (via background service worker for extension-origin security)
    const engineLabel = engine === 'codex' ? 'Codex' : 'Claude';
    window.DesignifyHUD?.updateProgress(55, `Redesigning structure with ${engineLabel}...`, 'Synthesizing modern layout, color palette & typography');
    window.DesignifyHUD?.startSynthesisTicker(engine);

    console.log(`[Likeable] Sending request to local bridge...`);
    let result = null;

    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        const bgRes = await new Promise((resolve) => {
          chrome.runtime.sendMessage({
            action: 'call_bridge_redesign',
            payload
          }, resolve);
        });

        if (!bgRes || !bgRes.success) {
          throw new Error(bgRes?.error || 'Bridge request failed');
        }
        result = bgRes.data;
      } else {
        throw new Error('Bridge requests require the Likeable extension context.');
      }
    } catch (err) {
      window.DesignifyHUD?.stopSynthesisTicker();
      console.warn('[Likeable] Bridge request failed or timed out:', err);
      // Fallback: If bridge server was unreachable, throw with clear instructions
      throw new Error(`Could not communicate with Likeable Bridge Server at ${BRIDGE_URL}. Make sure 'node server/index.js' is running! (${err.message})`);
    }

    window.DesignifyHUD?.stopSynthesisTicker();

    if (!result || !result.html) {
      throw new Error('Likeable bridge did not return valid redesign markup.');
    }

    console.log('[Likeable] Redesign received from AI! Projecting into Shadow DOM...');
    window.DesignifyHUD?.updateProgress(90, 'Projecting Shadow DOM...', 'Mounting isolated design and linking bi-directional events');

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
window.LikeableCoordinator = window.DesignifyCoordinator;
