# Security policy

## Reporting a vulnerability

Please do not open a public issue for a suspected vulnerability. Contact the repository maintainer privately with:

- a description of the issue and its impact;
- reproduction steps or a minimal proof of concept;
- the affected version or commit; and
- any suggested mitigation.

Allow time for a fix before publicly disclosing details. Never include bridge tokens, CLI credentials, screenshots, or private page content in a report.

## Security model

The bridge listens only on `127.0.0.1`, requires a bearer token for API operations, limits request and generated-output sizes, allows one redesign process at a time, and terminates processes that exceed the timeout. The extension does not automatically inject into every page; it requires an explicit user action.

The AI-generated markup is treated as untrusted. Likeable removes active elements and external resource loads before rendering it in the Shadow DOM. This is defense-in-depth, not a guarantee that arbitrary websites or CLI providers are safe.
