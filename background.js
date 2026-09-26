/**
 * Designify - Background Service Worker
 * Handles screenshot capture, bridge health checks, and tab messaging
 */

const BRIDGE_URL = 'http://127.0.0.1:3030';
const BRIDGE_TOKEN_KEY = 'designifyBridgeToken';

async function getBridgeToken() {
  try {
    const result = await chrome.storage.local.get(BRIDGE_TOKEN_KEY);
    return typeof result[BRIDGE_TOKEN_KEY] === 'string' ? result[BRIDGE_TOKEN_KEY].trim() : '';
  } catch {
    return '';
  }
}

function authHeaders(token, headers = {}) {
  return token ? { ...headers, Authorization: `Bearer ${token}` } : headers;
}

// Handle runtime messages from content script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'capture_visible_tab') {
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        console.error('[Designify Background] Screenshot error:', chrome.runtime.lastError.message);
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

  if (message.action === 'inject_designify') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (!tabs || !tabs[0]) {
        sendResponse({ success: false, error: 'No active tab found.' });
        return;
      }
      const tab = tabs[0];
      const tabId = tab.id;
      const url = tab.url || '';

      // Chrome blocks content scripts on internal browser URLs
      if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('edge://') || url.startsWith('about:')) {
        sendResponse({
          success: false,
          error: 'Chrome security restricts extensions on system pages (chrome://). Please switch to a regular website (e.g. Wikipedia, Reddit, or localhost) to use Designify!'
        });
        return;
      }

      try {
        // 1. Inject stylesheet
        await chrome.scripting.insertCSS({
          target: { tabId },
          files: ['content/hud.css']
        });

        // 2. Inject scripts in strict dependency order
        await chrome.scripting.executeScript({
          target: { tabId },
          files: [
            'content/ingester.js',
            'content/cache.js',
            'content/overlay.js',
            'content/hud.js',
            'content/content.js'
          ]
        });

        sendResponse({ success: true });
      } catch (err) {
        console.error('[Designify] Failed to inject scripts into tab:', err);
        sendResponse({ success: false, error: err.message });
      }
    });
    return true;
  }
});
