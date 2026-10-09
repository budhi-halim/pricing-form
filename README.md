# Pricing Form

The current editable app uses Islandsun Design A. Serve the repository over HTTP; there is no build step or external runtime dependency. From the sibling `isi` repository, run `node family-tools/serve.mjs` and open `http://127.0.0.1:4173/pricing-form/`.

## Source responsibilities

- `index.html` and `css/style.css`: responsive application interface.
- `assets/family`: versioned local copy of canonical presentation assets from `isi/family`. Edit the canonical package and synchronize with `node ../isi/family-tools/sync.mjs --target=pricing-form`.
- `js/logic.js`: input normalization, validation, row state, preview geometry, and output title.
- `js/ui.js`: controls, lifecycle orchestration, accessible validation, and rendering.
- `js/document.js` and `css/document.css`: protected company document. Preserve wording, capitalization, typography, measurements, and pagination.
- `js/preview.js`: outer scaling and space reservation; internal document dimensions never follow the viewport.
- `js/printing.js` and `css/print.css`: layout readiness and native vector printing. Never replace this with screenshot capture.

The theme follows the system on each launch. The optional light/dark switch applies only to the open page. The document always remains black on white.

Only input text is selectable in the app; the saved PDF still has selectable text. Home links default to `isi-share`. A current-page launch confirmed by the live `isi` launcher can return to `isi` instead. No launcher preference is saved; a reload without fresh confirmation safely returns to the shared default. The shared design guide documents the session handshake.

## Verification

With the local server running:

```powershell
node tests/check-logic.mjs
node tests/check-form.mjs
node tests/check-pdfs.mjs
```

The frozen original implementation is in `tests/fixtures/original`; it is a comparison fixture, not editable application source. If local baseline evidence is missing, run `node tests/capture-original.mjs` first. Test-generated screenshots and PDFs stay in ignored `tests/review`.

Browser verification uses Playwright with locally installed Chrome/Edge. PDF analysis uses Python/pdfplumber/Pillow and Poppler. Paths can be overridden through `PLAYWRIGHT_PATH`, `PYTHON_PATH`, and `PDFTOPPM_PATH`.

See `../isi/family-tools/CHECKPOINTS-2-3.md` for precise test results and manual-check limitations. Existing `dev` content remains untouched until the approved final consolidation checkpoint. No minification or publishing is performed here.
