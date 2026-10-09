import { previewGeometry } from './logic.js';

export function createPreview({ viewport, spacer, sheet, documentElement, zoom, label }) {
  let visible = false;
  let printing = false;
  let frame = 0;
  function update() {
    frame = 0;
    if (!visible || printing) return;
    const style = getComputedStyle(viewport);
    const documentStyle = getComputedStyle(documentElement);
    const geometry = previewGeometry({ availableWidth: viewport.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight), documentWidth: parseFloat(documentStyle.width), documentHeight: parseFloat(documentStyle.height), zoom: zoom.value });
    spacer.style.setProperty('--preview-width', `${geometry.width}px`);
    spacer.style.setProperty('--preview-height', `${geometry.height}px`);
    sheet.style.setProperty('--preview-scale', String(geometry.scale));
    label.textContent = `${Math.round(geometry.scale * 100)}%`;
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(update); }
  const observer = new ResizeObserver(schedule);
  observer.observe(viewport);
  observer.observe(documentElement);
  zoom.addEventListener('change', schedule);
  window.addEventListener('resize', schedule);
  document.fonts?.addEventListener('loadingdone', schedule);
  return {
    show() { visible = true; schedule(); },
    hide() { visible = false; cancelAnimationFrame(frame); frame = 0; },
    reset() { zoom.value = 'fit'; viewport.scrollTo(0, 0); schedule(); },
    setPrinting(value) { printing = value; if (!value) schedule(); },
    destroy() { observer.disconnect(); cancelAnimationFrame(frame); zoom.removeEventListener('change', schedule); window.removeEventListener('resize', schedule); document.fonts?.removeEventListener('loadingdone', schedule); }
  };
}
