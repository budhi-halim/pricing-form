import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createState, addRow, removeRow, validateForm, getAlphabetIndex, previewGeometry, printTitle } from '../js/logic.js';
import { renderDocument } from '../js/document.js';

function validState() {
  const state = createState();
  state.fields = { customerName: '  Sample   Customer  ', personInCharge: 'Contact', lineBusiness: 'Food', businessScale: 'Lokal', businessRelationship: 'New Customer', paymentInfo: '', dealSystem: 'NIHIL', idealPriceFrom: 'Sales', idealPrice: '0', competitorPrice: '', quantityFirst: '0', quantityAverage: '10.5', quantityMaximum: '20' };
  state.products[0].name = 'Sample product';
  return state;
}
test('zero values are valid and document strings preserve casing and escape all user fields', () => {
  const state = validState();
  state.fields.customerName = '<img src=x onerror=alert(1)>';
  state.products[0].name = '<script>unsafe</script>';
  const result = validateForm(state);
  assert.equal(result.errors.length, 0);
  const html = renderDocument(result.model);
  assert.ok(html.includes('CUSTOMER\'S INFORMATION for PRICING'));
  assert.ok(html.includes('&lt;img'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('<script>'));
});
test('old-customer rows require complete numeric fields but optional empty rows remain valid', () => {
  const state = validState();
  state.fields.businessRelationship = 'Old Customer';
  assert.ok(validateForm(state).errors.some(error => error.key === 'paymentInfo'));
  state.fields.paymentInfo = 'Good';
  assert.equal(validateForm(state).errors.length, 0);
  state.purchasedItems[0].product = 'Flavour';
  assert.ok(validateForm(state).errors.some(error => error.key.startsWith('purchased-')));
  Object.assign(state.purchasedItems[0], { quantity: '0', price: '0' });
  assert.equal(validateForm(state).errors.length, 0);
  state.purchasedItems[0].price = 'Infinity';
  assert.ok(validateForm(state).errors.length > 0);
});
test('rapid add/remove has unique ids, caps purchased rows, and protects the first product', () => {
  let state = createState();
  const firstId = state.products[0].id;
  for (let i = 0; i < 100; i++) state = addRow(state, 'products');
  assert.equal(new Set(state.products.map(row => row.id)).size, 101);
  assert.equal(removeRow(state, 'products', firstId), state);
  for (let i = 0; i < 10; i++) state = addRow(state, 'purchasedItems');
  assert.equal(state.purchasedItems.length, 3);
  state = removeRow(state, 'purchasedItems', state.purchasedItems[0].id);
  assert.equal(state.purchasedItems.length, 2);
});
test('preview geometry scales only the outer layer and filenames retain the existing format', () => {
  const geometry = previewGeometry({ availableWidth: 300, documentWidth: 800, documentHeight: 1200 });
  assert.deepEqual(geometry, { scale: .375, width: 300, height: 450 });
  assert.equal(previewGeometry({ availableWidth: 300, documentWidth: 800, documentHeight: 1200, zoom: '200' }).width, 1600);
  assert.equal(getAlphabetIndex(26), 'aa');
  assert.equal(printTitle('Demo', new Date(2026, 8, 19)), 'Pricing Demo (current 19-09-2026)');
});
