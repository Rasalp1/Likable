/**
 * Likable - Floating Glassmorphic In-Page Control HUD
 */

window.LikableHUD = window.LikeableHUD = window.DesignifyHUD =
  window.LikableHUD || window.LikeableHUD || window.DesignifyHUD || {
  hudContainer: null,
  miniFab: null,
  enabled: true,
  isOpen: true,
  customPrompt: '',
  _initPromise: null,
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

  defaultPresets: [
    {
      id: 'linear',
      label: 'Linear',
      name: 'Linear',
      isCustom: false,
      originUrl: 'https://linear.app',
      createdAt: 0,
      description: 'Independent preset inspired by public visual conventions associated with Linear (linear.app): dark canvas, 9px card radii, Inter Variable typography.',
      palette: {
        background: '#08090a',
        surface: 'rgb(15, 16, 17)',
        surfaceHover: 'rgba(255, 255, 255, 0.09)',
        border: '0.5px solid rgba(255, 255, 255, 0.08)',
        textPrimary: 'rgb(247, 248, 248)',
        textSecondary: 'rgb(138, 143, 152)',
        accent: '#6366f1',
        accentGlow: 'rgba(99, 102, 241, 0.2)'
      },
      layout: {
        containerMaxWidth: '1360px',
        layoutStructure: 'bento-grid',
        sectionSpacingY: '128px'
      },
      geometry: {
        cardRadius: '9px',
        buttonRadius: '8px'
      },
      padding: {
        cardPadding: '8px 10px',
        buttonPadding: '4px 0px',
        sectionSpacingY: '128px'
      },
      elevation: {
        cardShadow: 'rgb(35, 37, 42) 0px 0px 0px 1px inset',
        cardBorder: '0.5px solid rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(20px)'
      },
      typography: {
        headingFont: 'Inter Variable',
        bodyFont: 'Inter Variable',
        headingWeight: '510',
        headingTracking: '-1.408px'
      },
      mandate: `
### LINEAR-INSPIRED DESIGN SYSTEM GUIDANCE:
The user selected an independent preset inspired by public visual conventions associated with **Linear** (https://linear.app).
Use these tokens as a starting point. Do not copy logos, proprietary assets, text, or distinctive trade dress:
1. **Dark Mode Atmosphere & Canvas**:
   - Canvas Background: \`#08090a\`.
   - Card Surfaces: \`rgb(15, 16, 17)\` with border \`0.5px solid rgba(255, 255, 255, 0.08)\`.
   - Text Hierarchy: High-contrast primary \`rgb(247, 248, 248)\`, muted secondary \`rgb(138, 143, 152)\`.
2. **Layout Rhythm & Spatial Structure**:
   - Container Max-Width: \`1360px\` centered with auto margins.
   - Section Vertical Spacing: \`128px\` padding between major sections.
   - Layout Paradigm: \`bento-grid\` with consistent grid gaps (20px to 32px).
3. **Card Geometry & Elevation**:
   - Corner Radius: \`9px\`.
   - Internal Card Padding: \`8px 10px\`.
   - Shadows: \`rgb(35, 37, 42) 0px 0px 0px 1px inset\`.
   - Frosted Glass: \`backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);\`.
4. **Typography & Tracking**:
   - Headings: \`font-family: "Inter Variable", -apple-system, sans-serif;\`, \`font-weight: 510\`, \`letter-spacing: -1.408px\`, \`line-height: 64px\`.
   - Body Copy: \`font-family: "Inter Variable", -apple-system, sans-serif;\`, \`line-height: 24px\`.
5. **Action Buttons & Form Controls**:
   - Primary Action Button: \`background: #6366f1 !important; border-radius: 8px !important; padding: 4px 0px !important; font-weight: 510 !important;\`
   - Micro-interaction: Snappy hover transition (\`transform: translateY(-1px); transition: all 0.2s ease;\`).
6. **Bespoke Human Craft & Anti-AI-Generated Discipline (MANDATORY)**:
   - MUST NOT look AI-generated: Strictly avoid generic AI clichés, giant blurry purple/neon gradient spheres, floating glowing halo blobs, and cookie-cutter SaaS layouts.
   - Product-specific structure: Preserve the target page's content, real headlines, real navigation, and domain-specific layout density instead of replacing them with generic marketing placeholders.
   - Restrained physical depth: Use precise hairline borders (\`0.5px solid rgba(255, 255, 255, 0.08)\`) and authentic layered shadows (\`rgb(35, 37, 42) 0px 0px 0px 1px inset\`) rather than tacky glowing outlines or AI slop gradients.
`
    },
    {
      id: 'apple',
      label: 'Apple',
      name: 'Apple',
      isCustom: false,
      originUrl: 'https://apple.com',
      createdAt: 0,
      description: 'Bespoke, hyper-clean design inspired by Apple. Generous whitespace, refined human sans-serif typography, subtle frosted glass headers, natural multi-layered drop shadows, and purposeful primary accents.',
      palette: {
        background: '#fafafa',
        surface: '#ffffff',
        surfaceHover: '#f5f5f7',
        border: 'rgba(0, 0, 0, 0.06)',
        textPrimary: '#1d1d1f',
        textSecondary: '#86868b',
        accent: '#0071e3',
        accentGlow: 'rgba(0, 113, 227, 0.12)'
      },
      layout: {
        containerMaxWidth: '1280px',
        sectionSpacingY: '96px',
        layoutStructure: 'structured-sections'
      },
      geometry: {
        cardRadius: '22px',
        buttonRadius: '980px'
      },
      padding: {
        cardPadding: '36px 44px',
        buttonPadding: '11px 24px',
        sectionSpacingY: '96px'
      },
      elevation: {
        cardShadow: '0 4px 24px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.02)',
        cardBorder: '1px solid rgba(0, 0, 0, 0.06)',
        backdropFilter: 'saturate(180%) blur(20px)'
      },
      typography: {
        headingFont: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif',
        bodyFont: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
        headingWeight: '700',
        headingTracking: '-0.025em'
      },
      mandate: `
### APPLE-INSPIRED DESIGN SYSTEM GUIDANCE:
The user selected an independent preset inspired by public visual conventions associated with **Apple** (https://apple.com), macOS, and common platform interface guidance.
Use these tokens as a starting point. Do not copy logos, proprietary assets, text, or distinctive trade dress:
1. **Light Mode Atmosphere & Canvas**:
   - Canvas Background: \`#fafafa\` (or \`#f5f5f7\`). Under NO circumstances produce a dark mode or black interface when Apple is selected!
   - Card Surfaces: Crisp white (\`#ffffff\`) with border \`1px solid rgba(0, 0, 0, 0.06)\`.
   - Text Hierarchy: Deep charcoal primary \`#1d1d1f\`, muted secondary \`#86868b\`.
2. **Apple Frosted Glass Navigation Header**:
   - Top navigation bar MUST feature Apple's signature frosted glass material:
     \`background: rgba(255, 255, 255, 0.8) !important; backdrop-filter: saturate(180%) blur(20px); -webkit-backdrop-filter: saturate(180%) blur(20px); border-bottom: 1px solid rgba(0, 0, 0, 0.08);\`
   - Clean, spaced navigation items with subtle hover transitions.
3. **Signature Apple Blue Pill Buttons & Actions**:
   - Primary CTA buttons can use a restrained blue pill treatment:
     \`background: #0071e3 !important; color: #ffffff !important; border-radius: 980px !important; padding: 11px 24px !important; font-size: 14px !important; font-weight: 500 !important; border: none !important; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06); transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);\`
     Hover state: \`background: #0077ed !important; transform: scale(1.02);\`.
   - Secondary actions: Subtle light gray pill buttons (\`background: rgba(0, 0, 0, 0.05); color: #1d1d1f; border-radius: 980px; padding: 11px 24px; border: none;\`) or elegant text links with blue chevron \`›\`.
   - Inputs & Search: Rounded 12px or pill search inputs with clean white fill, subtle \`#d2d2d7\` border, and Apple Blue focus glow (\`box-shadow: 0 0 0 4px rgba(0, 113, 227, 0.15); border-color: #0071e3;\`).
6. **Bespoke Human Craft & Anti-AI-Generated Discipline (MANDATORY)**:
   - MUST NOT look AI-generated: Strictly avoid generic AI clichés, giant blurry purple/neon gradient spheres, floating glowing halo blobs, and cookie-cutter SaaS layouts.
   - Product-specific structure: Preserve the target page's content, real headlines, real navigation, and domain-specific layout density instead of replacing them with generic marketing placeholders.
   - Restrained physical depth: Use pristine whitespace, subtle hairline borders (\`1px solid rgba(0, 0, 0, 0.06)\`), and ultra-soft diffuse drop shadows rather than tacky glowing outlines or AI slop gradients.
`
    },
    {
      id: 'lovable',
      label: 'Lovable',
      name: 'Lovable',
      isCustom: false,
      originUrl: 'https://lovable.dev',
      createdAt: 0,
      description: 'Independent preset inspired by public visual conventions associated with Lovable (lovable.dev): vibrant dark canvas with luminous pink, purple, and blue gradients, 12px card radii, and colorful accents.',
      palette: {
        background: '#0b0816',
        surface: 'rgba(26, 20, 48, 0.75)',
        surfaceHover: 'rgba(168, 85, 247, 0.16)',
        border: '1px solid rgba(168, 85, 247, 0.25)',
        textPrimary: '#ffffff',
        textSecondary: '#c4b5fd',
        accent: '#ec4899',
        accentGlow: 'rgba(236, 72, 153, 0.35)',
        pink: '#ec4899',
        purple: '#a855f7',
        blue: '#3b82f6',
        gradient: 'linear-gradient(135deg, #ec4899 0%, #a855f7 50%, #3b82f6 100%)'
      },
      layout: {
        containerMaxWidth: '1480px',
        layoutStructure: 'bento-grid',
        sectionSpacingY: '160px'
      },
      geometry: {
        cardRadius: '12px',
        buttonRadius: '16px'
      },
      padding: {
        cardPadding: '28px 32px',
        buttonPadding: '10px 20px',
        sectionSpacingY: '160px'
      },
      elevation: {
        cardShadow: '0 8px 32px rgba(11, 8, 22, 0.6), 0 0 0 1px rgba(168, 85, 247, 0.2) inset, 0 0 20px -5px rgba(236, 72, 153, 0.15)',
        cardBorder: '1px solid rgba(168, 85, 247, 0.25)',
        backdropFilter: 'blur(16px)'
      },
      typography: {
        headingFont: 'Camera Plain Variable',
        bodyFont: 'Camera Plain Variable',
        headingWeight: '500',
        headingTracking: '-0.025em'
      },
      mandate: `
### LOVABLE-INSPIRED COLORFUL DESIGN SYSTEM GUIDANCE:
The user selected the **Lovable** preset (inspired by https://lovable.dev). This preset MUST be colorful, vibrant, and luminous, featuring rich harmonies of **pink, purple, and blue** over a deep cosmic dark canvas. Under NO circumstances should the interface look black-and-white, monochrome, or dull gray:
Use these tokens as a starting point. Do not copy logos, proprietary assets, text, or distinctive trade dress.

1. **Vibrant Dark Atmosphere & Canvas (Pink, Purple & Blue Radiance)**:
   - Canvas Background: \`#0b0816\` (deep cosmic midnight canvas infused with subtle ambient radial gradients or soft glows of \`#8b5cf6\`, \`#ec4899\`, and \`#3b82f6\`).
   - Surfaces & Bento Cards: Translucent dark violet/slate cards (\`rgba(26, 20, 48, 0.75)\` or \`#140f2b\`) with delicate luminous borders (\`1px solid rgba(168, 85, 247, 0.25)\` or subtle pink/purple/blue gradient borders) and frosted glass (\`backdrop-filter: blur(16px);\`).
   - Text Hierarchy: Crisp luminous white primary headings/text (\`#ffffff\` / \`#fdf4ff\`), soft radiant lilac/periwinkle secondary copy (\`#c4b5fd\` or \`#a5b4fc\`).
   - Gradient Text Highlights: Use colorful pink-to-purple-to-blue gradient text for hero headlines, key branding text, or emphasis phrases:
     \`background: linear-gradient(135deg, #ec4899 0%, #a855f7 50%, #3b82f6 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;\`

2. **Vibrant Tri-Color Palette & Role Distribution**:
   - **Pink (\`#ec4899\`, \`#f43f5e\`, \`#f472b6\`)**: High-energy primary CTA buttons, energetic accent highlights, hot pink notification badges, and glowing ring accents.
   - **Purple (\`#a855f7\`, \`#8b5cf6\`, \`#7c3aed\`)**: Atmospheric card borders, frosted surface tints, glowing badges, active tabs, and secondary CTAs.
   - **Blue (\`#3b82f6\`, \`#60a5fa\`, \`#2563eb\`)**: Informative badges, interactive link states, focus indicators, and gradient transitions complementing the pink and purple.
   - **Signature Tri-Color Gradient**: Combine all three in hero buttons, badges, and prominent dividers:
     \`linear-gradient(135deg, #ec4899 0%, #a855f7 50%, #3b82f6 100%)\`

3. **Layout Rhythm & Spatial Structure**:
   - Container Max-Width: \`1480px\` centered with auto margins.
   - Section Vertical Spacing: \`160px\` padding between major sections.
   - Layout Paradigm: \`bento-grid\` with consistent grid gaps (20px to 32px), showcasing dynamic cards accented with colorful pink, purple, and blue borders, badges, and glows.

4. **Card Geometry, Elevation & Luminous Depth**:
   - Corner Radius: \`12px\`.
   - Internal Card Padding: \`28px 32px\`.
   - Elevation & Colored Shadows:
     \`box-shadow: 0 8px 32px rgba(11, 8, 22, 0.6), 0 0 0 1px rgba(168, 85, 247, 0.2) inset, 0 0 20px -5px rgba(236, 72, 153, 0.15)\`.
   - Card Hover Micro-interactions: Elevate card on hover with an intensified pink-purple-blue gradient border or glowing colored rim (\`box-shadow: 0 12px 36px rgba(168, 85, 247, 0.25), 0 0 0 1px rgba(236, 72, 153, 0.4) inset; transform: translateY(-2px); transition: all 0.25s ease;\`).

5. **Action Buttons, Badges & Form Controls**:
   - Primary Action Button: Luminous multi-color gradient button:
     \`background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 50%, #3b82f6 100%) !important; color: #ffffff !important; border-radius: 16px !important; padding: 10px 20px !important; font-weight: 600 !important; border: none !important; box-shadow: 0 4px 20px rgba(236, 72, 153, 0.35), 0 2px 10px rgba(139, 92, 246, 0.3) !important; transition: all 0.2s ease !important;\`
     Hover state: \`transform: translateY(-2px) scale(1.02); box-shadow: 0 6px 24px rgba(236, 72, 153, 0.5), 0 2px 14px rgba(59, 130, 246, 0.4) !important;\`
   - Secondary / Ghost Buttons:
     \`background: rgba(168, 85, 247, 0.12) !important; color: #fdf4ff !important; border: 1px solid rgba(168, 85, 247, 0.35) !important; border-radius: 16px !important; padding: 10px 20px !important;\`
   - Badges & Pills: Colorful pill tags with pink (\`background: rgba(236, 72, 153, 0.15); color: #f472b6; border: 1px solid rgba(236, 72, 153, 0.3);\`), purple (\`background: rgba(168, 85, 247, 0.15); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.3);\`), or blue (\`background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3);\`).

6. **Bespoke Human Craft & Anti-AI-Generated Discipline (MANDATORY)**:
   - MUST NOT look AI-generated: Avoid generic AI clichés, washed-out monochrome templates, or lazy unstyled layouts. Do NOT use fake marketing buzzword replacements—preserve the target page's real content, actual headlines, authentic navigation, and functional elements.
   - Refined Colorful Taste: The pink, purple, and blue palette must look intentional, premium, and artfully balanced. Use the rich tri-color palette throughout the interface—in buttons, active states, card borders, badge pills, icons, and subtle luminous ambient lighting—avoiding drab black-and-white layouts while ensuring WCAG AA text contrast and readability.
`
    }
  ],
  customPresets: [],
  presets: [],

  rebuildPresets() {
    this.presets = [...this.defaultPresets, ...this.customPresets];
  },

  async loadCustomPresets() {
    const key = 'designifyCustomPresets';
    let loaded = [];
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const res = await chrome.storage.local.get([key]);
        loaded = Array.isArray(res[key]) ? res[key] : [];
      } else {
        const raw = localStorage.getItem(key);
        loaded = raw ? JSON.parse(raw) : [];
      }
    } catch (e) {
      console.warn('[Likable HUD] Failed to load custom presets from storage:', e);
      try {
        const raw = localStorage.getItem(key);
        loaded = raw ? JSON.parse(raw) : [];
      } catch {}
    }

    // Automatically remove custom presets that duplicate default presets (Linear, Lovable)
    const cleaned = loaded.filter((p) => {
      const name = (p.name || p.label || '').toLowerCase().trim();
      const origin = (p.originUrl || p.url || '').toLowerCase();
      const id = (p.id || '').toLowerCase();
      const isLinear = name === 'linear' || id.startsWith('preset-linear') || origin.includes('linear.app');
      const isLovable = name === 'lovable' || id.startsWith('preset-lovable') || origin.includes('lovable.dev');
      return !isLinear && !isLovable;
    });

    if (cleaned.length !== loaded.length) {
      loaded = cleaned;
      try {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          await chrome.storage.local.set({ [key]: loaded });
        } else {
          localStorage.setItem(key, JSON.stringify(loaded));
        }
      } catch (e) {}
    }

    if (this.selectedTheme && (this.selectedTheme.startsWith('preset-linear') || this.selectedTheme.toLowerCase() === 'linear')) {
      this.selectedTheme = 'linear';
    } else if (this.selectedTheme && (this.selectedTheme.startsWith('preset-lovable') || this.selectedTheme.toLowerCase() === 'lovable')) {
      this.selectedTheme = 'lovable';
    }

    this.customPresets = loaded;
    this.rebuildPresets();
    return loaded;
  },

  async saveCustomPreset(preset) {
    if (!preset || !preset.id) return;
    const name = (preset.name || preset.label || '').toLowerCase().trim();
    const origin = (preset.originUrl || preset.url || '').toLowerCase();
    if (name === 'linear' || name === 'lovable' || origin.includes('linear.app') || origin.includes('lovable.dev')) {
      return;
    }
    const normalizeUrl = (u) => String(u || '').trim().toLowerCase().replace(/\/+$/, '');
    const presetTarget = normalizeUrl(preset.originUrl || preset.url);

    this.customPresets = this.customPresets.filter((p) => {
      const pUrl = normalizeUrl(p.originUrl || p.url);
      return p.id !== preset.id && pUrl !== presetTarget;
    });
    this.customPresets.unshift(preset);
    if (this.customPresets.length > 10) {
      this.customPresets = this.customPresets.slice(0, 10);
    }
    this.rebuildPresets();

    const key = 'designifyCustomPresets';
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.set({ [key]: this.customPresets });
      } else {
        localStorage.setItem(key, JSON.stringify(this.customPresets));
      }
    } catch (e) {
      try {
        localStorage.setItem(key, JSON.stringify(this.customPresets));
      } catch {}
    }
  },

  async deleteCustomPreset(presetId) {
    this.customPresets = this.customPresets.filter((p) => p.id !== presetId);
    this.rebuildPresets();
    if (this.selectedTheme === presetId) {
      this.selectedTheme = 'linear';
    }

    const key = 'designifyCustomPresets';
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.set({ [key]: this.customPresets });
      } else {
        localStorage.setItem(key, JSON.stringify(this.customPresets));
      }
    } catch (e) {
      try {
        localStorage.setItem(key, JSON.stringify(this.customPresets));
      } catch {}
    }
    this.render();
  },

  escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  show() {
    this.enabled = true;
    this.isOpen = true;
    if (this.hudContainer) this.hudContainer.style.display = 'block';
    if (this.miniFab) this.miniFab.style.display = 'flex';
    this.syncLauncher();
  },

  minimize() {
    this.isOpen = false;
    if (this.hudContainer) this.hudContainer.style.display = 'none';
    if (this.miniFab) this.miniFab.style.display = this.enabled ? 'flex' : 'none';
    this.syncLauncher();
  },

  setEnabled(enabled) {
    this.enabled = enabled;
    if (enabled) {
      this.show();
    } else {
      this.isOpen = false;
      if (this.hudContainer) this.hudContainer.style.display = 'none';
      if (this.miniFab) this.miniFab.style.display = 'none';
      const toast = document.getElementById('designify-hud-toast');
      if (toast) toast.className = '';
      this.syncLauncher();
    }
  },

  syncLauncher() {
    const button = this.miniFab?.querySelector('#designify-mini-fab-btn');
    if (!button) return;
    button.classList.toggle('active', this.isOpen);
    button.setAttribute('aria-expanded', String(this.isOpen));
    button.setAttribute('aria-label', this.isOpen ? 'Close Likable controls' : 'Open Likable controls');
  },

  showToast(message) {
    let toast = document.getElementById('designify-hud-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'designify-hud-toast';
      document.documentElement.appendChild(toast);
    }

    toast.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#248044" stroke-width="1.6">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      <span>${this.escapeHtml(message)}</span>
    `;
    toast.className = 'show';

    clearTimeout(this._toastTimeout);
    this._toastTimeout = setTimeout(() => {
      toast.className = '';
    }, 2400);
  },

  async handleCopyWebsite(copyBtn) {
    if (copyBtn && copyBtn.dataset.copying === 'true') return;
    if (copyBtn) copyBtn.dataset.copying = 'true';

    try {
      // 1. Copy website code to clipboard
      const { success, isRedesign } = await this.copyWebsiteCode();

      // 2. Extract design DNA (theme, layout, paddings, structures, radii, typography) and add to presets
      let extractedPreset = null;
      if (window.DesignifyIngester && typeof window.DesignifyIngester.extractDesignPreset === 'function') {
        try {
          extractedPreset = window.DesignifyIngester.extractDesignPreset();
          if (extractedPreset) {
            const rawName = (extractedPreset.name || '').toLowerCase();
            if (rawName === 'linear' || rawName === 'lovable') {
              this.selectedTheme = rawName;
            } else {
              await this.saveCustomPreset(extractedPreset);
              this.selectedTheme = extractedPreset.id;
            }
            this.render();
          }
        } catch (extractErr) {
          console.warn('[Likable] Failed to extract design preset:', extractErr);
        }
      }

      const textEl = copyBtn?.querySelector('.designify-dropdown-text, .designify-header-btn-text') || copyBtn;
      const iconEl = copyBtn?.querySelector('.designify-dropdown-icon');
      const originalText = textEl && textEl !== copyBtn ? textEl.textContent : (copyBtn?.textContent || 'Copy this website');

      if (success) {
        if (copyBtn) copyBtn.classList.add('success');
        const presetName = extractedPreset?.name || 'Website';
        if (textEl && textEl !== copyBtn) {
          textEl.textContent = 'Copied & saved preset!';
        }
        if (iconEl) {
          iconEl.innerHTML = '<polyline points="20 6 9 17 4 12"></polyline>';
          iconEl.setAttribute('stroke', '#248044');
        }

        const toastMsg = extractedPreset
          ? `Website copied & added "${presetName}" to presets!`
          : (isRedesign ? 'Redesigned website copied' : 'Website code copied');
        this.showToast(toastMsg);

        setTimeout(() => {
          if (copyBtn) {
            copyBtn.classList.remove('success');
            if (textEl && textEl !== copyBtn) textEl.textContent = originalText;
            if (iconEl) {
              iconEl.innerHTML = '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>';
              iconEl.removeAttribute('stroke');
            }
            copyBtn.dataset.copying = 'false';
          }

        }, 1500);
      } else {
        if (textEl && textEl !== copyBtn) textEl.textContent = 'Copy failed';
        setTimeout(() => {
          if (textEl && textEl !== copyBtn) textEl.textContent = originalText;
          if (copyBtn) copyBtn.dataset.copying = 'false';
        }, 1400);
      }
    } catch (err) {
      console.error('[Likable] Failed to copy website:', err);
      if (copyBtn) copyBtn.dataset.copying = 'false';
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
      const safeThemeName = this.escapeHtml(themeName || 'Likable Redesign');
      const safeSummary = this.escapeHtml(summary || '');
      codeToCopy = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Likable Redesign - ${safeThemeName}</title>
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
  <!-- Theme: ${safeThemeName} | ${safeSummary} -->
  ${html}
</body>
</html>`;
      isRedesign = true;
    } else {
      // Clean clone of the original page without Likable injected DOM elements
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
      console.warn('[Likable] navigator.clipboard failed, trying execCommand fallback:', e);
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
        console.error('[Likable] Copy fallback failed:', err);
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
    if (this._initPromise) return this._initPromise;
    this._initPromise = this.mount();
    return this._initPromise;
  },

  async mount() {
    if (window.DesignifyCache) {
      await window.DesignifyCache.loadDesigns();
      if (window.DesignifyCache.cachedList.length > 0) {
        this.hasGenerated = true;
      }
    }

    await this.loadCustomPresets();

    // Create Main HUD Root
    this.hudContainer = document.createElement('div');
    this.hudContainer.id = 'designify-hud-root';

    // One launcher opens the control panel directly.
    this.miniFab = document.createElement('div');
    this.miniFab.id = 'designify-mini-container';
    this.miniFab.style.display = 'none';
    this.miniFab.innerHTML = `
      <button id="designify-mini-fab-btn" class="designify-mini-fab-btn" title="Likable" aria-label="Open Likable controls" aria-expanded="false" aria-controls="designify-hud-root">
        <svg class="designify-launcher-mark" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="5"/><path d="M3 10h18M10 10v11"/>
        </svg>
        <svg class="designify-launcher-close" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg>
      </button>
    `;

    document.documentElement.appendChild(this.hudContainer);
    document.documentElement.appendChild(this.miniFab);

    this.render();
    this.bindEvents();
    this.setupRouteListener();
    this.setEnabled(true);
    console.log('[Likable HUD] Mounted successfully with progress system.');
  },

  /**
   * Renders the internal markup of the HUD card
   */
  render() {
    const presetButtons = this.presets.map((p) => {
      const isSelected = p.id === this.selectedTheme;
      const isCustom = !!p.isCustom;
      const safeId = this.escapeHtml(p.id);
      const safeLabel = this.escapeHtml(p.label || p.name);
      const titleAttr = p.description ? this.escapeHtml(p.description) : `${safeLabel} preset`;
      return `
        <button type="button" class="designify-preset-btn ${isSelected ? 'active' : ''} ${isCustom ? 'custom' : ''}" aria-pressed="${isSelected}" data-theme="${safeId}" title="${titleAttr}" ${this.isGenerating ? 'disabled' : ''}>
          <span class="designify-preset-dot designify-dot-${safeId}" aria-hidden="true"></span>
          <span class="designify-preset-label">${safeLabel}</span>
          ${isCustom ? `<span class="designify-preset-delete" data-delete-preset-id="${safeId}" title="Remove custom preset" aria-label="Delete ${safeLabel} preset">&times;</span>` : ''}
        </button>
      `;
    }).join('');

    // Cached designs switcher
    const cachedDesigns = window.DesignifyCache ? window.DesignifyCache.cachedList : [];
    const activeDesignId = window.DesignifyCache ? window.DesignifyCache.currentActiveId : null;

    let historySection = '';
    if (cachedDesigns.length > 0 && !this.isGenerating) {
      const designButtons = cachedDesigns.map((d, index) => {
        const isActive = d.id === activeDesignId;
        const number = cachedDesigns.length - index;
        const safeId = this.escapeHtml(d.id);
        const safeThemeName = this.escapeHtml(d.themeName || 'Untitled design');
        const safeSummary = this.escapeHtml(d.summary || safeThemeName);
        const safeTime = this.escapeHtml(d.timeFormatted || 'saved');
        const themeKey = (d.themeKey || '').toLowerCase();
        let dotClass = 'designify-dot-custom';
        if (themeKey === 'linear') dotClass = 'designify-dot-linear';
        else if (themeKey === 'apple') dotClass = 'designify-dot-apple';
        else if (themeKey === 'lovable') dotClass = 'designify-dot-lovable';

        const titleAttr = safeSummary ? `${safeSummary} (${safeTime})` : `#${number} ${safeThemeName} (${safeTime})`;
        return `
          <button type="button" class="designify-preset-btn designify-design-btn ${isActive ? 'active' : ''}" aria-pressed="${isActive}" data-design-id="${safeId}" title="${titleAttr}">
            <span class="designify-preset-dot ${dotClass}" aria-hidden="true"></span>
            <span class="designify-preset-label">#${number} ${safeThemeName}</span>
            <span class="designify-preset-delete" data-delete-design-id="${safeId}" data-delete-id="${safeId}" title="Remove this design" aria-label="Delete design #${number}">&times;</span>
          </button>
        `;
      }).join('');

      historySection = `
        <div class="designify-field-heading"><span>Designs</span><span class="designify-field-hint">${cachedDesigns.length} saved</span></div>
        <div class="designify-presets designify-designs-grid">
          <button type="button" class="designify-preset-btn designify-design-btn ${activeDesignId === 'original' ? 'active' : ''}" aria-pressed="${activeDesignId === 'original'}" data-design-id="original" title="View original website">
            <span class="designify-preset-dot designify-dot-original" aria-hidden="true"></span>
            <span class="designify-preset-label">Original</span>
          </button>
          ${designButtons}
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
      <section class="designify-hud-card" aria-label="Likable controls">
        <!-- Header -->
        <div class="designify-hud-header">
          <div class="designify-hud-brand">
            <span class="designify-panel-mark" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="5"/><path d="M3 10h18M10 10v11"/></svg></span>
            <div>Likable<span class="designify-panel-subtitle">A new look for this page</span></div>
          </div>
          <div class="designify-hud-actions">
            <!-- Minimize Button -->
            <button class="designify-close-btn" id="designify-minimize-btn" title="Minimize to icon" aria-label="Minimize design studio">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- History Switcher Bar (Appears when designs are cached) -->
        ${historySection}

        <!-- Live Generation Progress Bar -->
        ${progressBlock}

        <div class="designify-field-heading"><span>Style</span><span class="designify-field-hint">Choose a starting point</span></div>
        <div class="designify-presets">
          ${presetButtons}
        </div>
        <div class="designify-model-row">
          <span class="designify-field-label">Create with</span>
          <div class="designify-engine-toggle" role="group" aria-label="AI provider">
            <button class="designify-engine-btn ${this.selectedEngine === 'claude' ? 'active' : ''}" aria-pressed="${this.selectedEngine === 'claude'}" data-engine="claude" ${this.isGenerating ? 'disabled' : ''}>Claude</button>
            <button class="designify-engine-btn ${this.selectedEngine === 'codex' ? 'active' : ''}" aria-pressed="${this.selectedEngine === 'codex'}" data-engine="codex" ${this.isGenerating ? 'disabled' : ''}>Codex</button>
          </div>
        </div>
        <label for="designify-custom-prompt" class="designify-field-heading">Your direction <span class="designify-field-hint">Optional</span></label>
        <!-- Prompt and Redesign Action Bar -->
        <div class="designify-hud-main-bar">
          <textarea id="designify-custom-prompt" class="designify-prompt-input" rows="3" placeholder="Softer colors, more breathing room…" ${this.isGenerating ? 'disabled' : ''}>${this.escapeHtml(this.customPrompt)}</textarea>
          <button id="designify-generate-btn" class="designify-trigger-btn" ${this.isGenerating ? 'disabled' : ''}>
            ${this.isGenerating ? '<div class="designify-spinner"></div> Designing…' : `
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14m-6-6 6 6-6 6"/>
              </svg>
              Redesign page
            `}
          </button>
        </div>

        <!-- Secondary Inspection & Export Bar (shows after generation or when designs exist) -->
        <div class="designify-hud-secondary-bar" id="designify-secondary-bar" style="display: ${this.hasGenerated && !this.isGenerating ? 'flex' : 'none'};">
          <div class="designify-control-group">
            <button id="designify-split-btn" class="designify-btn-sm ${window.DesignifyOverlay?.isSplitActive ? 'active' : ''}" aria-pressed="${!!window.DesignifyOverlay?.isSplitActive}" title="Toggle side-by-side comparison slider">
              Compare
            </button>

            <div class="designify-slider-container" title="Adjust redesign opacity">
              <span>Opacity</span>
              <input type="range" id="designify-opacity-slider" class="designify-slider" aria-label="Redesign opacity" min="0" max="100" value="${Math.round((window.DesignifyOverlay?.currentOpacity ?? 1) * 100)}" />
            </div>

            <button id="designify-export-btn" class="designify-btn-sm" title="Download standalone redesigned HTML/CSS">
              Export
            </button>

          </div>

          <div class="designify-hint">
            ${activeDesignId === 'original' ? '<span style="color: #0066cc;">Viewing original</span>' : 'Hold <span class="designify-kbd">Space</span> to peek at original'}
          </div>
        </div>
        <div class="designify-panel-footer">
          <button id="designify-copy-website-btn" class="designify-copy-btn" ${this.isGenerating ? 'disabled' : ''}>
            <svg class="designify-dropdown-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/></svg>
            <span class="designify-dropdown-text">Copy page & style</span>
          </button>
          <span class="designify-footer-note">Preview on this page</span>
        </div>
      </section>
    `;
  },

  /**
   * Binds click and input handlers for the HUD
   */
  bindEvents() {
    this.hudContainer.addEventListener('click', async (e) => {
      if (e.target.closest('#designify-minimize-btn')) {
        this.minimize();
        return;
      }
      if (this.isGenerating) return;
      const copyButton = e.target.closest('#designify-copy-website-btn');
      if (copyButton) {
        await this.handleCopyWebsite(copyButton);
        return;
      }

      // 1. Saved Design Switching and Deletion
      const deleteDesignBtn = e.target.closest('[data-delete-design-id]') || e.target.closest('.designify-chip-delete');
      if (deleteDesignBtn) {
        e.stopPropagation();
        const deleteId = deleteDesignBtn.dataset.deleteDesignId || deleteDesignBtn.dataset.deleteId;
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
          if (window.DesignifyCache.cachedList.length === 0) {
            this.hasGenerated = false;
          }
          this.render();
        }
        return;
      }

      const designBtn = e.target.closest('.designify-design-btn') || e.target.closest('.designify-history-chip');
      if (designBtn) {
        const designId = designBtn.dataset.designId;
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

      // 2. Preset buttons & custom preset removal
      const deletePresetBtn = e.target.closest('.designify-preset-delete[data-delete-preset-id]');
      if (deletePresetBtn) {
        e.stopPropagation();
        const presetId = deletePresetBtn.dataset.deletePresetId;
        if (presetId) {
          await this.deleteCustomPreset(presetId);
        }
        return;
      }

      const presetBtn = e.target.closest('.designify-preset-btn[data-theme]');
      if (presetBtn) {
        this.selectedTheme = presetBtn.dataset.theme;
        this.hudContainer.querySelectorAll('.designify-preset-btn[data-theme]').forEach((b) => {
          b.classList.remove('active');
          b.setAttribute('aria-pressed', 'false');
        });
        presetBtn.classList.add('active');
        presetBtn.setAttribute('aria-pressed', 'true');
        return;
      }

      // Copy page buttons in HUD
      // 3. Engine toggle
      const engineBtn = e.target.closest('.designify-engine-btn');
      if (engineBtn) {
        this.selectedEngine = engineBtn.dataset.engine;
        this.hudContainer.querySelectorAll('.designify-engine-btn').forEach((b) => {
          b.classList.remove('active');
          b.setAttribute('aria-pressed', 'false');
        });
        engineBtn.classList.add('active');
        engineBtn.setAttribute('aria-pressed', 'true');
      }

      // 5. Generate button
      if (e.target.closest('#designify-generate-btn') && !this.isGenerating) {
        this.handleGenerate();
      }

      // 6. Split slider toggle
      if (e.target.closest('#designify-split-btn')) {
        const btn = this.hudContainer.querySelector('#designify-split-btn');
        const isActive = !window.DesignifyOverlay.isSplitActive;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-pressed', String(isActive));
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
        this.render();
      }

      // 7. Export button
      if (e.target.closest('#designify-export-btn')) {
        window.DesignifyOverlay.exportCode();
      }
    });

    // Opacity slider
    this.hudContainer.addEventListener('input', (e) => {
      if (e.target.id === 'designify-custom-prompt') this.customPrompt = e.target.value;
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
        this.hudContainer.querySelector('#designify-opacity-slider').value = String(Math.round(val * 100));
      }
    });

    // Enter in prompt input triggers redesign
    this.hudContainer.addEventListener('keydown', (e) => {
      if (e.target.id === 'designify-custom-prompt' && e.key === 'Enter' && !e.shiftKey && !this.isGenerating) {
        e.preventDefault();
        this.handleGenerate();
      }
    });

    this.miniFab.querySelector('#designify-mini-fab-btn').addEventListener('click', () => {
      if (this.isOpen) this.minimize();
      else {
        this.show();
        this.hudContainer.querySelector('#designify-custom-prompt')?.focus();
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.minimize();
        this.miniFab.querySelector('#designify-mini-fab-btn')?.focus();
      }
    });
  },

  /**
   * Listens for route and URL changes in SPAs and reloads designs for the active total URL
   */
  setupRouteListener() {
    if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;
    if (this._routeListenerBound) return;
    this._routeListenerBound = true;

    let lastUrl = (window.location && window.location.href) || '';

    const handleRouteChange = async () => {
      const currentUrl = (window.location && window.location.href) || '';
      if (currentUrl === lastUrl) return;
      lastUrl = currentUrl;
      console.log(`[Likable] Route changed to: ${currentUrl}`);

      if (window.DesignifyCache && typeof window.DesignifyCache.loadDesigns === 'function') {
        await window.DesignifyCache.loadDesigns(currentUrl);
      }

      if (window.DesignifyOverlay) {
        const activeDesign = window.DesignifyCache?.getDesignById
          ? window.DesignifyCache.getDesignById(window.DesignifyCache.currentActiveId)
          : null;
        if (activeDesign && typeof window.DesignifyOverlay.render === 'function') {
          window.DesignifyOverlay.render({
            html: activeDesign.html,
            css: activeDesign.css,
            summary: activeDesign.summary,
            themeName: activeDesign.themeName
          });
          if (typeof window.DesignifyOverlay.toggleVisibility === 'function') {
            window.DesignifyOverlay.toggleVisibility(true);
          }
        } else {
          if (typeof window.DesignifyOverlay.toggleVisibility === 'function') {
            window.DesignifyOverlay.toggleVisibility(false);
          }
          if (window.DesignifyCache) {
            window.DesignifyCache.currentActiveId = 'original';
          }
        }
      }

      this.hasGenerated = (window.DesignifyCache?.cachedList?.length || 0) > 0;
      this.render();
    };

    window.addEventListener('popstate', handleRouteChange);
    window.addEventListener('hashchange', handleRouteChange);

    if (typeof history !== 'undefined') {
      const origPushState = history.pushState;
      if (typeof origPushState === 'function' && !origPushState.__likablePatched && !origPushState.__likeablePatched) {
        history.pushState = function (...args) {
          const res = origPushState.apply(this, args);
          try { window.dispatchEvent(new Event('likable:routechange')); } catch {}
          try { window.dispatchEvent(new Event('likeable:routechange')); } catch {}
          return res;
        };
        history.pushState.__likablePatched = true;
        history.pushState.__likeablePatched = true;
      }

      const origReplaceState = history.replaceState;
      if (typeof origReplaceState === 'function' && !origReplaceState.__likablePatched && !origReplaceState.__likeablePatched) {
        history.replaceState = function (...args) {
          const res = origReplaceState.apply(this, args);
          try { window.dispatchEvent(new Event('likable:routechange')); } catch {}
          try { window.dispatchEvent(new Event('likeable:routechange')); } catch {}
          return res;
        };
        history.replaceState.__likablePatched = true;
        history.replaceState.__likeablePatched = true;
      }
    }

    window.addEventListener('likable:routechange', () => {
      setTimeout(handleRouteChange, 50);
    });
    window.addEventListener('likeable:routechange', () => {
      setTimeout(handleRouteChange, 50);
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

      this.updateProgress(100, 'Redesign complete', 'Applying final polish and event listeners');
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

window.DesignifyHUD.rebuildPresets();
window.LikableHUD = window.LikeableHUD = window.DesignifyHUD;
