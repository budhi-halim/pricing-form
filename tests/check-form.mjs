import { createRequire } from 'node:module';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import { scenarios } from './fixtures/scenarios.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'C:/Users/halim/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const output = fileURLToPath(new URL('review/current/', import.meta.url));
await mkdir(output, { recursive: true });
const base = `${process.env.ISI_PREVIEW_URL || 'http://127.0.0.1:4173'}/pricing-form/`;
const keys = { customer_name: 'customer-name', person_in_charge: 'person-in-charge', line_business: 'line-business', business_scale: 'business-scale', business_relationship: 'business-relationship', payment_info: 'payment-info', deal_system: 'deal-system', ideal_price_from: 'ideal-price-from', ideal_price_val: 'ideal-price', competitor_price: 'competitor-price', qty_first: 'quantity-first', qty_avg: 'quantity-average', qty_max: 'quantity-maximum' };
const results = [];

async function fill(page, data) {
  await page.evaluate(({ data, keys }) => {
    for (const [old, name] of Object.entries(keys)) {
      if (data[old] === undefined) continue;
      const control = document.querySelector(`[name="${name}"]`);
      if (control?.type === 'radio') document.querySelectorAll(`[name="${name}"]`).forEach(input => { input.checked = input.value === data[old]; });
      else if (control) control.value = data[old];
    }
    document.querySelector('[name="business-relationship"]:checked').dispatchEvent(new Event('change', { bubbles: true }));
  }, { data, keys });
  for (let index = 1; index < data.products.length; index++) await page.locator('#add-product').click();
  for (let index = 0; index < data.products.length; index++) await page.locator('#product-names input').nth(index).fill(data.products[index]);
  for (let index = 1; index < data.purchased.length; index++) await page.locator('#add-purchased').click();
  for (let index = 0; index < data.purchased.length; index++) {
    for (const [old, column] of [['prod', 'product'], ['qty', 'quantity'], ['price', 'price']]) await page.locator(`#purchased-items [data-column="${column}"]`).nth(index).fill(data.purchased[index][old]);
  }
}

async function generate(page) {
  await page.locator('#generate-document').click();
  await page.locator('#preview-view:not([hidden])').waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => Number(document.querySelector('#preview-sheet').style.getPropertyValue('--preview-scale')) > 0);
}

async function geometry(page, unscale = false) {
  return page.locator('#a4-document').evaluate((doc, unscale) => {
    const origin = doc.getBoundingClientRect();
    const scale = unscale ? origin.width / parseFloat(getComputedStyle(doc).width) : 1;
    return { text: doc.textContent, width: origin.width / scale, height: origin.height / scale, elements: [doc, ...doc.querySelectorAll('*')].map(element => { const rect = element.getBoundingClientRect(); const style = getComputedStyle(element); return { tag: element.tagName, text: element.childElementCount ? null : element.textContent, x: (rect.x - origin.x) / scale, y: (rect.y - origin.y) / scale, width: rect.width / scale, height: rect.height / scale, display: style.display, font: style.font }; }) };
  }, unscale);
}

function compareGeometry(expected, actual, tolerance = .06) {
  assert.equal(actual.text, expected.text, 'Document wording and whitespace must match');
  assert.equal(actual.elements.length, expected.elements.length, 'Element topology must match');
  const differences = [];
  actual.elements.forEach((element, index) => {
    const original = expected.elements[index];
    assert.equal(element.tag, original.tag);
    assert.equal(element.text, original.text);
    assert.equal(element.display, original.display);
    assert.equal(element.font, original.font);
    const bothUnrendered = original.width === 0 && original.height === 0 && element.width === 0 && element.height === 0;
    if (!bothUnrendered) for (const key of ['width', 'height', 'x', 'y']) if (Math.abs(element[key] - original[key]) > tolerance) differences.push({ index, key, original: original[key], actual: element[key], text: element.text });
  });
  return differences;
}

