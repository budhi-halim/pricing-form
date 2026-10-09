import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { scenarios, fillOriginal } from './fixtures/scenarios.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'C:/Users/halim/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const output = fileURLToPath(new URL('review/original/', import.meta.url));
await mkdir(output, { recursive: true });
for (const channel of ['chrome', 'msedge']) {
  const browser = await chromium.launch({ channel, headless: true });
  for (const [name, data] of Object.entries(scenarios)) {
    const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
    await page.route('**/*', route => route.request().url().startsWith('http://127.0.0.1:4173/') ? route.continue() : route.abort());
    await page.goto('http://127.0.0.1:4173/pricing-form/tests/fixtures/original/');
    await fillOriginal(page, data);
    await page.emulateMedia({ media: 'print' });
    const geometry = await page.locator('#a4-document').evaluate(doc => {
      const origin = doc.getBoundingClientRect();
      return { text: doc.textContent, width: origin.width, height: origin.height, elements: [doc, ...doc.querySelectorAll('*')].map(element => { const rect = element.getBoundingClientRect(); const style = getComputedStyle(element); return { tag: element.tagName, text: element.childElementCount ? null : element.textContent, x: rect.x - origin.x, y: rect.y - origin.y, width: rect.width, height: rect.height, display: style.display, font: style.font, color: style.color }; }) };
    });
    await writeFile(path.join(output, `${channel}-${name}.json`), JSON.stringify(geometry, null, 2));
    await page.pdf({ path: path.join(output, `${channel}-${name}.pdf`), preferCSSPageSize: true, printBackground: true });
    if (name === 'basic') await page.screenshot({ path: path.join(output, `${channel}-basic.png`), fullPage: true });
    await page.close();
  }
  await browser.close();
}
console.log('Captured original Chrome/Edge geometry and PDFs for four fixtures.');
