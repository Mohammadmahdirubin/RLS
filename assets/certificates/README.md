# Reviewer Certificate Rendering — Stability Rules

## Permanent rule
- The certificate artwork uses a single native responsive A4 landscape layout (297:210).
- Embedded preview MUST use responsive CSS only. Do not add `transform: scale()`, JavaScript zoom, fixed 1122×794 canvas sizing, or competing resize/scaling systems.
- The parent verification page MUST size the iframe height from its rendered width using the 297:210 ratio.
- Keep the shared template as the single source for every certificate, including future certificates. The verification page must render all certificates from this template and must not select old static PNG files for display.
- Do not change certificate artwork/layout/scale or cache markers as an isolated experiment. Before merging a rendering change, check both mobile and desktop and verify: whole certificate visible, no clipping/overlap, ratio preserved, all text/QR readable.
- If a change breaks either viewport, revert to the last verified implementation rather than layering another scaling method on top.
- Never alter certificate validity, registry entries, or certificate codes as part of visual fixes.

## Current implementation
`peer-review-template.html` is native responsive CSS with no embed transforms. `certificate-verify.html` explicitly sizes the iframe to A4 landscape and updates the height on resize.
