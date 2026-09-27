/**
 * Likable - Background Service Worker
 * Handles screenshot capture, bridge health checks, and tab messaging
 */

const BRIDGE_URL = 'http://127.0.0.1:3030';
const BRIDGE_TOKEN_KEY = 'likableBridgeToken';
const LEGACY_BRIDGE_TOKEN_KEYS = ['likeableBridgeToken', 'designifyBridgeToken'];

async function getBridgeToken() {
  try {
    const result = await chrome.storage.local.get([BRIDGE_TOKEN_KEY, ...LEGACY_BRIDGE_TOKEN_KEYS]);
    const token = result[BRIDGE_TOKEN_KEY] || result['likeableBridgeToken'] || result['designifyBridgeToken'];
    return typeof token === 'string' ? token.trim() : '';
  } catch {
    return '';
  }
}

function authHeaders(token, headers = {}) {
  return token ? {
    ...headers,
    Authorization: `Bearer ${token}`,
    'X-Likable-Token': token,
    'X-Likeable-Token': token,
    'X-Designify-Token': token
  } : headers;
}

// Handle runtime messages from the popup and user-activated page controls.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'capture_visible_tab') {
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        console.error('[Likable Background] Screenshot error:', chrome.runtime.lastError.message);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ success: true, dataUrl });
      }
    });
    return true; // Keep message channel open for async response
  }

  if (message.action === 'check_bridge_health') {
    getBridgeToken()
      .then((token) => fetch(`${BRIDGE_URL}/api/health`, { headers: authHeaders(token) }))
      .then((res) => res.json())
      .then((data) => sendResponse({ success: true, data }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.action === 'call_bridge_redesign') {
    getBridgeToken()
      .then((token) => {
        if (!token) throw new Error('Bridge token is not configured. Open the extension popup and save it first.');
        return fetch(`${BRIDGE_URL}/api/redesign`, {
          method: 'POST',
          headers: authHeaders(token, { 'Content-Type': 'application/json' }),
          body: JSON.stringify(message.payload)
        });
      })
      .then(async (res) => {
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Bridge server error ${res.status}: ${errText}`);
        }
        return res.json();
      })
      .then((data) => sendResponse({ success: true, data }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.action === 'get_hud_visibility' || message.action === 'set_hud_visibility') {
    (async () => {
      try {
        const tab = message.tabId ? await chrome.tabs.get(message.tabId) : null;
        if (!tab?.id || !/^https?:/.test(tab.url || '')) {
          throw new Error('Page controls are available on regular websites. Open a website and try again.');
        }
        const target = { tabId: tab.id };
        let [state] = await chrome.scripting.executeScript({
          target,
          func: () => {
            const hud = window.LikableHUD || window.LikeableHUD || window.DesignifyHUD;
            return { mounted: !!hud, enabled: !!hud?.enabled };
          }
        });
        if (!state?.result?.mounted && (message.action === 'get_hud_visibility' || message.enabled !== false)) {
          try {
            await chrome.scripting.insertCSS({ target, files: ['content/hud.css'] });
            await chrome.scripting.executeScript({
              target,
              files: ['content/ingester.js', 'content/cache.js', 'content/overlay.js', 'content/hud.js', 'content/content.js']
            });
            [state] = await chrome.scripting.executeScript({
              target,
              func: async () => {
                const coord = window.LikableCoordinator || window.LikeableCoordinator || window.DesignifyCoordinator;
                if (coord) await coord.init();
                const hud = window.LikableHUD || window.LikeableHUD || window.DesignifyHUD;
                return { mounted: !!hud, enabled: !!hud?.enabled };
              }
            });
          } catch {}
        }
        if (message.action === 'get_hud_visibility') {
          sendResponse({ success: true, enabled: state?.result?.enabled !== false });
          return;
        }
        const [result] = await chrome.scripting.executeScript({
          target,
          func: async (enabled) => {
            const hud = window.LikableHUD || window.LikeableHUD || window.DesignifyHUD;
            if (!hud) return false;
            const coord = window.LikableCoordinator || window.LikeableCoordinator || window.DesignifyCoordinator;
            if (coord) await coord.init();
            hud.setEnabled(enabled);
            return hud.enabled;
          },
          args: [!!message.enabled]
        });
        sendResponse({ success: true, enabled: !!result?.result });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }
});
