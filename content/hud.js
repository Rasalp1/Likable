/**
 * Designify - Floating Glassmorphic In-Page Control HUD
 */

window.DesignifyHUD = {
  hudContainer: null,
  miniFab: null,
  selectedTheme: 'linear-dark',
  selectedEngine: 'claude',
  isGenerating: false,
  hasGenerated: false,

  // Live generation progress state
  progressPercent: 0,
  progressStage: '',
  progressSubtext: '',
  progressInterval: null,

  presets: [
    { id: 'linear-dark', label: '⚡ Linear Dark' },
    { id: 'apple-modern', label: '🍏 Apple Modern' },
    { id: 'glassmorphism', label: '🔮 Glassmorphism' },
    { id: 'bento-grid', label: '📦 Bento Grid' },
    { id: 'cyberpunk', label: '🦾 Cyberpunk' }
  ],

  show() {
    if (this.hudContainer) {
      this.hudContainer.style.display = 'block';
    }
    if (this.miniFab) {
      this.miniFab.style.display = 'none';
    }
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

    // Create Minimized Floating Action Button
    this.miniFab = document.createElement('div');
    this.miniFab.id = 'designify-mini-fab';
    this.miniFab.title = 'Open Designify HUD';
    this.miniFab.innerHTML = `
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
      </svg>
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
            placeholder="Custom instructions (e.g. 'Stripe aesthetic with glow shadows')..."
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
            Hold <span class="designify-kbd">Space</span> to peek at original
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
          await window.DesignifyCache.deleteDesign(deleteId);
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
        this.hudContainer.style.display = 'none';
        this.miniFab.style.display = 'flex';
      }

      // 5. Generate button
      if (e.target.closest('#designify-generate-btn') && !this.isGenerating) {
        this.handleGenerate();
      }

      // 6. Split slider toggle
      if (e.target.closest('#designify-split-btn')) {
        const btn = this.hudContainer.querySelector('#designify-split-btn');
        const isActive = btn.classList.toggle('active');
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
        window.DesignifyOverlay.setOpacity(val);
      }
    });

    // Enter in prompt input triggers redesign
    this.hudContainer.addEventListener('keydown', (e) => {
      if (e.target.id === 'designify-custom-prompt' && e.key === 'Enter' && !this.isGenerating) {
        this.handleGenerate();
      }
    });

    // Mini FAB click restores HUD
    this.miniFab.addEventListener('click', () => {
      this.miniFab.style.display = 'none';
      this.hudContainer.style.display = 'block';
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
