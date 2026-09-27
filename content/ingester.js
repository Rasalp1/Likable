/**
 * Likable - DOM Ingester & Mirror ID Tagger
 * Scans the active webpage, assigns persistent data-mirror-id attributes,
 * and extracts a clean semantic tree for AI redesign synthesis.
 */

window.LikableIngester = window.LikeableIngester = window.DesignifyIngester =
  window.LikableIngester || window.LikeableIngester || window.DesignifyIngester || {
  mirrorCounter: 0,

  /**
   * Resets and assigns data-mirror-id attributes to all key interactive & structural nodes
   */
  tagElements() {
    this.mirrorCounter = 0;
    const elementsToTag = document.querySelectorAll(
      'header, nav, main, section, footer, article, aside, ' +
      'h1, h2, h3, h4, h5, h6, ' +
      'a, button, input, textarea, select, form, ' +
      '[role="button"], [role="search"], [role="navigation"], ' +
      'img, figure, .card, .container'
    );

    elementsToTag.forEach((el) => {
      // Don't tag elements inside our own HUD or overlay
      if (el.closest('#designify-hud-root') || el.closest('#designify-overlay-root')) {
        return;
      }

      if (!el.getAttribute('data-mirror-id')) {
        this.mirrorCounter += 1;
        el.setAttribute('data-mirror-id', `d-${this.mirrorCounter}`);
      }
    });

    console.log(`[Likable Ingester] Tagged ${this.mirrorCounter} semantic & interactive elements.`);
  },

  /**
   * Extracts clean semantic skeleton of the page
   */
  extractPageData() {
    this.tagElements();

    const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute('content') ||
                     document.querySelector('meta[property="og:description"]')?.getAttribute('content') || '';

    // Extract computed styling palette cues
    const bodyStyle = window.getComputedStyle(document.body);
    const primaryFont = bodyStyle.fontFamily.split(',')[0].replace(/['"]/g, '').trim();

    const taggedNodes = document.querySelectorAll('[data-mirror-id]');
    const domTree = [];

    taggedNodes.forEach((el) => {
      // Ignore hidden or zero-size elements
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
        return;
      }

      const mirrorId = el.getAttribute('data-mirror-id');
      const tag = el.tagName.toLowerCase();
      const text = el.innerText ? el.innerText.trim().slice(0, 150) : '';

      const nodeData = {
        mirrorId,
        tag,
        text
      };

      // Add relevant attributes for interactive elements
      if (tag === 'a') {
        nodeData.href = el.getAttribute('href') || '#';
      }
      if (tag === 'input' || tag === 'textarea') {
        const inputType = (el.getAttribute('type') || 'text').toLowerCase();
        nodeData.type = inputType;
        nodeData.placeholder = el.getAttribute('placeholder') || '';

        // Security & Privacy: STRICTLY guard against harvesting passwords or credentials
        const nameAttr = (el.name || '').toLowerCase();
        const idAttr = (el.id || '').toLowerCase();
        const autoAttr = (el.getAttribute('autocomplete') || '').toLowerCase();

        const isSensitive = [
          'password', 'hidden', 'file'
        ].includes(inputType) ||
        /pass|pwd|secret|token|auth|key|credit|card|cvv|cvc|ssn|pin/i.test(nameAttr) ||
        /pass|pwd|secret|token|auth|key|credit|card|cvv|cvc|ssn|pin/i.test(idAttr) ||
        /pass|credit|card|cvv|cvc|ssn|pin/i.test(autoAttr);

        if (!isSensitive) {
          // Truncate non-sensitive prefilled values to avoid leaking personal data
          nodeData.value = el.value ? el.value.trim().slice(0, 50) : '';
        }
      }
      if (tag === 'img') {
        nodeData.src = el.getAttribute('src') || '';
        nodeData.alt = el.getAttribute('alt') || '';
      }
      if (tag === 'button' || el.getAttribute('role') === 'button') {
        nodeData.isInteractive = true;
      }

      // Add parent reference if parent has a mirror ID
      const parentTagged = el.parentElement?.closest('[data-mirror-id]');
      if (parentTagged) {
        nodeData.parentMirrorId = parentTagged.getAttribute('data-mirror-id');
      }

      domTree.push(nodeData);
    });

    // Limit domTree size to avoid token overflow (max 200 high-priority nodes)
    const prioritizedTree = domTree
      .sort((a, b) => {
        // Prioritize interactive inputs and buttons, then headers and nav
        const scoreA = (a.isInteractive || a.tag === 'input' || a.tag === 'button') ? 10 : (a.tag.startsWith('h') ? 5 : 1);
        const scoreB = (b.isInteractive || b.tag === 'input' || b.tag === 'button') ? 10 : (b.tag.startsWith('h') ? 5 : 1);
        return scoreB - scoreA;
      })
      .slice(0, 200);

    return {
      url: window.location.href,
      title: document.title,
      metaDescription: metaDesc,
      computedFont: primaryFont,
      domTree: prioritizedTree
    };
  },

  /**
   * Helper: Parse rgb/rgba string into { r, g, b, a }
   */
  _parseRgba(str) {
    if (!str || typeof str !== 'string') return null;
    const match = str.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/i);
    if (!match) return null;
    return {
      r: parseInt(match[1], 10),
      g: parseInt(match[2], 10),
      b: parseInt(match[3], 10),
      a: match[4] !== undefined ? parseFloat(match[4]) : 1
    };
  },

  /**
   * Helper: Relative luminance calculation for dark/light detection
   */
  _getLuminance(r, g, b) {
    const a = [r, g, b].map((v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  },

  /**
   * Helper: Convert RGB numbers to Hex string
   */
  _rgbToHex(r, g, b) {
    return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
  },

  /**
   * Helper: Statistical Mode (most frequent non-empty item in an array)
   */
  _findMode(arr, fallback = '') {
    if (!arr || arr.length === 0) return fallback;
    const counts = {};
    let maxCount = 0;
    let modeVal = fallback;
    for (const item of arr) {
      if (!item || item === 'none' || item === '0px' || item === 'rgba(0, 0, 0, 0)' || item === 'transparent') continue;
      counts[item] = (counts[item] || 0) + 1;
      if (counts[item] > maxCount) {
        maxCount = counts[item];
        modeVal = item;
      }
    }
    return modeVal || fallback;
  },

  /**
   * Comprehensive Design System Extractor:
   * Extracts theme, palette, layout rhythm, container max-widths, card paddings,
   * border radii, typography scale, and elevation to form a complete reusable preset.
   */
  extractDesignPreset() {
    const totalUrl = (
      (typeof window !== 'undefined' && window.location && (window.location.href || window.location.origin)) || ''
    ).trim();

    // 1. Detect Clean Brand / Website Name & Route Context
    let siteName = '';
    const rawTitle = (document.title || '').trim();
    if (rawTitle) {
      const parts = rawTitle.split(/\s*[-–—|·:•]\s*/);
      if (parts[0] && parts[0].length >= 2 && !/^(home|index|welcome|login|sign in|untitled|dashboard)$/i.test(parts[0])) {
        siteName = parts[0].trim();
      } else if (parts[1] && parts[1].length >= 2) {
        siteName = parts[1].trim();
      }
    }
    if (!siteName || siteName.length > 20) {
      try {
        const host = (window.location?.hostname || '').replace(/^www\./i, '');
        const namePart = host.split('.')[0] || 'Custom';
        siteName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
      } catch {
        siteName = 'Custom';
      }
    }
    siteName = siteName.replace(/[^\w\s-]/g, '').trim().slice(0, 24) || 'Custom';

    let routeSuffix = '';
    try {
      if (typeof window !== 'undefined' && window.location && window.location.pathname) {
        const cleaned = window.location.pathname.replace(/^\/+|\/+$/g, '');
        if (cleaned) {
          const segments = cleaned.split('/');
          const lastSeg = segments[segments.length - 1];
          if (lastSeg && !siteName.toLowerCase().includes(lastSeg.toLowerCase())) {
            const formatted = lastSeg.charAt(0).toUpperCase() + lastSeg.slice(1).replace(/[-_]/g, ' ');
            if (formatted.length <= 16) {
              routeSuffix = formatted;
            }
          }
        }
      }
    } catch {}

    const presetLabel = routeSuffix && !siteName.includes(routeSuffix) && (siteName.length + routeSuffix.length < 22)
      ? `${siteName} (${routeSuffix})`
      : siteName;

    // 2. Canvas Background & Dark/Light Mode Detection
    let canvasBg = '#0d0e12';
    let isDark = true;
    const rootCandidates = [document.body, document.documentElement, document.querySelector('main, #root, #app, #__next')].filter(Boolean);
    for (const el of rootCandidates) {
      const bg = window.getComputedStyle(el).backgroundColor;
      const parsed = this._parseRgba(bg);
      if (parsed && parsed.a > 0.5) {
        const lum = this._getLuminance(parsed.r, parsed.g, parsed.b);
        isDark = lum < 0.35;
        canvasBg = this._rgbToHex(parsed.r, parsed.g, parsed.b);
        break;
      }
    }

    // 3. Card & Surface Extraction (Geometry, Padding, Border, Shadow)
    const cardNodes = Array.from(document.querySelectorAll(
      'article, .card, [class*="card"], [class*="container"] > div, section > div, [role="region"] > div'
    )).filter((el) => {
      if (el.closest('#designify-hud-root') || el.closest('#designify-overlay-root')) return false;
      const rect = el.getBoundingClientRect();
      return rect.width >= 120 && rect.height >= 80;
    });

    const cardStyles = cardNodes.map((el) => window.getComputedStyle(el));

    // Card Radii
    const cardRadii = cardStyles.map((s) => s.borderRadius).filter((r) => r && r !== '0px');
    const cardRadius = this._findMode(cardRadii, isDark ? '12px' : '16px');

    // Card Paddings
    const cardPaddings = cardStyles.map((s) => `${s.paddingTop} ${s.paddingRight}`).filter((p) => p && !p.startsWith('0px'));
    const cardPadding = this._findMode(cardPaddings, '24px 28px');

    // Card Elevation & Shadows
    const cardShadows = cardStyles.map((s) => s.boxShadow).filter((s) => s && s !== 'none');
    const cardShadow = this._findMode(cardShadows, isDark ? '0 1px 3px rgba(0, 0, 0, 0.3)' : '0 4px 24px rgba(0, 0, 0, 0.06)');

    // Card Hairline Borders
    const cardBorders = cardStyles.map((s) => {
      if (s.borderWidth && s.borderWidth !== '0px' && s.borderStyle !== 'none') {
        return `${s.borderWidth} ${s.borderStyle} ${s.borderColor}`;
      }
      return null;
    }).filter(Boolean);
    const cardBorder = this._findMode(cardBorders, isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.08)');

    // Surface Background
    const cardBgs = cardStyles.map((s) => s.backgroundColor).filter((bg) => {
      const parsed = this._parseRgba(bg);
      return parsed && parsed.a > 0.05 && bg !== canvasBg;
    });
    const surface = this._findMode(cardBgs, isDark ? 'rgba(255, 255, 255, 0.05)' : '#ffffff');
    const surfaceHover = isDark ? 'rgba(255, 255, 255, 0.09)' : '#f8fafc';

    // Frosted Glass (backdrop-filter)
    const blurFilters = cardStyles.map((s) => s.backdropFilter).filter((bf) => bf && bf !== 'none' && bf.includes('blur'));
    const navHeader = document.querySelector('header, nav');
    const navBlur = navHeader ? window.getComputedStyle(navHeader).backdropFilter : 'none';
    const backdropFilter = blurFilters[0] || (navBlur && navBlur !== 'none' ? navBlur : 'none');

    // 4. Buttons & Interactive Controls (CTA Accent, Radius, Padding, Shadow)
    const buttonNodes = Array.from(document.querySelectorAll(
      'button, a[role="button"], [class*="btn"], [class*="button"], input[type="submit"]'
    )).filter((el) => {
      if (el.closest('#designify-hud-root') || el.closest('#designify-overlay-root')) return false;
      const rect = el.getBoundingClientRect();
      return rect.width >= 40 && rect.height >= 24;
    });

    const buttonStyles = buttonNodes.map((el) => window.getComputedStyle(el));
    const btnRadii = buttonStyles.map((s) => s.borderRadius).filter((r) => r && r !== '0px');
    const buttonRadius = this._findMode(btnRadii, '8px');

    const btnPaddings = buttonStyles.map((s) => `${s.paddingTop} ${s.paddingRight}`).filter((p) => p && !p.startsWith('0px'));
    const buttonPadding = this._findMode(btnPaddings, '10px 20px');

    const btnWeights = buttonStyles.map((s) => s.fontWeight).filter((w) => w && w !== '400');
    const buttonFontWeight = this._findMode(btnWeights, '600');

    // Accent Color: Identify saturated primary action color
    let accent = isDark ? '#6366f1' : '#0071e3';
    for (const s of buttonStyles) {
      const parsed = this._parseRgba(s.backgroundColor);
      if (parsed && parsed.a > 0.5) {
        const max = Math.max(parsed.r, parsed.g, parsed.b);
        const min = Math.min(parsed.r, parsed.g, parsed.b);
        const saturation = max === 0 ? 0 : (max - min) / max;
        if (saturation > 0.25) {
          accent = this._rgbToHex(parsed.r, parsed.g, parsed.b);
          break;
        }
      }
    }
    const accentR = parseInt(accent.slice(1, 3), 16) || 99;
    const accentG = parseInt(accent.slice(3, 5), 16) || 102;
    const accentB = parseInt(accent.slice(5, 7), 16) || 241;
    const accentGlow = `rgba(${accentR}, ${accentG}, ${accentB}, 0.2)`;

    // 5. Typography Hierarchy & Tracking
    const headings = Array.from(document.querySelectorAll('h1, h2, h3')).filter((el) => {
      return !el.closest('#designify-hud-root') && !el.closest('#designify-overlay-root');
    });
    const h1 = headings.find((h) => h.tagName.toLowerCase() === 'h1') || headings[0];
    const hStyle = h1 ? window.getComputedStyle(h1) : null;
    const bodyStyle = window.getComputedStyle(document.body);

    const headingFont = hStyle ? hStyle.fontFamily.split(',')[0].replace(/['"]/g, '').trim() : 'Inter';
    const bodyFont = bodyStyle.fontFamily.split(',')[0].replace(/['"]/g, '').trim() || headingFont;
    const headingWeight = hStyle ? hStyle.fontWeight : '700';
    const headingTracking = hStyle && hStyle.letterSpacing !== 'normal' ? hStyle.letterSpacing : '-0.025em';
    const headingLineHeight = hStyle ? hStyle.lineHeight : '1.15';
    const bodyLineHeight = bodyStyle ? bodyStyle.lineHeight : '1.6';

    const textPrimary = hStyle ? hStyle.color : (isDark ? '#f8fafc' : '#1d1d1f');
    const pSample = document.querySelector('p');
    const textSecondary = pSample ? window.getComputedStyle(pSample).color : (isDark ? '#94a3b8' : '#64748b');

    // 6. Layout Rhythm & Structure (Container Max-Width & Section Rhythm)
    const containerNodes = Array.from(document.querySelectorAll(
      'header, main, section, [class*="container"], [class*="wrap"], [class*="content"]'
    )).filter((el) => !el.closest('#designify-hud-root') && !el.closest('#designify-overlay-root'));

    const maxWs = containerNodes.map((el) => {
      const s = window.getComputedStyle(el);
      if (s.maxWidth && s.maxWidth !== 'none' && s.maxWidth.endsWith('px')) {
        return parseInt(s.maxWidth, 10);
      }
      const rect = el.getBoundingClientRect();
      if (rect.width >= 700 && rect.width <= 1600) {
        return Math.round(rect.width / 40) * 40;
      }
      return null;
    }).filter(Boolean);

    let containerMaxWidth = '1200px';
    if (maxWs.length > 0) {
      containerMaxWidth = this._findMode(maxWs.map((w) => `${w}px`), '1200px');
    }

    const sectionNodes = Array.from(document.querySelectorAll('section, article, main > div')).filter((el) => {
      return !el.closest('#designify-hud-root') && !el.closest('#designify-overlay-root') && el.getBoundingClientRect().height > 80;
    });

    const sectionPaddings = sectionNodes.map((s) => {
      const style = window.getComputedStyle(s);
      const pt = parseInt(style.paddingTop, 10) || 0;
      const pb = parseInt(style.paddingBottom, 10) || 0;
      const avg = Math.round((pt + pb) / 2);
      return avg >= 32 ? `${avg}px` : null;
    }).filter(Boolean);

    const sectionSpacingY = this._findMode(sectionPaddings, isDark ? '80px' : '96px');

    let layoutStructure = 'bento-grid';
    const gridElements = document.querySelectorAll('[style*="grid"], [class*="grid"]');
    if (gridElements.length >= 2) {
      layoutStructure = 'bento-grid';
    } else if (document.querySelector('aside, [role="complementary"]')) {
      layoutStructure = 'sidebar-content';
    } else {
      layoutStructure = 'structured-sections';
    }

    // 7. Synthesized Mandate Document
    const mandate = `
### ${siteName}-INSPIRED DESIGN SYSTEM GUIDANCE:
The user selected an independent preset derived from visual tokens observed at ${totalUrl}.
Use these tokens as a starting point. Do not copy logos, proprietary assets, text, or distinctive trade dress:
1. **${isDark ? 'Dark Mode' : 'Light Mode'} Atmosphere & Canvas**:
   - Canvas Background: \`${canvasBg}\`.
   - Card Surfaces: \`${surface}\` with border \`${cardBorder}\`.
   - Text Hierarchy: High-contrast primary \`${textPrimary}\`, muted secondary \`${textSecondary}\`.
2. **Layout Rhythm & Spatial Structure**:
   - Container Max-Width: \`${containerMaxWidth}\` centered with auto margins.
   - Section Vertical Spacing: \`${sectionSpacingY}\` padding between major sections.
   - Layout Paradigm: \`${layoutStructure}\` with consistent grid gaps (20px to 32px).
3. **Card Geometry & Elevation**:
   - Corner Radius: \`${cardRadius}\`.
   - Internal Card Padding: \`${cardPadding}\`.
   - Shadows: \`${cardShadow}\`.
   ${backdropFilter !== 'none' ? `- Frosted Glass: \`backdrop-filter: ${backdropFilter}; -webkit-backdrop-filter: ${backdropFilter};\`.` : ''}
4. **Typography & Tracking**:
   - Headings: \`font-family: "${headingFont}", -apple-system, sans-serif;\`, \`font-weight: ${headingWeight}\`, \`letter-spacing: ${headingTracking}\`, \`line-height: ${headingLineHeight}\`.
   - Body Copy: \`font-family: "${bodyFont}", -apple-system, sans-serif;\`, \`line-height: ${bodyLineHeight}\`.
5. **Action Buttons & Form Controls**:
   - Primary Action Button: \`background: ${accent} !important; border-radius: ${buttonRadius} !important; padding: ${buttonPadding} !important; font-weight: ${buttonFontWeight} !important;\`
   - Micro-interaction: Snappy hover transition (\`transform: translateY(-1px); transition: all 0.2s ease;\`).
6. **Bespoke Human Craft & Anti-AI-Generated Discipline (MANDATORY)**:
   - MUST NOT look AI-generated: Strictly avoid generic AI clichés, giant blurry purple/neon gradient spheres, floating glowing halo blobs, and cookie-cutter SaaS layouts.
   - Product-specific structure: Preserve the target page's content, real headlines, real navigation, and domain-specific layout density instead of replacing them with generic marketing placeholders.
   - Restrained physical depth: Use precise hairline borders (\`${cardBorder}\`) and authentic layered shadows (\`${cardShadow}\`) rather than tacky glowing outlines or AI slop gradients.
`;

    const routeSlug = routeSuffix ? `-${routeSuffix.toLowerCase().replace(/[^a-z0-9]/g, '')}` : '';
    const presetId = `preset-${siteName.toLowerCase().replace(/[^a-z0-9]/g, '')}${routeSlug}-${Date.now().toString(36)}`;

    return {
      id: presetId,
      label: presetLabel,
      name: siteName,
      isCustom: true,
      originUrl: totalUrl,
      url: totalUrl,
      createdAt: Date.now(),
      description: `Independent preset inspired by observed styles at ${presetLabel} (${totalUrl}): ${isDark ? 'dark' : 'light'} canvas, ${cardRadius} card radii, ${headingFont} typography.`,
      palette: {
        background: canvasBg,
        surface,
        surfaceHover,
        border: cardBorder,
        textPrimary,
        textSecondary,
        accent,
        accentGlow
      },
      layout: {
        containerMaxWidth,
        sectionSpacingY,
        layoutStructure
      },
      geometry: {
        cardRadius,
        buttonRadius
      },
      padding: {
        cardPadding,
        buttonPadding,
        sectionSpacingY
      },
      elevation: {
        cardShadow,
        cardBorder,
        backdropFilter
      },
      typography: {
        headingFont,
        bodyFont,
        headingWeight,
        headingTracking
      },
      mandate
    };
  }
};
window.LikableIngester = window.LikeableIngester = window.DesignifyIngester;
