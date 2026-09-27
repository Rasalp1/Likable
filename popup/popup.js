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
      const headers = { 'Cache-Control': 'no-cache, no-store' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(url, {
        headers,
        cache: 'no-store',
        signal: AbortSignal.timeout(3000)
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {}
  }
  return null;
}

const ENGINE_KEY = 'likableSelectedEngine';
const MODELS_KEY = 'likableSelectedModels';
const EFFORTS_KEY = 'likableSelectedEfforts';
const EFFORT_KEY = 'likableSelectedEffort';
const LEGACY_ENGINE_KEYS = ['likeableSelectedEngine', 'designifySelectedEngine'];
const LEGACY_MODELS_KEYS = ['likeableSelectedModels', 'designifySelectedModels'];
const LEGACY_EFFORTS_KEYS = ['likeableSelectedEfforts', 'designifySelectedEfforts'];
const LEGACY_EFFORT_KEYS = ['likeableSelectedEffort', 'designifySelectedEffort'];

const CLAUDE_EFFORT_LEVELS = [
  { id: '', label: 'Default' },
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Medium' },
  { id: 'high', label: 'High' },
  { id: 'xhigh', label: 'XHigh' },
  { id: 'max', label: 'Max' }
];

const CODEX_EFFORT_LEVELS = [
  { id: '', label: 'Default' },
  { id: 'minimal', label: 'Minimal' },
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Medium' },
  { id: 'high', label: 'High' },
  { id: 'xhigh', label: 'XHigh' }
];

async function getStoredModelPreferences() {
  const result = await chrome.storage.local.get([
    ENGINE_KEY, ...LEGACY_ENGINE_KEYS,
    MODELS_KEY, ...LEGACY_MODELS_KEYS,
    EFFORTS_KEY, ...LEGACY_EFFORTS_KEYS,
    EFFORT_KEY, ...LEGACY_EFFORT_KEYS
  ]);
  const engine = result[ENGINE_KEY] || result['likeableSelectedEngine'] || result['designifySelectedEngine'] || 'claude';
  const models = result[MODELS_KEY] || result['likeableSelectedModels'] || result['designifySelectedModels'] || { claude: '', codex: '' };
  const efforts = result[EFFORTS_KEY] || result['likeableSelectedEfforts'] || result['designifySelectedEfforts'] || {};
  const fallbackEffort = result[EFFORT_KEY] || result['likeableSelectedEffort'] || result['designifySelectedEffort'] || '';
  return {
    engine: engine === 'codex' ? 'codex' : 'claude',
    models: {
      claude: typeof models?.claude === 'string' ? models.claude : '',
      codex: typeof models?.codex === 'string' ? models.codex : ''
    },
    efforts: {
      claude: typeof efforts?.claude === 'string' ? efforts.claude : fallbackEffort,
      codex: typeof efforts?.codex === 'string' ? efforts.codex : fallbackEffort
    }
  };
}

async function saveStoredModelPreferences(engine, models, efforts) {
  const toStore = {
    [ENGINE_KEY]: engine,
    [MODELS_KEY]: models,
    [EFFORTS_KEY]: efforts,
    [EFFORT_KEY]: efforts?.[engine] || ''
  };
  for (const k of LEGACY_ENGINE_KEYS) toStore[k] = engine;
  for (const k of LEGACY_MODELS_KEYS) toStore[k] = models;
  for (const k of LEGACY_EFFORTS_KEYS) toStore[k] = efforts;
  for (const k of LEGACY_EFFORT_KEYS) toStore[k] = efforts?.[engine] || '';
  await chrome.storage.local.set(toStore);
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

  // Model & effort preference controls
  const engineSelect = document.getElementById('pref-engine-select');
  const claudeModelRow = document.getElementById('pref-claude-model-row');
  const claudeModelSelect = document.getElementById('pref-claude-model-select');
  const codexModelRow = document.getElementById('pref-codex-model-row');
  const codexModelSelect = document.getElementById('pref-codex-model-select');
  const customModelRow = document.getElementById('pref-custom-model-row');
  const customModelInput = document.getElementById('pref-custom-model-input');
  const effortSelect = document.getElementById('pref-effort-select');
  const prefSaveBadge = document.getElementById('pref-save-badge');

  let { engine: currentEngine, models: currentModels, efforts: currentEfforts } = await getStoredModelPreferences();
  let saveBadgeTimer = null;

  function flashSaveBadge() {
    if (prefSaveBadge) {
      prefSaveBadge.classList.add('show');
      clearTimeout(saveBadgeTimer);
      saveBadgeTimer = setTimeout(() => prefSaveBadge.classList.remove('show'), 1500);
    }
  }

  const KNOWN_CLAUDE_MODELS = [
    '',
    'claude-opus-5-5', 'opus-5.5', 'opus',
    'claude-sonnet-5', 'sonnet-5', 'sonnet',
    'claude-fable-5-1', 'fable-5.1', 'fable',
    'claude-haiku-4-5', 'haiku-4.5', 'haiku'
  ];
  const KNOWN_CODEX_MODELS = [
    '',
    'gpt-5.6-luna', '5.6-luna',
    'gpt-5.6-terra', '5.6-terra',
    'gpt-5.6-sol', '5.6-sol',
    'gpt-6-luna', '6-luna',
    'gpt-6-sol', '6-sol',
    'gpt-6-astra', '6-astra'
  ];

  function syncPreferenceUI() {
    if (engineSelect) engineSelect.value = currentEngine;

    // Effort selector options based on selected engine
    if (effortSelect) {
      const levels = currentEngine === 'codex' ? CODEX_EFFORT_LEVELS : CLAUDE_EFFORT_LEVELS;
      effortSelect.innerHTML = levels.map((lvl) =>
        `<option value="${lvl.id}">${lvl.label}</option>`
      ).join('');
      const activeEffort = currentEfforts[currentEngine] || '';
      const hasOption = levels.some((lvl) => lvl.id === activeEffort);
      effortSelect.value = hasOption ? activeEffort : '';
    }

    if (currentEngine === 'codex') {
      if (claudeModelRow) claudeModelRow.style.display = 'none';
      if (codexModelRow) codexModelRow.style.display = 'flex';
      let codexVal = currentModels.codex;
      if (codexVal === '6-luna') codexVal = 'gpt-6-luna';
      else if (codexVal === '6-sol') codexVal = 'gpt-6-sol';
      else if (codexVal === '6-astra') codexVal = 'gpt-6-astra';
      else if (codexVal === '5.6-luna') codexVal = 'gpt-5.6-luna';
      else if (codexVal === '5.6-terra') codexVal = 'gpt-5.6-terra';
      else if (codexVal === '5.6-sol') codexVal = 'gpt-5.6-sol';
      const isCustom = codexVal && !KNOWN_CODEX_MODELS.includes(codexVal);
      if (codexModelSelect) codexModelSelect.value = isCustom ? 'custom' : codexVal;
      if (isCustom || codexModelSelect?.value === 'custom') {
        if (customModelRow) customModelRow.style.display = 'flex';
        if (customModelInput) {
          customModelInput.placeholder = 'e.g. gpt-6-luna or custom-model-id';
          customModelInput.value = codexVal;
        }
      } else {
        if (customModelRow) customModelRow.style.display = 'none';
      }
    } else {
      if (codexModelRow) codexModelRow.style.display = 'none';
      if (claudeModelRow) claudeModelRow.style.display = 'flex';
      let claudeVal = currentModels.claude;
      if (claudeVal === 'sonnet' || claudeVal === 'sonnet-5') claudeVal = 'claude-sonnet-5';
      else if (claudeVal === 'opus' || claudeVal === 'opus-5.5') claudeVal = 'claude-opus-5-5';
      else if (claudeVal === 'fable' || claudeVal === 'fable-5.1') claudeVal = 'claude-fable-5-1';
      else if (claudeVal === 'haiku' || claudeVal === 'haiku-4.5') claudeVal = 'claude-haiku-4-5';
      const isCustom = claudeVal && !KNOWN_CLAUDE_MODELS.includes(claudeVal);
      if (claudeModelSelect) claudeModelSelect.value = isCustom ? 'custom' : claudeVal;
      if (isCustom || claudeModelSelect?.value === 'custom') {
        if (customModelRow) customModelRow.style.display = 'flex';
        if (customModelInput) {
          customModelInput.placeholder = 'e.g. claude-sonnet-5 or claude-opus-5-5';
          customModelInput.value = claudeVal;
        }
      } else {
        if (customModelRow) customModelRow.style.display = 'none';
      }
    }
  }

  syncPreferenceUI();

  if (engineSelect) {
    engineSelect.addEventListener('change', async () => {
      currentEngine = engineSelect.value;
      syncPreferenceUI();
      await saveStoredModelPreferences(currentEngine, currentModels, currentEfforts);
      flashSaveBadge();
    });
  }

  if (effortSelect) {
    effortSelect.addEventListener('change', async () => {
      currentEfforts[currentEngine] = effortSelect.value;
      await saveStoredModelPreferences(currentEngine, currentModels, currentEfforts);
      flashSaveBadge();
    });
  }

  if (claudeModelSelect) {
    claudeModelSelect.addEventListener('change', async () => {
      const val = claudeModelSelect.value;
      if (val === 'custom') {
        if (customModelRow) customModelRow.style.display = 'flex';
        if (customModelInput) {
          customModelInput.placeholder = 'e.g. claude-sonnet-5 or claude-opus-5-5';
          customModelInput.focus();
          currentModels.claude = customModelInput.value.trim();
        }
      } else {
        if (customModelRow) customModelRow.style.display = 'none';
        currentModels.claude = val;
      }
      await saveStoredModelPreferences(currentEngine, currentModels, currentEfforts);
      flashSaveBadge();
    });
  }

  if (codexModelSelect) {
    codexModelSelect.addEventListener('change', async () => {
      const val = codexModelSelect.value;
      if (val === 'custom') {
        if (customModelRow) customModelRow.style.display = 'flex';
        if (customModelInput) {
          customModelInput.placeholder = 'e.g. gpt-6-luna or gpt-6-astra';
          customModelInput.focus();
          currentModels.codex = customModelInput.value.trim();
        }
      } else {
        if (customModelRow) customModelRow.style.display = 'none';
        currentModels.codex = val;
      }
      await saveStoredModelPreferences(currentEngine, currentModels, currentEfforts);
      flashSaveBadge();
    });
  }

  if (customModelInput) {
    customModelInput.addEventListener('input', async () => {
      const val = customModelInput.value.trim();
      if (currentEngine === 'codex') {
        currentModels.codex = val;
      } else {
        currentModels.claude = val;
      }
      await saveStoredModelPreferences(currentEngine, currentModels, currentEfforts);
      flashSaveBadge();
    });
  }


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
    const toStore = { [BRIDGE_TOKEN_KEY]: token };
    for (const key of LEGACY_BRIDGE_TOKEN_KEYS) {
      toStore[key] = token;
    }
    await chrome.storage.local.set(toStore);
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
  window.addEventListener('focus', () => checkStatus());
  const pollInterval = setInterval(() => checkStatus(), 4_000);
  window.addEventListener('unload', () => clearInterval(pollInterval));

  await checkStatus();
});
