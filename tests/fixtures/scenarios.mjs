export const basic = {
  customer_name: 'PT Nusantara Pangan Demo', person_in_charge: 'Ari — Sample Contact', line_business: 'Food manufacturing',
  business_scale: 'National / International', business_relationship: 'New Customer', deal_system: 'S/C', ideal_price_from: 'Customer',
  ideal_price_val: '4.25', competitor_price: 'US$ 4.50 / kg', qty_first: '100', qty_avg: '250', qty_max: '500',
  products: ['Vanilla Flavour — Sample'], purchased: []
};
export const scenarios = {
  basic,
  returning: { ...basic, business_relationship: 'Old Customer', business_scale: 'Lokal', payment_info: 'Good', deal_system: 'NOTA PESAN', ideal_price_from: 'Marketing', products: ['Vanilla Flavour', 'Chocolate Flavour', 'Strawberry Flavour'], purchased: [{ prod: 'Vanilla Flavour', qty: '25', price: '4.2' }, { prod: 'Chocolate Flavour', qty: '0', price: '0' }, { prod: 'Strawberry Flavour', qty: '1000.25', price: '9.15' }] },
  long: { ...basic, customer_name: 'PT Nusantara Pangan Demo International Food Manufacturing and Distribution Indonesia', person_in_charge: 'Ari Pratama — Product Research and Development Department', products: ['A long descriptive product name for the company standard pricing form without layout changes', 'A second descriptive product name with additional specification details'] },
  multipage: { ...basic, products: Array.from({ length: 45 }, (_, index) => `Sample product ${index + 1} — Vanilla and chocolate flavour for food manufacturing`) }
};

export async function fillOriginal(page, data) {
  await page.evaluate(data => {
    for (const [key, value] of Object.entries(data)) {
      const field = document.getElementById(key);
      if (field) field.value = value;
      document.querySelectorAll(`input[name="${key}"]`).forEach(input => { input.checked = input.value === value; });
    }
    document.querySelector('input[name="business_relationship"]:checked').dispatchEvent(new Event('change', { bubbles: true }));
  }, data);
  for (let index = 1; index < data.products.length; index++) { await page.locator('#btn-add-product').click(); await page.waitForTimeout(2); }
  for (let index = 0; index < data.products.length; index++) await page.locator('#product-names-container input').nth(index).fill(data.products[index]);
  if (data.purchased.length) {
    for (let index = 1; index < data.purchased.length; index++) { await page.locator('#btn-add-purchased').click(); await page.waitForTimeout(2); }
    for (let index = 0; index < data.purchased.length; index++) {
      for (const [field, value] of Object.entries(data.purchased[index])) await page.locator(`#purchased-items-container input[id^="pi_${field}_"]`).nth(index).fill(value);
    }
  }
  await page.locator('#pricing-form').evaluate(form => form.requestSubmit());
  await page.locator('#preview-view:not(.hidden)').waitFor();
}
