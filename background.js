/**
 * Designify - Background Service Worker
 * Handles screenshot capture, bridge health checks, and tab messaging
 */

const BRIDGE_URL = 'http://127.0.0.1:3030';

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
    fetch(`${BRIDGE_URL}/api/health`)
      .then((res) => res.json())
      .then((data) => sendResponse({ success: true, data }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.action === 'inject_designify') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || !tabs[0]) return;
      const tabId = tabs[0].id;
      
      chrome.scripting.executeScript({
        target: { tabId },
        files: ['content/content.js']
      }).then(() => {
        sendResponse({ success: true });
      }).catch((err) => {
        sendResponse({ success: false, error: err.message });
      });
    });
    return true;
  }
});
