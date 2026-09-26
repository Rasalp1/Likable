/**
 * Prompt engineering templates for Designify AI Redesign Engine
 */

export const THEME_PRESETS = {
  'linear-dark': {
    name: 'Linear Dark',
    description: 'Sleek, dark graphite aesthetic inspired by Linear and Raycast. Subtle borders, high-contrast typography, violet & indigo glow accents, crisp micro-interactions.',
    palette: {
      background: '#0d0e12',
      surface: 'rgba(255, 255, 255, 0.04)',
      surfaceHover: 'rgba(255, 255, 255, 0.08)',
      border: 'rgba(255, 255, 255, 0.08)',
      textPrimary: '#f3f4f6',
      textSecondary: '#9ca3af',
      accent: '#6366f1',
      accentGlow: 'rgba(99, 102, 241, 0.25)'
    }
  },
  'apple-modern': {
    name: 'Apple Modern Clean',
    description: 'Minimalist, hyper-clean design inspired by Apple. Generous whitespace, refined sans-serif typography, subtle frosted glass headers, elegant drop shadows, and subtle primary accents.',
    palette: {
      background: '#fafafa',
      surface: '#ffffff',
      surfaceHover: '#f5f5f7',
      border: 'rgba(0, 0, 0, 0.06)',
      textPrimary: '#1d1d1f',
      textSecondary: '#86868b',
      accent: '#0071e3',
      accentGlow: 'rgba(0, 113, 227, 0.15)'
    }
  },
  'glassmorphism': {
    name: 'Glassmorphism Neon',
    description: 'Vibrant futuristic aesthetic featuring multi-layered translucent glass, mesh gradients, backdrop blurs, and neon cyan/magenta rim lighting.',
    palette: {
      background: '#080914',
      surface: 'rgba(255, 255, 255, 0.07)',
      surfaceHover: 'rgba(255, 255, 255, 0.12)',
      border: 'rgba(255, 255, 255, 0.15)',
      textPrimary: '#ffffff',
      textSecondary: '#a5b4fc',
      accent: '#06b6d4',
      accentGlow: 'rgba(6, 182, 212, 0.35)'
    }
  },
  'bento-grid': {
    name: 'Bento Grid SaaS',
    description: 'Modern modular grid layout inspired by high-converting modern SaaS product pages. Asymmetric rounded cards, rich badges, subtle shadows, and crisp typography.',
    palette: {
      background: '#0b0f17',
      surface: '#111827',
      surfaceHover: '#1f2937',
      border: 'rgba(255, 255, 255, 0.08)',
      textPrimary: '#f9fafb',
      textSecondary: '#9ca3af',
      accent: '#3b82f6',
      accentGlow: 'rgba(59, 130, 246, 0.2)'
    }
  },
  'cyberpunk': {
    name: 'Cyberpunk Tech',
    description: 'High-tech terminal futuristic aesthetic. Dark slate with neon green/amber HUD accents, sharp technical corners, monospace highlights, and glowing border gradients.',
    palette: {
      background: '#05070a',
      surface: '#0d1117',
      surfaceHover: '#161b22',
      border: '#30363d',
      textPrimary: '#e6edf3',
      textSecondary: '#7d8590',
      accent: '#2ea043',
      accentGlow: 'rgba(46, 160, 67, 0.3)'
    }
  }
};

/**
 * Builds the AI prompt for generating the redesign
 */
export function buildRedesignPrompt({ url, title, metaDescription, themeKey, customPrompt, domTree, screenshotPath }) {
  const theme = THEME_PRESETS[themeKey] || THEME_PRESETS['linear-dark'];

  return `You are a world-class Principal UI/UX Designer and Frontend Architect.
Your mission is to completely REDESIGN the webpage provided below into a stunning, state-of-the-art modern interface that will WOW anyone viewing it.

### Webpage Context:
- URL: ${url}
- Title: ${title || 'Untitled Page'}
- Description: ${metaDescription || 'No description provided'}
- Target Visual Theme: ${theme.name}
- Theme Description: ${theme.description}
${customPrompt ? `- Custom User Instructions: "${customPrompt}"` : ''}
${screenshotPath ? `- A screenshot of the original page is available at: ${screenshotPath}` : ''}

### Extracted Semantic Elements & Interactive Nodes:
Below is the cleaned semantic skeleton of the page. Each interactive element (button, link, input, heading, card, image) has a unique 'data-mirror-id' attribute:
\`\`\`json
${JSON.stringify(domTree, null, 2)}
\`\`\`

### CRITICAL REQUIREMENTS:
1. **Interactive Event Mirroring (MANDATORY)**:
   - Every redesigned button, link, search bar, and form input that corresponds to an original element MUST include the EXACT \`data-mirror-id="..."\` attribute from the extracted tree!
   - This allows our projection engine to mirror user clicks and typing down to the underlying webpage seamlessly.
   - For example: if the original search input had \`data-mirror-id="input-1"\`, your redesigned modern search input MUST have \`data-mirror-id="input-1"\`.
   - If an original CTA button had \`data-mirror-id="btn-3"\`, your redesigned button MUST have \`data-mirror-id="btn-3"\`.

2. **Visual Excellence & Modern Aesthetics**:
   - WOW the user at first glance! Elevate this website from whatever it currently looks like into an award-winning modern design.
   - Clean, modern layout (hero section, navigation header, featured cards/bento grid, search bar, polished footer).
   - Rich typography (Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif).
   - Glassmorphism, smooth gradients, subtle inner shadows, sleek borders (\`1px solid rgba(255,255,255,0.08)\`).
   - Micro-interactions on buttons, links, and cards (\`:hover\`, \`:focus\`, transform, transition).

3. **Technical Output Format**:
   - The redesign will be rendered inside an isolated Shadow DOM container.
   - All styles must be fully encapsulated. The root wrapper should be \`<div id="designify-container">...</div>\`.
   - Provide clean, semantic HTML and standard CSS. DO NOT use external CSS frameworks (no Tailwind runtime, no Bootstrap). Use pure Vanilla CSS with CSS custom properties.
   - You MUST respond with ONLY a valid JSON object in the following format (no commentary or markdown wrappers outside the JSON):

{
  "themeName": "${theme.name}",
  "summary": "Brief 1-2 sentence description of design improvements made",
  "css": "/* Complete Vanilla CSS rules for the redesigned page, scoped to #designify-container */",
  "html": "<div id=\\"designify-container\\">...complete redesigned HTML...</div>"
}
`;
}
