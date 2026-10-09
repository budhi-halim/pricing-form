export const FIELD_NAMES = Object.freeze({
  customerName: 'customer-name', personInCharge: 'person-in-charge', lineBusiness: 'line-business',
  businessScale: 'business-scale', businessRelationship: 'business-relationship', paymentInfo: 'payment-info',
  dealSystem: 'deal-system', idealPriceFrom: 'ideal-price-from', idealPrice: 'ideal-price',
  competitorPrice: 'competitor-price', quantityFirst: 'quantity-first', quantityAverage: 'quantity-average', quantityMaximum: 'quantity-maximum'
});
const CHOICES = {
  businessScale: ['National / International', 'Lokal'], businessRelationship: ['New Customer', 'Old Customer'],
  paymentInfo: ['Good', 'Fair', 'Poor', 'Bad'], dealSystem: ['S/C', 'NOTA PESAN', 'NIHIL'], idealPriceFrom: ['Customer', 'Sales', 'Marketing']
};

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character]);
}

export function getAlphabetIndex(index) {
  let label = '';
  for (let current = index; current >= 0; current = Math.floor(current / 26) - 1) label = String.fromCharCode(current % 26 + 97) + label;
  return label;
}

export function createState() {
  return { fields: {}, purchasedItems: [{ id: 1, product: '', quantity: '', price: '' }], products: [{ id: 2, name: '' }], nextId: 3 };
}

export function addRow(state, type) {
  if (type !== 'products' && type !== 'purchasedItems') throw new Error('Unknown row type.');
  if (type === 'purchasedItems' && state.purchasedItems.length >= 3) return state;
  const row = type === 'products' ? { id: state.nextId, name: '' } : { id: state.nextId, product: '', quantity: '', price: '' };
  return { ...state, [type]: [...state[type], row], nextId: state.nextId + 1 };
}

export function removeRow(state, type, id) {
  if (type !== 'products' && type !== 'purchasedItems') throw new Error('Unknown row type.');
  if (type === 'products' && state.products[0]?.id === id) return state;
  return { ...state, [type]: state[type].filter(row => row.id !== id) };
}

export function validateForm(state) {
  const fields = Object.fromEntries(Object.entries(state.fields).map(([key, value]) => [key, String(value ?? '').replace(/\s+/g, ' ').trim()]));
  const errors = [];
  const required = { customerName: 'Name of Customer', personInCharge: 'Person in Charge', lineBusiness: 'Line Business', idealPrice: 'Ideal Price', quantityFirst: 'First Order estimation', quantityAverage: 'Average estimation', quantityMaximum: 'Maximum estimation' };
  for (const [key, label] of Object.entries(required)) if (!fields[key]) errors.push({ key, message: `${label} is required.` });
  for (const key of Object.keys(CHOICES)) {
    if (key === 'paymentInfo' && fields.businessRelationship !== 'Old Customer') continue;
    if (!CHOICES[key].includes(fields[key])) errors.push({ key, message: `Please select ${key === 'paymentInfo' ? 'Payment Info for the old customer' : FIELD_NAMES[key].replaceAll('-', ' ')}.` });
  }
  for (const key of ['idealPrice', 'quantityFirst', 'quantityAverage', 'quantityMaximum']) {
    if (fields[key] && !Number.isFinite(Number(fields[key]))) errors.push({ key, message: 'Enter a valid number.' });
  }
  for (const item of state.products) if (!item.name.trim()) errors.push({ key: `product-${item.id}`, message: 'Enter a product name.' });
  if (!state.products.length) errors.push({ key: 'products', message: 'Enter at least one product.' });
  if (fields.businessRelationship === 'Old Customer') {
    for (const item of state.purchasedItems) {
      const count = [item.product, item.quantity, item.price].filter(value => String(value).trim()).length;
      if (count > 0 && count < 3) errors.push({ key: `purchased-${item.id}`, message: 'Complete product, quantity, and price, or leave the whole row empty.' });
      else if (count === 3 && (!Number.isFinite(Number(item.quantity)) || !Number.isFinite(Number(item.price)))) errors.push({ key: `purchased-${item.id}`, message: 'Enter a valid quantity and price.' });
    }
  } else fields.paymentInfo = '';
  return { errors, model: { fields, purchasedItems: state.purchasedItems.map(item => ({ ...item })), products: state.products.map(item => ({ ...item })) } };
}

export function printTitle(customer, date = new Date()) {
  const pad = number => String(number).padStart(2, '0');
  return `Pricing ${customer || 'Unknown'} (current ${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()})`;
}

export function previewGeometry({ availableWidth, documentWidth, documentHeight, zoom = 'fit' }) {
  const scale = zoom === 'fit' ? Math.min(1, Math.max(1, availableWidth) / documentWidth) : Math.max(.25, Math.min(2, Number(zoom) / 100));
  return { scale, width: documentWidth * scale, height: documentHeight * scale };
}
