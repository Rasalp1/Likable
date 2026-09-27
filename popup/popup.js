/**
 * Likable Popup Script
 */

const BRIDGE_TOKEN_KEY = 'likableBridgeToken';
const LEGACY_BRIDGE_TOKEN_KEYS = ['likeableBridgeToken', 'designifyBridgeToken'];

async function getStoredToken() {
  const result = await chrome.storage.local.get([BRIDGE_TOKEN_KEY, ...LEGACY_BRIDGE_TOKEN_KEYS]);
  const token = result[BRIDGE_TOKEN_KEY] || result['likeableBridgeToken'] || result['designifyBridgeToken'];
  return typeof token === 'string' ? token.trim() : '';
}

async function fetchBridgeHealth(token) {
  const urls = [
    'http://127.0.0.1:3030/api/health',
    'http://localhost:3030/api/health'
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
      if (res.ok) {
        return await res.json();
      }
    } catch {}
  }
  return null;
}

document.addEventListener('DOMContentLoaded', async () => {
  const statusIndicator = document.getElementById('bridge-status-indicator');
  const statusText = document.getElementById('bridge-status-text');
  const statusDot = statusIndicator.querySelector('.status-dot');
  const valClaude = document.getElementById('val-claude');
  const valCodex = document.getElementById('val-codex');
  const overlayToggle = document.getElementById('overlay-toggle');
  const tokenInput = document.getElementById('bridge-token');
  const saveTokenButton = document.getElementById('save-bridge-token');
  const tokenStatus = document.getElementById('token-status');

  tokenInput.value = await getStoredToken();

  async function checkStatus() {
    statusText.textContent = 'Checking...';
    const data = await fetchBridgeHealth(await getStoredToken());

    if (data && data.status === 'ok' && data.authenticated) {
      statusDot.classList.remove('error');
      statusDot.classList.add('connected');
      statusText.textContent = 'Connected';
      tokenStatus.textContent = 'Token saved locally in this extension.';

      valClaude.textContent = data.claudeAvailable ? (data.claudeVersion || 'Ready') : 'Not Found';
      valClaude.className = `value ${data.claudeAvailable ? 'badge-success' : 'badge-error'}`;

      valCodex.textContent = data.codexAvailable ? (data.codexVersion || 'Ready') : 'Not Found';
      valCodex.className = `value ${data.codexAvailable ? 'badge-success' : 'badge-error'}`;
    } else if (data && data.requiresAuth) {
      statusDot.classList.remove('connected');
      statusDot.classList.add('error');
      statusText.textContent = 'Token required';
      tokenStatus.textContent = 'Paste the token printed by the bridge server.';
      valClaude.textContent = 'Configure token';
      valClaude.className = 'value badge-error';
      valCodex.textContent = 'Configure token';
      valCodex.className = 'value badge-error';
    } else {
      statusDot.classList.remove('connected');
      statusDot.classList.add('error');
      statusText.textContent = 'Offline';
      tokenStatus.textContent = 'Start node server/index.js, then save its token here.';
      valClaude.textContent = 'Bridge Not Running';
      valClaude.className = 'value badge-error';
      valCodex.textContent = 'Bridge Not Running';
      valCodex.className = 'value badge-error';
    }
  }

  saveTokenButton.addEventListener('click', async () => {
    const token = tokenInput.value.trim();
    if (token.length < 32) {
      tokenStatus.textContent = 'Token must be at least 32 characters.';
      return;
    }
    await chrome.storage.local.set({ [BRIDGE_TOKEN_KEY]: token, [LEGACY_BRIDGE_TOKEN_KEY]: token });
    tokenStatus.textContent = 'Token saved locally in this extension.';
    await checkStatus();
  });

  const alertBox = document.getElementById('action-alert');
  function showError(message) {
    alertBox.textContent = message;
    alertBox.style.display = message ? 'block' : 'none';
  }

  // Keep this popup tied to the tab on which it was opened.
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  try {
    const response = await chrome.runtime.sendMessage({ action: 'get_hud_visibility', tabId: tab?.id });
    if (!response?.success) throw new Error(response?.error || 'Unable to read page controls.');
    overlayToggle.checked = response.enabled;
    overlayToggle.disabled = false;
  } catch (error) {
    showError(error.message);
  }

  overlayToggle.addEventListener('change', async () => {
    const enabled = overlayToggle.checked;
    overlayToggle.disabled = true;
    showError('');
    try {
      const response = await chrome.runtime.sendMessage({ action: 'set_hud_visibility', tabId: tab?.id, enabled });
      if (!response?.success) throw new Error(response?.error || 'Unable to change page controls.');
      overlayToggle.checked = response.enabled;
    } catch (error) {
      overlayToggle.checked = !enabled;
      showError(error.message);
    } finally {
      overlayToggle.disabled = false;
    }
  });

  statusIndicator.addEventListener('click', () => checkStatus());
  await checkStatus();
});
