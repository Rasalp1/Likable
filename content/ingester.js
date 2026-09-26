/**
 * Designify - DOM Ingester & Mirror ID Tagger
 * Scans the active webpage, assigns persistent data-mirror-id attributes,
 * and extracts a clean semantic tree for AI redesign synthesis.
 */

window.DesignifyIngester = {
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

    console.log(`[Designify Ingester] Tagged ${this.mirrorCounter} semantic & interactive elements.`);
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
  }
};
