# University of Granada / Cuadernos de Rusística Española partner assets

This directory holds visual assets for the international academic collaboration box on the RLS homepage.

## Logo source

Official University of Granada corporate visual identity:
- Download page: https://secretariageneral.ugr.es/informacion/servicios/identidad-visual/descarga
- Official asset (UGR-MARCA-01-color.png): https://secretariageneral.ugr.es/sites/webugr/secretariageneral/public/inline-files/UGR-MARCA-01-color.png
- Identity guidance: https://canal.ugr.es/blog/identidad-visual-corporativa-de-la-ugr/descarga-logo-ugr/

## Current implementation (2026-09-25)

The homepage (fa / en / ru) loads the official UGR PNG **directly** from the University of Granada server via `<img src="https://secretariageneral.ugr.es/.../UGR-MARCA-01-color.png">`.

This avoids SVG external-image loading issues (CORS / cross-origin restrictions) and ensures the logo always displays when the official source is reachable.

The local `ugr-logo.svg` is kept as a fallback reference wrapper.
