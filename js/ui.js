import { initializeTheme } from '../assets/family/js/theme.js';
import { createNotifications } from '../assets/family/js/notifications.js';
import { icon } from '../assets/family/js/icons.js';
import { FIELD_NAMES, createState, addRow, removeRow, validateForm } from './logic.js';
import { renderDocument } from './document.js';
import { createPreview } from './preview.js';
import { createPrintController } from './printing.js';

const form = document.querySelector('#pricing-form');
const formView = document.querySelector('#form-view');
const previewView = document.querySelector('#preview-view');
const documentElement = document.querySelector('#a4-document');
const summary = document.querySelector('#validation-summary');
const notifications = createNotifications(document.querySelector('#notifications'));
initializeTheme({ toggle: document.querySelector('#theme-toggle') });
document.querySelectorAll('[data-icon]').forEach(element => { element.innerHTML = icon(element.dataset.icon); });
let state = createState();
let model = null;
const preview = createPreview({ viewport: document.querySelector('#preview-viewport'), spacer: document.querySelector('#preview-size'), sheet: document.querySelector('#preview-sheet'), documentElement, zoom: document.querySelector('#preview-zoom'), label: document.querySelector('#zoom-value') });
const printing = createPrintController({ button: document.querySelector('#print-document'), preview, getModel: () => model, notify: notifications.show });

function readForm() {
  const fields = {};
  for (const [key, name] of Object.entries(FIELD_NAMES)) fields[key] = form.elements.namedItem(name)?.value || '';
  const products = [...document.querySelectorAll('[data-product-row]')].map(row => ({ id: Number(row.dataset.productRow), name: row.querySelector('input').value }));
  const purchasedItems = [...document.querySelectorAll('[data-purchased-row]')].map(row => ({ id: Number(row.dataset.purchasedRow), ...Object.fromEntries([...row.querySelectorAll('input')].map(input => [input.dataset.column, input.value])) }));
  state = { ...state, fields, products, purchasedItems };
}

function createInput({ label, value, id, type = 'text', column }) {
  const wrapper = document.createElement('label');
  wrapper.textContent = label;
  const input = document.createElement('input');
  input.type = type;
  input.id = id;
  input.name = id;
  input.value = value;
  if (type === 'number') input.step = 'any';
  if (column) input.dataset.column = column;
  wrapper.append(input);
  return wrapper;
}

function removeButton(type, id, index) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'isi-button isi-button--icon isi-button--danger';
  button.innerHTML = icon('close');
  button.setAttribute('aria-label', `Remove ${type === 'products' ? 'product' : 'purchased item'} ${index + 1}`);
  button.addEventListener('click', () => {
    readForm();
    state = removeRow(state, type, id);
    clearErrors();
    renderRows(type);
    document.querySelector(type === 'products' ? '#add-product' : '#add-purchased').focus();
  });
  return button;
}

function renderRows(type) {
  const container = document.querySelector(type === 'products' ? '#product-names' : '#purchased-items');
  container.replaceChildren();
  state[type].forEach((item, index) => {
    const row = document.createElement('div');
    row.className = type === 'products' ? 'product-row' : 'purchased-row';
    row.dataset.field = `${type === 'products' ? 'product' : 'purchased'}-${item.id}`;
    if (type === 'products') {
      row.dataset.productRow = item.id;
      row.append(createInput({ label: `Name of Product ${index + 1}`, value: item.name, id: `product-${item.id}` }));
      row.querySelector('input').required = true;
      if (index > 0) row.append(removeButton(type, item.id, index));
    } else {
      row.dataset.purchasedRow = item.id;
      for (const [column, label, inputType] of [['product', 'Product Name', 'text'], ['quantity', 'Qty (kg)', 'number'], ['price', 'Price (US$)', 'number']]) row.append(createInput({ label, value: item[column], id: `purchased-${item.id}-${column}`, type: inputType, column }));
      row.append(removeButton(type, item.id, index));
    }
    container.append(row);
  });
  document.querySelector('#add-purchased').hidden = state.purchasedItems.length >= 3;
}

