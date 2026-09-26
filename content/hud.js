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
   * Mounts the HUD into the document
   */
  init() {
    if (this.hudContainer) {
      this.show();
      return;
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
    console.log('[Designify HUD] Mounted successfully.');
  },

  /**
   * Renders the internal markup of the HUD card
   */
  render() {
    const presetButtons = this.presets.map((p) => `
      <button class="designify-preset-btn ${p.id === this.selectedTheme ? 'active' : ''}" data-theme="${p.id}">
        ${p.label}
      </button>
    `).join('');

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
              <button class="designify-engine-btn ${this.selectedEngine === 'claude' ? 'active' : ''}" data-engine="claude" title="Use local Claude Code CLI auth">Claude</button>
              <button class="designify-engine-btn ${this.selectedEngine === 'codex' ? 'active' : ''}" data-engine="codex" title="Use local Codex CLI auth">Codex</button>
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

        <!-- Theme Presets Bar -->
        <div class="designify-presets">
          ${presetButtons}
        </div>

        <!-- Prompt and Redesign Action Bar -->
        <div class="designify-hud-main-bar">
          <input 
            type="text" 
            id="designify-custom-prompt" 
            class="designify-prompt-input" 
            placeholder="Custom instructions (e.g. 'Stripe aesthetic with glow shadows')..."
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

        <!-- Secondary Inspection & Export Bar (shows after generation) -->
        <div class="designify-hud-secondary-bar" id="designify-secondary-bar" style="display: ${this.hasGenerated ? 'flex' : 'none'};">
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
    // Preset buttons
    this.hudContainer.addEventListener('click', (e) => {
      const presetBtn = e.target.closest('.designify-preset-btn');
      if (presetBtn) {
        this.selectedTheme = presetBtn.dataset.theme;
        this.hudContainer.querySelectorAll('.designify-preset-btn').forEach((b) => b.classList.remove('active'));
        presetBtn.classList.add('active');
      }

      const engineBtn = e.target.closest('.designify-engine-btn');
      if (engineBtn) {
        this.selectedEngine = engineBtn.dataset.engine;
        this.hudContainer.querySelectorAll('.designify-engine-btn').forEach((b) => b.classList.remove('active'));
        engineBtn.classList.add('active');
      }

      // Minimize
      if (e.target.closest('#designify-minimize-btn')) {
        this.hudContainer.style.display = 'none';
        this.miniFab.style.display = 'flex';
      }

      // Generate button
      if (e.target.closest('#designify-generate-btn') && !this.isGenerating) {
        this.handleGenerate();
      }

      // Split slider toggle
      if (e.target.closest('#designify-split-btn')) {
        const btn = this.hudContainer.querySelector('#designify-split-btn');
        const isActive = btn.classList.toggle('active');
        window.DesignifyOverlay.toggleSplitMode(isActive);
      }

      // Export button
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
      if (e.target.id === 'designify-custom-prompt' && e.key === 'Enter') {
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
    this.render();

    try {
      await window.DesignifyCoordinator.runRedesign({
        theme: this.selectedTheme,
        engine: this.selectedEngine,
        customPrompt
      });

      this.hasGenerated = true;
    } catch (err) {
      alert(`Redesign Error: ${err.message}`);
    } finally {
      this.isGenerating = false;
      this.render();
    }
  }
};
