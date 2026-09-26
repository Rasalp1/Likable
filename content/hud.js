/**
 * Designify - Floating Glassmorphic In-Page Control HUD
 */

window.DesignifyHUD = {
  hudContainer: null,
  miniFab: null,
  isMiniDropdownOpen: false,
  _toastTimeout: null,
  selectedTheme: 'linear',
  selectedEngine: 'claude',
  isGenerating: false,
  hasGenerated: false,

  // Live generation progress state
  progressPercent: 0,
  progressStage: '',
  progressSubtext: '',
  progressInterval: null,

  presets: [
    { id: 'linear', label: 'Linear' },
    { id: 'apple', label: 'Apple' },
    { id: 'lovable', label: 'Lovable' }
  ],

  show() {
    if (this.hudContainer) {
      this.hudContainer.style.display = 'block';
    }
    if (this.miniFab) {
      this.miniFab.style.display = 'none';
      this.closeMiniDropdown();
    }
  },

  minimize() {
    if (this.hudContainer) {
      this.hudContainer.style.display = 'none';
    }
    if (this.miniFab) {
      this.miniFab.style.display = 'flex';
      this.closeMiniDropdown();
    }
  },

  toggleMiniDropdown() {
    if (this.isMiniDropdownOpen) {
      this.closeMiniDropdown();
    } else {
      this.openMiniDropdown();
    }
  },

  openMiniDropdown() {
    this.isMiniDropdownOpen = true;
    const dropdown = this.miniFab?.querySelector('#designify-mini-dropdown');
    const fabBtn = this.miniFab?.querySelector('#designify-mini-fab-btn');
    if (dropdown) {
      dropdown.classList.add('open');
    }
    if (fabBtn) {
      fabBtn.classList.add('active');
    }
  },

  closeMiniDropdown() {
    this.isMiniDropdownOpen = false;
    const dropdown = this.miniFab?.querySelector('#designify-mini-dropdown');
    const fabBtn = this.miniFab?.querySelector('#designify-mini-fab-btn');
    if (dropdown) {
      dropdown.classList.remove('open');
    }
    if (fabBtn) {
      fabBtn.classList.remove('active');
    }
  },

  showToast(message) {
    let toast = document.getElementById('designify-hud-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'designify-hud-toast';
      document.documentElement.appendChild(toast);
    }

    toast.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2.5">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      <span>${message}</span>
    `;
    toast.className = 'show';

    clearTimeout(this._toastTimeout);
    this._toastTimeout = setTimeout(() => {
      toast.className = '';
    }, 2200);
  },

  async handleCopyWebsite(copyBtn) {
    if (copyBtn.dataset.copying === 'true') return;
    copyBtn.dataset.copying = 'true';

    try {
      const { success, isRedesign } = await this.copyWebsiteCode();
      const textEl = copyBtn.querySelector('.designify-dropdown-text');
      const iconEl = copyBtn.querySelector('.designify-dropdown-icon');
      const originalText = textEl ? textEl.textContent : 'Copy this website';

      if (success) {
        copyBtn.classList.add('success');
        if (textEl) textEl.textContent = 'Copied to clipboard!';
        if (iconEl) {
          iconEl.innerHTML = '<polyline points="20 6 9 17 4 12"></polyline>';
          iconEl.setAttribute('stroke', '#34d399');
        }

        this.showToast(isRedesign ? 'Redesigned website copied! ✨' : 'Website code copied! ✨');

        setTimeout(() => {
          copyBtn.classList.remove('success');
          if (textEl) textEl.textContent = originalText;
          if (iconEl) {
            iconEl.innerHTML = '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>';
            iconEl.removeAttribute('stroke');
          }
          copyBtn.dataset.copying = 'false';
          this.closeMiniDropdown();
        }, 1400);
      } else {
        if (textEl) textEl.textContent = 'Copy failed';
        setTimeout(() => {
          if (textEl) textEl.textContent = originalText;
          copyBtn.dataset.copying = 'false';
        }, 1400);
      }
    } catch (err) {
      console.error('[Designify] Failed to copy website:', err);
      copyBtn.dataset.copying = 'false';
    }
  },

  async copyWebsiteCode() {
    let codeToCopy = '';
    let isRedesign = false;

    // Check if an active redesign exists and is currently rendered
    if (
      window.DesignifyOverlay &&
      window.DesignifyOverlay.activeRedesign &&
      window.DesignifyOverlay.hostElement &&
      window.DesignifyOverlay.hostElement.style.display !== 'none'
    ) {
      const { html, css, themeName, summary } = window.DesignifyOverlay.activeRedesign;
      codeToCopy = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Designify Redesign - ${themeName}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      min-height: 100vh;
      -webkit-font-smoothing: antialiased;
    }
    /* --- Redesign Styles --- */
    ${css}
  </style>
</head>
<body>
  <!-- Generated by Designify AI Redesign System -->
  <!-- Theme: ${themeName} | ${summary || ''} -->
  ${html}
</body>
</html>`;
      isRedesign = true;
    } else {
      // Clean clone of the original page without Designify injected DOM elements
      const clone = document.documentElement.cloneNode(true);
      clone.querySelectorAll(
        '#designify-hud-root, #designify-mini-container, #designify-mini-fab, #designify-overlay-root, #designify-hud-toast, #designify-hud-style, script[src*="designify"]'
      ).forEach((el) => el.remove());
      codeToCopy = '<!DOCTYPE html>\n' + clone.outerHTML;
    }

    let copied = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(codeToCopy);
        copied = true;
      }
    } catch (e) {
      console.warn('[Designify] navigator.clipboard failed, trying execCommand fallback:', e);
    }

    if (!copied) {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = codeToCopy;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        textarea.style.pointerEvents = 'none';
        textarea.style.left = '-9999px';
        textarea.style.top = '-9999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        copied = document.execCommand('copy');
        document.body.removeChild(textarea);
      } catch (err) {
        console.error('[Designify] Copy fallback failed:', err);
      }
    }

    return { success: copied, isRedesign };
  },

  /**
   * Updates generation progress bar & status text smoothly
   */
  updateProgress(percent, stage, subtext) {
    this.progressPercent = Math.min(100, Math.max(0, Math.round(percent)));
    if (stage) this.progressStage = stage;
    if (subtext) this.progressSubtext = subtext;

    const fillEl = this.hudContainer?.querySelector('.designify-progress-fill');
    const statusTextEl = this.hudContainer?.querySelector('#designify-status-text');
    const percentEl = this.hudContainer?.querySelector('#designify-status-percent');
    const subtextEl = this.hudContainer?.querySelector('#designify-status-subtext');

    if (fillEl && statusTextEl && percentEl && subtextEl) {
      fillEl.style.width = `${this.progressPercent}%`;
      statusTextEl.textContent = this.progressStage;
      percentEl.textContent = `${this.progressPercent}%`;
      subtextEl.textContent = this.progressSubtext;
    } else if (this.isGenerating) {
      this.render();
    }
  },

  /**
   * Automatically steps through AI synthesis stages while awaiting bridge response
   */
  startSynthesisTicker(engine) {
    this.stopSynthesisTicker();
    const engineName = engine === 'codex' ? 'Codex' : 'Claude';
    const subtexts = [
      'Synthesizing modern layouts & glassmorphism...',
      'Crafting clean hero sections and navigation...',
      'Restyling buttons & inputs with mirror IDs...',
      'Generating high-contrast typography & color palette...',
      'Refining CSS variables, margins & box-shadows...'
    ];

    let step = 0;
    this.progressInterval = setInterval(() => {
      if (this.progressPercent < 85) {
        this.progressPercent += 3;
        step = (step + 1) % subtexts.length;
        this.updateProgress(
          this.progressPercent,
          `Redesigning structure with ${engineName}...`,
          subtexts[step]
        );
      }
    }, 2400);
  },

  stopSynthesisTicker() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  },

  /**
   * Mounts the HUD into the document
   */
  async init() {
    if (this.hudContainer) {
      this.show();
      return;
    }

    if (window.DesignifyCache) {
      await window.DesignifyCache.loadDesigns();
      if (window.DesignifyCache.cachedList.length > 0) {
        this.hasGenerated = true;
      }
    }

    // Create Main HUD Root
    this.hudContainer = document.createElement('div');
    this.hudContainer.id = 'designify-hud-root';

    // Create Minimized Floating Action Button & Dropdown Container
    this.miniFab = document.createElement('div');
    this.miniFab.id = 'designify-mini-container';
    this.miniFab.style.display = 'none';
    this.miniFab.innerHTML = `
      <div id="designify-mini-dropdown" class="designify-mini-dropdown">
        <button id="designify-copy-website-btn" class="designify-mini-dropdown-item" title="Copy website code to clipboard">
          <svg class="designify-dropdown-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          <span class="designify-dropdown-text">Copy this website</span>
        </button>
        <button id="designify-open-menu-btn" class="designify-mini-dropdown-item" title="Open full redesign controls">
          <svg class="designify-dropdown-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
          </svg>
          <span class="designify-dropdown-text">Open menu</span>
        </button>
      </div>
      <button id="designify-mini-fab-btn" class="designify-mini-fab-btn" title="Designify Menu">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
      </button>
    `;

    document.documentElement.appendChild(this.hudContainer);
    document.documentElement.appendChild(this.miniFab);

    this.render();
    this.bindEvents();
    console.log('[Designify HUD] Mounted successfully with progress system.');
  },

  /**
   * Renders the internal markup of the HUD card
   */
  render() {
    const presetButtons = this.presets.map((p) => `
      <button class="designify-preset-btn ${p.id === this.selectedTheme ? 'active' : ''}" data-theme="${p.id}" ${this.isGenerating ? 'disabled' : ''}>
        ${p.label}
      </button>
    `).join('');

    // Cached designs switcher
    const cachedDesigns = window.DesignifyCache ? window.DesignifyCache.cachedList : [];
    const activeDesignId = window.DesignifyCache ? window.DesignifyCache.currentActiveId : null;

    let historySection = '';
    if (cachedDesigns.length > 0 && !this.isGenerating) {
      const chips = cachedDesigns.map((d, index) => {
        const isActive = d.id === activeDesignId;
        const number = cachedDesigns.length - index;
        return `
          <div class="designify-history-chip ${isActive ? 'active' : ''}" data-design-id="${d.id}" title="${d.summary || d.themeName}">
            <span>#${number} ${d.themeName}</span>
            <span style="font-size: 10px; opacity: 0.65;">(${d.timeFormatted || 'saved'})</span>
            <span class="designify-chip-delete" data-delete-id="${d.id}" title="Remove this design">&times;</span>
          </div>
        `;
      }).join('');

      historySection = `
        <div class="designify-history-section">
          <div class="designify-history-label">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            Designs (${cachedDesigns.length}):
          </div>
          <div class="designify-history-list">
            <div class="designify-history-chip original ${activeDesignId === 'original' ? 'active' : ''}" data-design-id="original" title="View original website">
              🌐 Original Site
            </div>
            ${chips}
          </div>
        </div>
      `;
    }

    // Progress Bar Block (Shows when generating)
    let progressBlock = '';
    if (this.isGenerating) {
      progressBlock = `
        <div class="designify-progress-box">
          <div class="designify-progress-header">
            <div class="designify-progress-status">
              <div class="designify-progress-spinner"></div>
              <span id="designify-status-text">${this.progressStage || 'Reading DOM elements...'}</span>
            </div>
            <span class="designify-progress-percent" id="designify-status-percent">${this.progressPercent}%</span>
          </div>
          <div class="designify-progress-track">
            <div class="designify-progress-fill" style="width: ${this.progressPercent}%"></div>
          </div>
          <div class="designify-progress-subtext" id="designify-status-subtext">${this.progressSubtext || 'Analyzing layout hierarchy...'}</div>
        </div>
      `;
    }

    this.hudContainer.innerHTML = `
      <div class="designify-hud-card">
        <!-- Header -->
        <div class="designify-hud-header">
          <div class="designify-hud-brand">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
            Designify <span class="designify-badge">AI Live Mirror</span>
          </div>

          <div class="designify-hud-actions">
            <!-- CLI Engine Switcher -->
            <div class="designify-engine-toggle">
              <button class="designify-engine-btn ${this.selectedEngine === 'claude' ? 'active' : ''}" data-engine="claude" title="Use local Claude Code CLI auth" ${this.isGenerating ? 'disabled' : ''}>Claude</button>
              <button class="designify-engine-btn ${this.selectedEngine === 'codex' ? 'active' : ''}" data-engine="codex" title="Use local Codex CLI auth" ${this.isGenerating ? 'disabled' : ''}>Codex</button>
            </div>

            <!-- Minimize Button -->
            <button class="designify-close-btn" id="designify-minimize-btn" title="Minimize to icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>

        <!-- History Switcher Bar (Appears when designs are cached) -->
        ${historySection}

        <!-- Live Generation Progress Bar -->
        ${progressBlock}

        <!-- Theme Presets Bar -->
        <div class="designify-presets" style="${this.isGenerating ? 'opacity: 0.5; pointer-events: none;' : ''}">
          ${presetButtons}
        </div>

        <!-- Prompt and Redesign Action Bar -->
        <div class="designify-hud-main-bar">
          <input 
            type="text" 
            id="designify-custom-prompt" 
            class="designify-prompt-input" 
            placeholder="Custom instructions (e.g. 'Handcrafted Stripe-like layout, bespoke typography')..."
            ${this.isGenerating ? 'disabled' : ''}
          />
          <button id="designify-generate-btn" class="designify-trigger-btn" ${this.isGenerating ? 'disabled' : ''}>
            ${this.isGenerating ? '<div class="designify-spinner"></div> Synthesizing...' : `
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
              </svg>
              Redesign Now
            `}
          </button>
        </div>

        <!-- Secondary Inspection & Export Bar (shows after generation or when designs exist) -->
        <div class="designify-hud-secondary-bar" id="designify-secondary-bar" style="display: ${this.hasGenerated && !this.isGenerating ? 'flex' : 'none'};">
          <div class="designify-control-group">
            <button id="designify-split-btn" class="designify-btn-sm" title="Toggle side-by-side comparison slider">
              ⟷ Split Slider
            </button>

            <div class="designify-slider-container" title="Adjust redesign opacity">
              <span>Opacity:</span>
              <input type="range" id="designify-opacity-slider" class="designify-slider" min="0" max="100" value="100" />
            </div>

            <button id="designify-export-btn" class="designify-btn-sm" title="Download standalone redesigned HTML/CSS">
              ↓ Export Code
            </button>
          </div>

          <div class="designify-hint">
            ${activeDesignId === 'original' ? '<span style="color: #38bdf8;">🌐 Viewing original website</span>' : 'Hold <span class="designify-kbd">Space</span> to peek at original'}
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Binds click and input handlers for the HUD
   */
  bindEvents() {
    this.hudContainer.addEventListener('click', async (e) => {
      if (this.isGenerating) return;

      // 1. History Chip Switching
      const deleteBtn = e.target.closest('.designify-chip-delete');
      if (deleteBtn) {
        e.stopPropagation();
        const deleteId = deleteBtn.dataset.deleteId;
        if (window.DesignifyCache) {
          const wasActive = window.DesignifyCache.currentActiveId === deleteId;
          await window.DesignifyCache.deleteDesign(deleteId);
          if (wasActive) {
            const nextId = window.DesignifyCache.currentActiveId;
            if (nextId && nextId !== 'original') {
              const nextDesign = window.DesignifyCache.getDesignById(nextId);
              if (nextDesign) {
                window.DesignifyOverlay.render({
                  html: nextDesign.html,
                  css: nextDesign.css,
                  summary: nextDesign.summary,
                  themeName: nextDesign.themeName
                });
                window.DesignifyOverlay.toggleVisibility(true);
              }
            } else {
              window.DesignifyOverlay.toggleVisibility(false);
            }
          }
          this.render();
        }
        return;
      }

      const chip = e.target.closest('.designify-history-chip');
      if (chip) {
        const designId = chip.dataset.designId;
        if (designId === 'original') {
          if (window.DesignifyCache) window.DesignifyCache.currentActiveId = 'original';
          window.DesignifyOverlay.toggleVisibility(false);
          this.render();
        } else if (window.DesignifyCache) {
          const design = window.DesignifyCache.getDesignById(designId);
          if (design) {
            window.DesignifyCache.currentActiveId = designId;
            window.DesignifyOverlay.render({
              html: design.html,
              css: design.css,
              summary: design.summary,
              themeName: design.themeName
            });
            window.DesignifyOverlay.toggleVisibility(true);
            this.hasGenerated = true;
            this.render();
          }
        }
        return;
      }

      // 2. Preset buttons
      const presetBtn = e.target.closest('.designify-preset-btn');
      if (presetBtn) {
        this.selectedTheme = presetBtn.dataset.theme;
        this.hudContainer.querySelectorAll('.designify-preset-btn').forEach((b) => b.classList.remove('active'));
        presetBtn.classList.add('active');
      }

      // 3. Engine toggle
      const engineBtn = e.target.closest('.designify-engine-btn');
      if (engineBtn) {
        this.selectedEngine = engineBtn.dataset.engine;
        this.hudContainer.querySelectorAll('.designify-engine-btn').forEach((b) => b.classList.remove('active'));
        engineBtn.classList.add('active');
      }

      // 4. Minimize
      if (e.target.closest('#designify-minimize-btn')) {
        this.minimize();
      }

      // 5. Generate button
      if (e.target.closest('#designify-generate-btn') && !this.isGenerating) {
        this.handleGenerate();
      }

      // 6. Split slider toggle
      if (e.target.closest('#designify-split-btn')) {
        const btn = this.hudContainer.querySelector('#designify-split-btn');
        const isActive = btn.classList.toggle('active');
        if (isActive && window.DesignifyCache && window.DesignifyCache.currentActiveId === 'original') {
          const recent = window.DesignifyCache.cachedList[0];
          if (recent) {
            window.DesignifyCache.currentActiveId = recent.id;
            window.DesignifyOverlay.render({
              html: recent.html,
              css: recent.css,
              summary: recent.summary,
              themeName: recent.themeName
            });
            window.DesignifyOverlay.toggleVisibility(true);
            this.render();
          }
        }
        window.DesignifyOverlay.toggleSplitMode(isActive);
      }

      // 7. Export button
      if (e.target.closest('#designify-export-btn')) {
        window.DesignifyOverlay.exportCode();
      }
    });

    // Opacity slider
    this.hudContainer.addEventListener('input', (e) => {
      if (e.target.id === 'designify-opacity-slider') {
        const val = parseFloat(e.target.value) / 100;
        if (window.DesignifyCache && window.DesignifyCache.currentActiveId === 'original') {
          const recent = window.DesignifyCache.cachedList[0];
          if (recent) {
            window.DesignifyCache.currentActiveId = recent.id;
            window.DesignifyOverlay.render({
              html: recent.html,
              css: recent.css,
              summary: recent.summary,
              themeName: recent.themeName
            });
            window.DesignifyOverlay.toggleVisibility(true);
            this.render();
          }
        }
        window.DesignifyOverlay.setOpacity(val);
      }
    });

    // Enter in prompt input triggers redesign
    this.hudContainer.addEventListener('keydown', (e) => {
      if (e.target.id === 'designify-custom-prompt' && e.key === 'Enter' && !this.isGenerating) {
        this.handleGenerate();
      }
    });

    // Mini FAB click toggles dropdown
    const miniFabBtn = this.miniFab.querySelector('#designify-mini-fab-btn');
    if (miniFabBtn) {
      miniFabBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleMiniDropdown();
      });
    }

    // Dropdown button: "Copy this website"
    const copyWebsiteBtn = this.miniFab.querySelector('#designify-copy-website-btn');
    if (copyWebsiteBtn) {
      copyWebsiteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await this.handleCopyWebsite(copyWebsiteBtn);
      });
    }

    // Dropdown button: "Open menu"
    const openMenuBtn = this.miniFab.querySelector('#designify-open-menu-btn');
    if (openMenuBtn) {
      openMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeMiniDropdown();
        this.show();
      });
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (this.isMiniDropdownOpen && this.miniFab && !this.miniFab.contains(e.target)) {
        this.closeMiniDropdown();
      }
    });

    // Close dropdown on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isMiniDropdownOpen) {
        this.closeMiniDropdown();
      }
    });
  },

  /**
   * Triggers the redesign process
   */
  async handleGenerate() {
    const promptInput = this.hudContainer.querySelector('#designify-custom-prompt');
    const customPrompt = promptInput ? promptInput.value.trim() : '';

    this.isGenerating = true;
    this.updateProgress(10, 'Reading DOM elements...', 'Scanning active page and tagging interactive nodes');
    this.render();

    try {
      await window.DesignifyCoordinator.runRedesign({
        theme: this.selectedTheme,
        engine: this.selectedEngine,
        customPrompt
      });

      this.updateProgress(100, 'Redesign complete! ✨', 'Applying final polish and event listeners');
      await new Promise((r) => setTimeout(r, 600));
      this.hasGenerated = true;
    } catch (err) {
      alert(`Redesign Error: ${err.message}`);
    } finally {
      this.stopSynthesisTicker();
      this.isGenerating = false;
      this.render();
    }
  }
};
