# Contributing to Likable

Thanks for helping improve Likable. Small, focused pull requests are easiest to review.

## Development setup

Likable has no runtime npm dependencies. Use Node.js 20 or newer, then run:

```bash
npm test
npm run build
```

The bridge can be started locally with `npm start`. End-to-end bridge checks require a running bridge and an authenticated local Claude Code or Codex CLI:

```bash
npm run test:integration
npm run test:codex
```

Do not commit `.bridge_token`, CLI credentials, screenshots, page captures, or other private data. The security test suite should pass before opening a pull request.

## Pull requests

Describe the user-visible behavior, the reason for the change, and the checks you ran. Changes to page permissions, data collection, bridge authentication, or generated-markup sanitization should include a security and privacy explanation.

Please do not include copied brand assets or proprietary design files. Presets should describe inspiration clearly and remain independent of the referenced products.

## Reporting vulnerabilities

Please follow [SECURITY.md](SECURITY.md) instead of opening a public issue for a suspected vulnerability.