for (const channel of ['chrome', 'msedge']) {
  const browser = await chromium.launch({ channel, headless: true });
  const errors = [];
  try {
    for (const [name, fixture] of Object.entries(scenarios)) {
      const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, colorScheme: 'light' });
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(base);
      await fill(page, fixture);
      await generate(page);
      const screenGeometry = await geometry(page, true);
      await page.emulateMedia({ media: 'print' });
      const current = await geometry(page);
      const original = JSON.parse(await readFile(path.join(output, '../original', `${channel}-${name}.json`), 'utf8'));
      const differences = compareGeometry(original, current);
      await writeFile(path.join(output, `${channel}-${name}-geometry.json`), JSON.stringify({ differences, current }, null, 2));
      assert.equal(differences.length, 0, `${channel}/${name} geometry mismatch: ${JSON.stringify(differences.slice(0, 6))}`);
      assert.equal(compareGeometry(current, screenGeometry, .1).length, 0, `${name} preview geometry differs from print`);
      await page.pdf({ path: path.join(output, `${channel}-${name}.pdf`), preferCSSPageSize: true, printBackground: true });
      await page.emulateMedia({ media: 'screen' });
      if (name === 'basic') {
        for (const width of [360, 430, 768, 1600, 2560]) {
          await page.setViewportSize({ width, height: width === 2560 ? 1600 : 900 });
          for (const zoom of ['fit', '50', '100', '125', '200']) {
            await page.locator('#preview-zoom').selectOption(zoom);
            await page.waitForTimeout(60);
            const changed = await geometry(page, true);
            assert.equal(compareGeometry(screenGeometry, changed, .12).length, 0, `${channel} width ${width} / zoom ${zoom} shifted content`);
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'Page overflow outside preview');
          }
        }
        await page.setViewportSize({ width: 1600, height: 900 });
        await page.locator('#preview-zoom').selectOption('fit');
        await page.waitForTimeout(80);
        await page.screenshot({ path: path.join(output, `${channel}-preview.png`), fullPage: true });
      }
      await page.close();
      results.push(`${channel}/${name}: exact text, element geometry within 0.06px of original print, screen/print match`);
    }
    // Cross resolution, device-pixel ratio, and visual zoom outputs use the native PDF path.
    for (const width of [1600, 2560]) for (const dpr of [1, 2]) for (const zoom of ['50', '150']) {
      const page = await browser.newPage({ viewport: { width, height: width === 1600 ? 900 : 1600 }, deviceScaleFactor: dpr });
      await page.goto(base);
      await fill(page, scenarios.basic);
      await generate(page);
      await page.locator('#preview-zoom').selectOption(zoom);
      await page.pdf({ path: path.join(output, `${channel}-${width}-dpr${dpr}-zoom${zoom}.pdf`), preferCSSPageSize: true, printBackground: true });
      await page.close();
    }
    const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, colorScheme: 'dark' });
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base);
    assert.equal(await page.locator('#theme-toggle').getAttribute('data-scheme'), 'dark');
    await page.locator('.isi-theme-toggle').click();
    assert.equal(await page.locator('#theme-toggle').getAttribute('data-scheme'), 'light');
    await page.reload();
    assert.equal(await page.locator('#theme-toggle').getAttribute('data-scheme'), 'dark', 'Launch must reset to system, not saved choice');
    await page.emulateMedia({ colorScheme: 'light' });
    await page.waitForFunction(() => document.querySelector('#theme-toggle').dataset.scheme === 'light');
    await page.locator('.isi-theme-toggle').click();
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.emulateMedia({ colorScheme: 'light' });
    assert.equal(await page.locator('#theme-toggle').getAttribute('data-scheme'), 'dark', 'Manual selection lasts for this page');
    await page.screenshot({ path: path.join(output, `${channel}-form-dark.png`), fullPage: true });
    await page.locator('#generate-document').click();
    assert.equal(await page.locator('#validation-summary').isVisible(), true);
    assert.equal(await page.locator('#customer-name').getAttribute('aria-invalid'), 'true');
    await page.locator('#reset-form').click();
    await page.evaluate(() => { for (let i = 0; i < 15; i++) document.querySelector('#add-product').click(); });
    const ids = await page.locator('#product-names input').evaluateAll(inputs => inputs.map(input => input.id));
    assert.equal(new Set(ids).size, 16, 'Repeated addition must have unique ids');
    await page.locator('#reset-form').click();
    await fill(page, scenarios.returning);
    assert.equal(await page.locator('#add-purchased').isVisible(), false);
    await page.locator('#purchased-items [data-column="price"]').first().fill('');
    await page.locator('#generate-document').click();
    assert.ok((await page.locator('#validation-summary').textContent()).includes('Complete product'));
    await page.locator('#purchased-items [data-column="price"]').first().fill('4.2');
    await page.locator('#product-names input').first().fill('<img src=x onerror="window.injected=true"> & "sample"');
    await generate(page);
    assert.equal(await page.locator('#a4-document img').count(), 0);
    assert.ok((await page.locator('#a4-document').textContent()).includes('<img src=x'));
    assert.equal(await page.evaluate(() => window.injected), undefined);
    await page.locator('#back-to-form').click();
    assert.ok((await page.locator('#product-names input').first().inputValue()).includes('<img'));
    await page.locator('#reset-form').click();
    assert.equal(await page.locator('#product-names input').count(), 1);
    assert.equal(await page.locator('#customer-name').inputValue(), '');
    assert.equal(await page.locator('#customer-history').isVisible(), false);
    await fill(page, scenarios.basic);
    await generate(page);
    await page.evaluate(() => { window.printCalls = []; window.print = () => { window.dispatchEvent(new Event('beforeprint')); window.printCalls.push(document.title); window.dispatchEvent(new Event('afterprint')); }; });
    await page.locator('#print-document').click();
    await page.waitForFunction(() => window.printCalls.length === 1);
    assert.equal(await page.title(), 'Pricing Form Generator');
    assert.equal(await page.locator('#print-document').isEnabled(), true);
    await page.locator('#print-document').click();
    await page.waitForFunction(() => window.printCalls.length === 2);
    assert.ok((await page.evaluate(() => window.printCalls[0])).startsWith('Pricing PT Nusantara Pangan Demo (current '));
    await page.evaluate(() => { document.querySelector('#print-document').click(); document.querySelector('#back-to-form').click(); });
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => window.printCalls.length), 2, 'Stale pending print must be cancelled');
    for (const theme of ['light', 'dark']) {
      await page.reload();
      await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
      for (const viewport of [{ width: 360, height: 740 }, { width: 430, height: 850 }, { width: 768, height: 1024 }, { width: 1000, height: 500 }, { width: 1600, height: 900 }, { width: 2560, height: 1600 }]) {
        await page.setViewportSize(viewport);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        if (viewport.width === 360 || viewport.width === 1600) await page.screenshot({ path: path.join(output, `${channel}-form-${theme}-${viewport.width}.png`), fullPage: true });
      }
    }
    assert.deepEqual(errors, []);
    results.push(`${channel}: themes/system reload, validation, unique row ids, partial rows, XSS, reset/edit, print lifecycle/cancellation and responsive form passed`);
    await page.close();
  } finally { await browser.close(); }
}
await writeFile(path.join(output, 'results.json'), JSON.stringify({ results, limits: ['Native PDFs captured through Chromium print-to-PDF; no physical printer tested.', 'Viewport and device scale emulate the two monitors; physical displays are not available.'] }, null, 2));
console.log(results.join('\n'));
