/**
 * Likable - Shadow DOM Redesign Overlay & Event Mirroring Engine
 * Projects the AI-generated redesign cleanly on top of the host webpage,
 * completely isolated inside a Shadow DOM, while mirroring clicks and keystrokes
 * bi-directionally to keep 100% of underlying functionality working.
 */

window.LikableOverlay = window.LikeableOverlay = window.DesignifyOverlay =
  window.LikableOverlay || window.LikeableOverlay || window.DesignifyOverlay || {
  hostElement: null,
  shadowRoot: null,
  activeRedesign: null,
  isSplitActive: false,
  splitPercentage: 50,
  currentOpacity: 1.0,

  /**
   * Initializes the Shadow DOM host element
   */
  init() {
    if (this.hostElement && document.contains(this.hostElement)) return;

    if (this.hostElement && !document.contains(this.hostElement)) {
      this.hostElement.remove();
      this.hostElement = null;
    }

    this.hostElement = document.createElement('div');
    this.hostElement.id = 'designify-overlay-root';
    this.hostElement.style.cssText = `
      position: fixed !important;
      inset: 0px !important;
      top: 0px !important;
      left: 0px !important;
      right: 0px !important;
      bottom: 0px !important;
      width: 100vw !important;
      height: 100vh !important;
      max-width: 100vw !important;
      max-height: 100vh !important;
      margin: 0px !important;
      padding: 0px !important;
      border: none !important;
      transform: none !important;
      filter: none !important;
      pointer-events: none !important;
      z-index: 2147483640 !important;
      overflow: hidden !important;
      display: none !important;
    `;
    this.hostElement.setAttribute('hidden', '');
    this.hostElement.classList.add('designify-hidden');

    (document.body || document.documentElement).appendChild(this.hostElement);
    this.shadowRoot = this.hostElement.attachShadow({ mode: 'open' });

    this.bindGlobalShortcuts();
    console.log('[Likable Overlay] Shadow DOM host created.');
  },

  /**
   * Sanitizes AI-generated HTML before rendering inside the Shadow DOM.
   * This is deliberately conservative: generated markup is untrusted and
   * must not be allowed to load remote resources or create active content.
   */
  sanitizeHtml(html) {
    if (!html) return '';
    const parsed = new DOMParser().parseFromString(String(html), 'text/html');
    parsed.querySelectorAll('script, style, link, meta, base, iframe, object, embed, portal, foreignObject, use').forEach((el) => el.remove());

    const safeUrl = (value, resource = false) => {
      const trimmed = value.trim();
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('./') || trimmed.startsWith('../') || trimmed.startsWith('/')) {
        return trimmed.startsWith('//') ? '' : trimmed;
      }
      if (/^data:image\/(png|jpeg|gif|webp);base64,/i.test(trimmed)) return resource ? trimmed : '';
      try {
        const resolved = new URL(trimmed, window.location.href);
        if (resolved.origin !== window.location.origin) return '';
        return resolved.href;
      } catch {
        return '';
      }
    };

    parsed.body.querySelectorAll('*').forEach((el) => {
      [...el.attributes].forEach((attribute) => {
        const name = attribute.name.toLowerCase();
        const value = attribute.value;

        if (name.startsWith('on') || name === 'srcdoc' || name === 'srcset' || name === 'integrity') {
          el.removeAttribute(attribute.name);
          return;
        }
        if (name === 'data-mirror-id' && !/^d-\d+$/.test(value)) {
          el.removeAttribute(attribute.name);
          return;
        }
        if (name === 'href' || name === 'xlink:href') {
          el.setAttribute(attribute.name, safeUrl(value) || '#');
          return;
        }
        if (name === 'src' || name === 'poster') {
          const safe = safeUrl(value, true);
          if (safe) el.setAttribute(attribute.name, safe);
          else el.removeAttribute(attribute.name);
          return;
        }
        if (name === 'action' || name === 'formaction') {
          el.setAttribute(attribute.name, '#');
          return;
        }
        if (name === 'style') {
          const safeStyle = value
            .replace(/url\s*\([^)]*\)/gi, '')
            .replace(/expression\s*\([^)]*\)/gi, '')
            .replace(/\\/g, '')
            .slice(0, 4_000);
          el.setAttribute(attribute.name, safeStyle);
        }
      });
    });

    return parsed.body.innerHTML;
  },

  sanitizeCss(css) {
    if (!css) return '';
    return String(css)
      .slice(0, 4 * 1024 * 1024)
      .replace(/@import[^;]*;?/gi, '')
      .replace(/url\s*\([^)]*\)/gi, 'none')
      .replace(/expression\s*\([^)]*\)/gi, 'none')
      .replace(/\\/g, '');
  },

  /**
   * Renders a new redesign inside the Shadow DOM
   */
  render({ html, css, summary, themeName }) {
    this.init();
    const sanitizedHtml = this.sanitizeHtml(html);
    const sanitizedCss = this.sanitizeCss(css);
    this.activeRedesign = { html: sanitizedHtml, css: sanitizedCss, summary, themeName };

    const rawTheme = (themeName || '').toLowerCase();
    let currentThemeBg = '#0d0e12';
    if (rawTheme.includes('apple')) {
      currentThemeBg = '#f5f5f7';
    } else if (rawTheme.includes('lovable')) {
      currentThemeBg = '#0b0816';
    } else if (rawTheme.includes('linear')) {
      currentThemeBg = '#0d0e12';
    }

    // Build base reset and overlay structure inside shadow root
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          position: fixed;
          inset: 0;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          width: 100vw;
          height: 100vh;
          margin: 0;
          padding: 0;
          border: none;
          z-index: 2147483640;
          pointer-events: none;
        }

        :host([hidden]),
        :host(.designify-hidden) {
          display: none !important;
        }

        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        #designify-canvas-wrapper {
          position: fixed !important;
          inset: 0 !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          overflow-y: auto !important;
          overflow-x: hidden !important;
          pointer-events: auto !important;
          background: ${currentThemeBg} !important;
          margin: 0 !important;
          padding: 0 !important;
          transition: opacity 0.2s ease;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", Helvetica, Arial, sans-serif;
          -webkit-font-smoothing: antialiased;
        }

        /* Force root container to span full width and min-height */
        #designify-container {
          width: 100% !important;
          min-width: 100% !important;
          min-height: 100vh !important;
          margin: 0 !important;
          padding: 0 !important;
          box-sizing: border-box !important;
          display: block !important;
          position: relative !important;
          top: 0 !important;
          left: 0 !important;
          background: inherit;
        }

        /* Custom Scrollbar */
        #designify-canvas-wrapper::-webkit-scrollbar {
          width: 8px;
        }
        #designify-canvas-wrapper::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
        }
        #designify-canvas-wrapper::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.25);
          border-radius: 4px;
        }
        #designify-canvas-wrapper::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.4);
        }

        /* Interactive Split Slider */
        #designify-split-divider {
          position: fixed;
          top: 0;
          bottom: 0;
          width: 2px;
          background: rgba(255, 255, 255, 0.9);
          cursor: col-resize;
          z-index: 2147483647;
          pointer-events: auto;
          display: none;
          box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.15);
        }

        #designify-split-handle {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 30px;
          height: 44px;
          border-radius: 15px;
          background: rgba(248, 248, 250, 0.96);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #515158;
          font-size: 13px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.18);
          user-select: none;
        }

      </style>

      <div id="designify-canvas-wrapper">
      </div>

      <div id="designify-split-divider">
        <div id="designify-split-handle">⟷</div>
      </div>
    `;

    const designStyle = document.createElement('style');
    designStyle.id = 'designify-generated-style';
    designStyle.textContent = sanitizedCss;
    this.shadowRoot.appendChild(designStyle);

    const wrapper = this.shadowRoot.getElementById('designify-canvas-wrapper');
    wrapper.innerHTML = sanitizedHtml;

    this.toggleVisibility(true);
    this.setOpacity(this.currentOpacity);
    this.setupEventMirroring();
    this.setupSplitSlider();

    console.log('[Likable Overlay] Redesign successfully projected in Shadow DOM.');
  },

  /**
   * Bi-directional Event Mirroring
   * Maps clicks, inputs, and form submissions from Shadow DOM back to the native DOM
   */
  setupEventMirroring() {
    const wrapper = this.shadowRoot.getElementById('designify-canvas-wrapper');
    if (!wrapper) return;

    // 1. Click Mirroring
    wrapper.addEventListener('click', (e) => {
      const target = e.target.closest('[data-mirror-id]');
      if (!target) return;

      const mirrorId = target.getAttribute('data-mirror-id');
      const nativeEl = document.querySelector(`[data-mirror-id="${mirrorId}"]`);

      if (nativeEl) {
        console.log(`[Likable Mirror] Forwarding click to native element: ${mirrorId} (${nativeEl.tagName})`);
        
        // Visual click feedback in overlay
        target.style.transition = 'transform 0.1s ease';
        target.style.transform = 'scale(0.97)';
        setTimeout(() => { target.style.transform = ''; }, 120);

        // Native click dispatch
        nativeEl.click();

        // If it's a link with an href and wasn't prevented, follow link
        if (nativeEl.tagName.toLowerCase() === 'a' && nativeEl.href && !nativeEl.href.endsWith('#')) {
          setTimeout(() => {
            if (window.location.href !== nativeEl.href) {
              window.location.href = nativeEl.href;
            }
          }, 50);
        }
      }
    });

    // 2. Input & Keystroke Mirroring
    wrapper.addEventListener('input', (e) => {
      const target = e.target;
      const mirrorId = target.getAttribute('data-mirror-id');
      if (!mirrorId) return;

      const nativeEl = document.querySelector(`[data-mirror-id="${mirrorId}"]`);
      if (nativeEl && ('value' in nativeEl)) {
        nativeEl.value = target.value;
        nativeEl.dispatchEvent(new Event('input', { bubbles: true }));
        nativeEl.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    // 3. Keydown (Enter to submit forms or search)
    wrapper.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const target = e.target;
        const mirrorId = target.getAttribute('data-mirror-id');
        if (!mirrorId) return;

        const nativeEl = document.querySelector(`[data-mirror-id="${mirrorId}"]`);
        if (nativeEl) {
          // Trigger Enter on native element
          const enterEvent = new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true,
            cancelable: true
          });
          nativeEl.dispatchEvent(enterEvent);

          // If in a form, trigger submit
          if (nativeEl.form) {
            nativeEl.form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
            if (typeof nativeEl.form.requestSubmit === 'function') {
              nativeEl.form.requestSubmit();
            }
          }
        }
      }
    });

    // Prevent generated forms from submitting directly. Mirrored native
    // controls are responsible for submitting the real page form.
    wrapper.addEventListener('submit', (e) => e.preventDefault());
  },

  /**
   * Split Slider Logic (Before/After side-by-side view)
   */
  setupSplitSlider() {
    const divider = this.shadowRoot.getElementById('designify-split-divider');
    const wrapper = this.shadowRoot.getElementById('designify-canvas-wrapper');
    if (!divider || !wrapper) return;

    let isDragging = false;

    const updateSplit = (clientX) => {
      const percent = Math.max(5, Math.min(95, (clientX / window.innerWidth) * 100));
      this.splitPercentage = percent;
      divider.style.left = `${percent}%`;
      wrapper.style.clipPath = `polygon(0 0, ${percent}% 0, ${percent}% 100%, 0 100%)`;
    };

    divider.addEventListener('mousedown', (e) => {
      isDragging = true;
      e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      updateSplit(e.clientX);
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
    });
  },

  /**
   * Toggle Before/After Split Mode
   */
  toggleSplitMode(enable) {
    this.isSplitActive = enable !== undefined ? enable : !this.isSplitActive;
    const divider = this.shadowRoot?.getElementById('designify-split-divider');
    const wrapper = this.shadowRoot?.getElementById('designify-canvas-wrapper');

    if (!divider || !wrapper) return;

    if (this.isSplitActive) {
      divider.style.display = 'block';
      divider.style.left = `${this.splitPercentage}%`;
      wrapper.style.clipPath = `polygon(0 0, ${this.splitPercentage}% 0, ${this.splitPercentage}% 100%, 0 100%)`;
    } else {
      divider.style.display = 'none';
      wrapper.style.clipPath = 'none';
    }
  },

  /**
   * Sets opacity of the redesign overlay (0.0 to 1.0)
   */
  setOpacity(val) {
    this.currentOpacity = val;
    const wrapper = this.shadowRoot?.getElementById('designify-canvas-wrapper');
    if (wrapper) {
      wrapper.style.opacity = val;
    }
  },

  /**
   * Shows / Hides the entire overlay
   */
  toggleVisibility(visible) {
    if (!this.hostElement) return;
    const isCurrentlyHidden = this.hostElement.style.display === 'none' ||
                              this.hostElement.hasAttribute('hidden') ||
                              this.hostElement.classList.contains('designify-hidden');
    const nextState = visible !== undefined ? !!visible : isCurrentlyHidden;

    if (nextState) {
      this.hostElement.style.setProperty('display', 'block', 'important');
      this.hostElement.removeAttribute('hidden');
      this.hostElement.classList.remove('designify-hidden');
    } else {
      this.hostElement.style.setProperty('display', 'none', 'important');
      this.hostElement.setAttribute('hidden', '');
      this.hostElement.classList.add('designify-hidden');
    }

    const wrapper = this.shadowRoot?.getElementById('designify-canvas-wrapper');
    if (wrapper) {
      wrapper.style.display = nextState ? 'block' : 'none';
    }

    const divider = this.shadowRoot?.getElementById('designify-split-divider');
    if (divider) {
      divider.style.display = (nextState && this.isSplitActive) ? 'block' : 'none';
    }
  },

  /**
   * Bind global hotkey to quickly peek at the original page
   */
  bindGlobalShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Don't trigger if user is typing in an input or textarea
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || document.activeElement?.isContentEditable) {
        return;
      }

      // Spacebar or Shift+V toggles redesign visibility
      if (e.code === 'Space' && !e.repeat && this.hostElement && this.hostElement.style.display !== 'none') {
        const wrapper = this.shadowRoot?.getElementById('designify-canvas-wrapper');
        if (wrapper) {
          wrapper.style.opacity = '0.05';
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space' && this.hostElement && this.hostElement.style.display !== 'none') {
        const wrapper = this.shadowRoot?.getElementById('designify-canvas-wrapper');
        if (wrapper) {
          wrapper.style.opacity = this.currentOpacity.toString();
        }
      }
    });
  },

  /**
   * Exports the generated redesign as standalone HTML/CSS package
   */
  exportCode() {
    if (!this.activeRedesign) {
      alert('Please generate a redesign first before exporting.');
      return;
    }

    const { html, css, themeName, summary } = this.activeRedesign;

    const standaloneHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Likable Redesign - ${themeName}</title>
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
  <!-- Generated by Likable AI Redesign System -->
  <!-- Theme: ${themeName} | ${summary} -->
  ${html}
</body>
</html>`;

    // Trigger download
    const blob = new Blob([standaloneHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `likable-${themeName.toLowerCase().replace(/\s+/g, '-')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
};
window.LikableOverlay = window.LikeableOverlay = window.DesignifyOverlay;
