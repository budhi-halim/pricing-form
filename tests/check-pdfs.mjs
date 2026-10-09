import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const python = process.env.PYTHON_PATH || 'C:/Users/halim/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe';
const script = String.raw`
from pathlib import Path
import json
import sys
import subprocess
import pdfplumber
from PIL import Image, ImageChops

def signature(document: pdfplumber.PDF) -> list[dict]:
    """Capture visible PDF text geometry, page boxes, and vector/image counts."""
    return [{'size': (p.width, p.height), 'chars': [(c['text'], round(c['x0'], 3), round(c['top'], 3), round(c['size'], 3)) for c in p.chars], 'images': len(p.images), 'rects': len(p.rects), 'curves': len(p.curves)} for p in document.pages]

root = Path(sys.argv[1])
poppler = sys.argv[2]
rasters = root / 'current' / 'pdf-rasters'
rasters.mkdir(exist_ok=True)
results = []
for channel in ['chrome', 'msedge']:
    for name in ['basic', 'returning', 'long', 'multipage']:
        with pdfplumber.open(root / 'original' / f'{channel}-{name}.pdf') as old, pdfplumber.open(root / 'current' / f'{channel}-{name}.pdf') as new:
            original = signature(old)
            current = signature(new)
            # Transformed baseline wrappers duplicate clipped vectors on earlier pages.
            # Compare text and page geometry here; raster checks cover visible artwork.
            assert [{k: p[k] for k in ['size', 'chars', 'images']} for p in original] == [{k: p[k] for k in ['size', 'chars', 'images']} for p in current], f'{channel}/{name}: printed text geometry differs from original'
            assert sum(len(p.images) for p in new.pages) == 0, 'Unexpected rasterized output'
            assert sum(len(p.chars) for p in new.pages) > 700, 'Selectable text missing'
            results.append({'file': f'{channel}-{name}', 'pages': len(new.pages), 'original_match': True, 'characters': sum(len(p.chars) for p in new.pages), 'raster_images': 0})
            for group in ['original', 'current']:
                subprocess.run([poppler, '-png', '-r', '100', str(root / group / f'{channel}-{name}.pdf'), str(rasters / f'{group}-{channel}-{name}')], check=True, capture_output=True)
            for index in range(1, len(new.pages) + 1):
                with Image.open(rasters / f'original-{channel}-{name}-{index}.png') as a, Image.open(rasters / f'current-{channel}-{name}-{index}.png') as b:
                    assert a.size == b.size
                    difference = ImageChops.difference(a.convert('RGB'), b.convert('RGB')).getbbox()
                    # The old transformed continuation border bleeds onto page two's
                    # last raster row. Its full border belongs at page three's top.
                    allowed_bleed = name == 'multipage' and index == 2 and difference and difference[1] >= a.height - 1
                    assert difference is None or allowed_bleed, f'{channel}/{name}/{index}: visible document differs at {difference}'
                    results.append({'raster': f'{channel}-{name}-{index}', 'pixel_identical': difference is None, 'baseline_bottom_edge_bleed_removed': bool(allowed_bleed)})
    variants = sorted((root / 'current').glob(f'{channel}-*-dpr*-zoom*.pdf'))
    assert len(variants) == 8
    signatures = []
    for file in variants:
        with pdfplumber.open(file) as document:
            signatures.append(signature(document))
    assert all(value == signatures[0] for value in signatures), f'{channel}: output varies with monitor/scale/preview zoom'
    results.append({'browser': channel, 'identical_resolution_variants': len(variants)})
(root / 'current' / 'pdf-analysis.json').write_text(json.dumps(results, indent=2), encoding='utf-8')
print(json.dumps(results, indent=2))
`;
const poppler = process.env.PDFTOPPM_PATH || 'C:/Users/halim/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/poppler/Library/bin/pdftoppm.exe';
const result = spawnSync(python, ['-c', script, fileURLToPath(new URL('review/', import.meta.url)), poppler], { encoding: 'utf8' });
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