function customerChanged() {
  const relationship = form.elements.namedItem('business-relationship').value;
  const oldCustomer = relationship === 'Old Customer';
  document.querySelector('#customer-history').hidden = !oldCustomer;
  document.querySelectorAll('[name="payment-info"]').forEach(input => {
    input.required = oldCustomer;
    if (!oldCustomer) input.checked = false;
  });
}

function clearErrors() {
  form.querySelectorAll('.isi-field-error').forEach(element => element.remove());
  form.querySelectorAll('[aria-invalid]').forEach(element => { element.removeAttribute('aria-invalid'); element.removeAttribute('aria-describedby'); });
  summary.hidden = true;
  summary.textContent = '';
}

function displayErrors(errors) {
  clearErrors();
  let firstInput = null;
  errors.forEach((error, index) => {
    const field = document.getElementById(FIELD_NAMES[error.key]);
    const group = form.querySelector(`[data-field="${error.key}"]`);
    const wrapper = field?.parentElement || group;
    if (!wrapper) return;
    const message = document.createElement('p');
    message.className = 'isi-field-error';
    message.id = `validation-${index}`;
    message.textContent = error.message;
    wrapper.append(message);
    const controls = field ? [field] : [...wrapper.querySelectorAll('input')];
    controls.forEach(input => { input.setAttribute('aria-invalid', 'true'); input.setAttribute('aria-describedby', message.id); });
    firstInput ||= controls[0];
  });
  summary.textContent = `${errors.length === 1 ? 'One field needs' : `${errors.length} fields need`} attention. ${errors[0].message}`;
  summary.hidden = false;
  notifications.show('Please check the highlighted fields.', { key: 'validation', tone: 'error' });
  firstInput?.focus();
}

function showForm() {
  printing.cancel();
  model = null;
  document.documentElement.removeAttribute('data-document-ready');
  preview.hide();
  previewView.hidden = true;
  formView.hidden = false;
  document.querySelector('.isi-skip-link').href = '#form-view';
  document.querySelector('#generate-document').focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

function resetForm() {
  printing.cancel();
  form.reset();
  state = createState();
  model = null;
  documentElement.replaceChildren();
  renderRows('products');
  renderRows('purchasedItems');
  clearErrors();
  customerChanged();
  preview.reset();
  showForm();
  document.querySelector('#customer-name').focus({ preventScroll: true });
  notifications.clear();
  notifications.show('Form reset.');
}

form.addEventListener('submit', event => {
  event.preventDefault();
  if (formView.hidden) return;
  readForm();
  const result = validateForm(state);
  if (result.errors.length) { displayErrors(result.errors); return; }
  clearErrors();
  model = result.model;
  notifications.clear();
  documentElement.innerHTML = renderDocument(model);
  document.documentElement.dataset.documentReady = 'true';
  formView.hidden = true;
  previewView.hidden = false;
  document.querySelector('.isi-skip-link').href = '#preview-viewport';
  preview.reset();
  preview.show();
  document.querySelector('#back-to-form').focus({ preventScroll: true });
  window.scrollTo(0, 0);
});
for (const [id, type] of [['add-product', 'products'], ['add-purchased', 'purchasedItems']]) document.getElementById(id).addEventListener('click', () => {
  readForm();
  state = addRow(state, type);
  clearErrors();
  renderRows(type);
  const target = type === 'products' ? '#product-names' : '#purchased-items';
  document.querySelector(`${target} > :last-child input`)?.focus();
});
document.querySelectorAll('[name="business-relationship"]').forEach(input => input.addEventListener('change', () => { customerChanged(); clearErrors(); }));
document.querySelector('#reset-form').addEventListener('click', resetForm);
document.querySelector('#new-form').addEventListener('click', resetForm);
document.querySelector('#back-to-form').addEventListener('click', showForm);
window.addEventListener('pagehide', () => { printing.cancel(); notifications.clear(); });
renderRows('products');
renderRows('purchasedItems');
customerChanged();
