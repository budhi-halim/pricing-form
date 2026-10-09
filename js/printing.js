import { printTitle } from './logic.js';

export function createPrintController({ button, preview, getModel, notify }) {
  let phase = 'idle';
  let generation = 0;
  let originalTitle = null;
  let destroyed = false;
  const printMedia = window.matchMedia('print');
  function restore() {
    if (originalTitle !== null) document.title = originalTitle;
    originalTitle = null;
    phase = 'idle';
    button.disabled = false;
    button.removeAttribute('aria-busy');
    document.documentElement.removeAttribute('data-printing');
    preview.setPrinting(false);
  }
  function beforePrint() {
    const model = getModel();
    if (!model) return;
    if (originalTitle === null) originalTitle = document.title;
    document.title = printTitle(model.fields.customerName);
    phase = 'printing';
    document.documentElement.dataset.printing = 'true';
    preview.setPrinting(true);
  }
  function afterPrint() { generation++; restore(); }
  const onMediaChange = event => { if (!event.matches && phase === 'printing') afterPrint(); };
  async function print() {
    if (destroyed || phase !== 'idle' || !getModel()) return;
    phase = 'preparing';
    const ticket = ++generation;
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    try {
      await document.fonts?.ready;
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      if (destroyed || ticket !== generation || !getModel()) return;
      beforePrint();
      window.print();
      // Chromium's dialog blocks this call; afterprint handles non-blocking engines.
      if (phase === 'printing' && !printMedia.matches) restore();
    } catch {
      if (!destroyed && ticket === generation) { restore(); notify('The print dialog could not open. Please try again.', { tone: 'error' }); }
    }
  }
  button.addEventListener('click', print);
  window.addEventListener('beforeprint', beforePrint);
  window.addEventListener('afterprint', afterPrint);
  printMedia.addEventListener('change', onMediaChange);
  return {
    cancel() { generation++; restore(); },
    destroy() { destroyed = true; generation++; restore(); button.removeEventListener('click', print); window.removeEventListener('beforeprint', beforePrint); window.removeEventListener('afterprint', afterPrint); printMedia.removeEventListener('change', onMediaChange); }
  };
}
