import { escapeHtml, getAlphabetIndex } from './logic.js';

const CHECKMARK = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>';
const checkbox = checked => `<div class="doc-checkbox">${checked ? CHECKMARK : ''}</div>`;
const checkboxFor = (actual, expected) => checkbox(actual === expected);

export function renderDocument(model) {
  const data = Object.fromEntries(Object.entries(model.fields).map(([key, value]) => [key, escapeHtml(value)]));
  const isNewCustomer = data.businessRelationship === 'New Customer';
  const items = [...model.purchasedItems];
  while (items.length < 3) items.push({ product: '', quantity: '', price: '' });
  const purchasedRows = isNewCustomer
    ? [0, 1, 2].map((_, index) => [
    `<div class="doc-purchased-row avoid-break"><div class="doc-alphabet-label">${["A", "B", "C"][index]}.</div><div class="doc-purchased-product"></div><div class="doc-colon">;</div><div class="doc-purchased-quantity"></div><div class="doc-colon">KG ; US$</div><div class="doc-purchased-price"></div></div>`
  ].join('')).join('')
    : items.map((item, index) => [
    `<div class="doc-purchased-row avoid-break"><div class="doc-alphabet-label">${["A", "B", "C"][index]}.</div><div class="doc-purchased-product">${escapeHtml(item.product)}</div><div class="doc-colon">;</div><div class="doc-purchased-quantity">${escapeHtml(item.quantity)}</div><div class="doc-colon">KG ; US$</div><div class="doc-purchased-price">${escapeHtml(item.price)}</div></div>`
  ].join('')).join('');
  const products = [...model.products];
  while (products.length < 3) products.push({ name: '' });
  const productRows = products.map((item, index) => [
    `<div class="doc-row-bottom-small avoid-break"><div class="doc-alphabet-label">${getAlphabetIndex(index)}.</div><div class="doc-purchased-product">${escapeHtml(item.name)}</div></div>`
  ].join('')).join('');
  return [
    `<div class="doc-header-code">FRM-MKT-0201</div>`,
    `<div class="doc-title">CUSTOMER'S INFORMATION for PRICING</div>`,
    `<div class="doc-row-bottom-small avoid-break">`,
    `<div class="doc-label-30">1. Name of Customer</div>`,
    `<div class="doc-colon">:</div>`,
    `<div class="doc-ruled-value">${data.customerName}</div></div>`,
    `<div class="doc-row-bottom-small avoid-break">`,
    `<div class="doc-label-30">2. Person in Charge</div>`,
    `<div class="doc-colon">:</div>`,
    `<div class="doc-ruled-value">${data.personInCharge}</div></div>`,
    `<div class="doc-row-bottom-small avoid-break">`,
    `<div class="doc-label-30">3. Line Business</div>`,
    `<div class="doc-colon">:</div>`,
    `<div class="doc-ruled-value">${data.lineBusiness}</div></div>`,
    `<div class="doc-spacer-small avoid-break"></div>`,
    `<div class="doc-row-center-small avoid-break">`,
    `<div class="doc-label-30">4. Business Scale</div>`,
    `<div class="doc-colon">:</div>`,
    `<div class="doc-choices-inset">${checkboxFor(data.businessScale,"National / International")}<span class="doc-choice-wide">National / International</span>${checkboxFor(data.businessScale,"Lokal")}<span class="doc-inset-2">Lokal</span></div></div>`,
    `<div class="doc-row-small avoid-break">`,
    `<div class="doc-label-45">5. Business Relationship with us</div>`,
    `<div class="doc-colon">:</div>`,
    `<div class="doc-content-inset">`,
    `<div class="doc-relationship-new">- New Customer`,
    `<div class="doc-inset-2">${checkboxFor(data.businessRelationship,"New Customer")}</div></div>`,
    `<div class="doc-row-center">- Old Customer`,
    `<div class="doc-inset-2">${checkboxFor(data.businessRelationship,"Old Customer")}</div></div></div></div>`,
    `<div class="doc-purchased-heading avoid-break">* Purchased Item : Quantity & Price</div>${purchasedRows}`,
    `<div class="doc-products-row avoid-break">`,
    `<div class="doc-label-30">Name of Product</div>`,
    `<div class="doc-colon">:</div>`,
    `<div class="doc-grow">${productRows}</div></div>`,
    `<div class="doc-row-medium avoid-break">`,
    `<div class="doc-label-30">6. Payment Info</div>`,
    `<div class="doc-colon">:</div>`,
    `<div class="doc-grow">`,
    `<div class="doc-row-bottom-small">`,
    `<div class="doc-text-30">New Customer</div>`,
    `<div class="doc-colon">:</div>`,
    `<div class="doc-ruled-blank"></div></div>`,
    `<div class="doc-row-center ${isNewCustomer?"doc-hidden":""}">`,
    `<div class="doc-text-30">Old Customer</div>`,
    `<div class="doc-colon">:</div>${checkboxFor(data.paymentInfo,"Good")}<span class="doc-choice-narrow">Good</span>${checkboxFor(data.paymentInfo,"Fair")}<span class="doc-choice-narrow">Fair</span>${checkboxFor(data.paymentInfo,"Poor")}<span class="doc-choice-narrow">Poor</span>${checkboxFor(data.paymentInfo,"Bad")}<span class="doc-inset-1">Bad</span></div></div></div>`,
    `<div class="doc-row-center-medium avoid-break">`,
    `<div class="doc-label-30">7. Deal System</div>`,
    `<div class="doc-colon">:</div>`,
    `<div class="doc-choices-inset">S/C<span class="doc-choice-wide">${checkboxFor(data.dealSystem,"S/C")}</span>NOTA PESAN<span class="doc-choice-wide">${checkboxFor(data.dealSystem,"NOTA PESAN")}</span>NIHIL<span class="doc-inset-2">${checkboxFor(data.dealSystem,"NIHIL")}</span></div></div>`,
    `<div class="doc-row-medium avoid-break">`,
    `<div class="doc-label-30">8. Ideal Price from</div>`,
    `<div class="doc-colon">:</div>`,
    `<div class="doc-content-inset">`,
    `<div class="doc-row-bottom-small">`,
    `<div class="doc-text-20">Customer</div>${checkboxFor(data.idealPriceFrom,"Customer")}<span class="doc-colon">US$</span>`,
    `<div class="doc-purchased-price">${"Customer"===data.idealPriceFrom?data.idealPrice:""}</div></div>`,
    `<div class="doc-row-bottom-small">`,
    `<div class="doc-text-20">Sales</div>${checkboxFor(data.idealPriceFrom,"Sales")}<span class="doc-colon">US$</span>`,
    `<div class="doc-purchased-price">${"Sales"===data.idealPriceFrom?data.idealPrice:""}</div></div>`,
    `<div class="doc-row-bottom">`,
    `<div class="doc-text-20">Marketing</div>${checkboxFor(data.idealPriceFrom,"Marketing")}<span class="doc-colon">US$</span>`,
    `<div class="doc-purchased-price">${"Marketing"===data.idealPriceFrom?data.idealPrice:""}</div></div></div></div>`,
    `<div class="doc-row-bottom-medium avoid-break">`,
    `<div class="doc-label-45">9. Competitor Price</div>`,
    `<div class="doc-colon">:</div>`,
    `<div class="doc-ruled-value">${data.competitorPrice}</div></div>`,
    `<div class="doc-row-medium avoid-break">`,
    `<div class="doc-label-45">10. Quantity Order Estimation</div>`,
    `<div class="doc-colon">:</div>`,
    `<div class="doc-content-inset">`,
    `<div class="doc-row-bottom-small">`,
    `<div class="doc-text-25">a. First Order</div>`,
    `<div class="doc-colon">:</div>`,
    `<div class="doc-ruled-value">${data.quantityFirst} kg</div></div>`,
    `<div class="doc-row-bottom-small">`,
    `<div class="doc-text-25">b. Average</div>`,
    `<div class="doc-colon">:</div>`,
    `<div class="doc-ruled-value">${data.quantityAverage} kg</div></div>`,
    `<div class="doc-row-bottom">`,
    `<div class="doc-text-25">c. Maximum</div>`,
    `<div class="doc-colon">:</div>`,
    `<div class="doc-ruled-value">${data.quantityMaximum} kg</div></div></div></div>`,
    `<div class="doc-approval-section avoid-break">`,
    `<div class="doc-approval-heading">For Pak Poni use only</div>`,
    `<div class="doc-approval-instruction">To: Marketing, please quote as below :</div>`,
    `<div class="doc-row-bottom-short">`,
    `<div class="doc-label-20">Product Name</div>`,
    `<div class="doc-colon">:</div>`,
    `<div class="doc-blank-value"></div></div>`,
    `<div class="doc-row-bottom-large">`,
    `<div class="doc-label-20">Customer</div>`,
    `<div class="doc-colon">:</div>`,
    `<div class="doc-blank-value"></div></div>`,
    `<div class="doc-row-center-short">A.`,
    `<div class="doc-colon">${checkbox(false)}</div><span class="doc-text-20">Best Price</span><span class="doc-colon">US$</span>`,
    `<div class="doc-price-blank"></div></div>`,
    `<div class="doc-row-center-short">B.`,
    `<div class="doc-colon">${checkbox(false)}</div></div>`,
    `<div class="doc-row-center-large">C.`,
    `<div class="doc-colon">${checkbox(false)}</div></div>`,
    `<div class="doc-remarks-heading">Remarks :</div>`,
    `<div class="doc-remarks-space"></div>`,
    `<div class="doc-remarks-line"></div>`,
    `<div class="doc-remarks-line-last"></div>`,
    `<div class="doc-approval-signature">`,
    `<div class="doc-align-center">Approved by,<br><br><br><br><br>`,
    `<div class="doc-signature-line"></div></div></div></div>`
  ].join('');
}
