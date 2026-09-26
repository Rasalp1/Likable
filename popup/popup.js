/**
 * Designify Popup Script
 */

async function fetchBridgeHealth() {
  const urls = [
    'http://127.0.0.1:3030/api/health',
    'http://localhost:3030/api/health'
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url);
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
  const btnLaunch = document.getElementById('btn-launch-hud');

  async function checkStatus() {
    statusText.textContent = 'Checking...';
    const data = await fetchBridgeHealth();

    if (data && data.status === 'ok') {
      statusDot.classList.remove('error');
      statusText.textContent = 'Connected (Port 3030)';

      valClaude.textContent = data.claudeAvailable ? (data.claudeVersion || 'Ready') : 'Not Found';
      valClaude.className = `value ${data.claudeAvailable ? 'badge-success' : 'badge-error'}`;

      valCodex.textContent = data.codexAvailable ? (data.codexVersion || 'Ready') : 'Not Found';
      valCodex.className = `value ${data.codexAvailable ? 'badge-success' : 'badge-error'}`;
    } else {
      statusDot.classList.add('error');
      statusText.textContent = 'Server Offline';
      valClaude.textContent = 'Bridge Not Running';
      valClaude.className = 'value badge-error';
      valCodex.textContent = 'Bridge Not Running';
      valCodex.className = 'value badge-error';
    }
  }

  // Initial check
  await checkStatus();

  // Clicking indicator refreshes status
  statusIndicator.style.cursor = 'pointer';
  statusIndicator.addEventListener('click', () => checkStatus());

  // Activate HUD on active tab
  btnLaunch.addEventListener('click', () => {
    const alertBox = document.getElementById('action-alert');
    if (alertBox) alertBox.style.display = 'none';

    btnLaunch.disabled = true;
    btnLaunch.textContent = 'Injecting HUD...';

    chrome.runtime.sendMessage({ action: 'inject_designify' }, (response) => {
      btnLaunch.disabled = false;
      if (response && response.success) {
        btnLaunch.textContent = '✓ HUD Activated!';
        setTimeout(() => window.close(), 400);
      } else {
        btnLaunch.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
          </svg>
          Activate HUD on Tab
        `;
        if (alertBox) {
          alertBox.textContent = response?.error || 'Failed to inject HUD. Ensure you are on a standard webpage.';
          alertBox.style.display = 'block';
        }
      }
    });
  });
});
