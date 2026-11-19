// Neon Coast Cover Studio: wires the editor page. Loads the user's photos (file
// input) and the two bundled samples, fills the panels, lets the user drag a panel
// to reposition its crop, zoom it, switch one of six layouts and five grades, edit
// the caption and subtitle, undo/redo every change, and export a PNG in the four
// post sizes. A `?shot=` query sets up a fixed scene for screenshots (./shots.js).
import { drawCover, LAYOUTS, GRADES, SIZES, panelRects, cropSlack } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const captionInput = document.getElementById('caption');
const subtitleInput = document.getElementById('subtitle');
const statusEl = document.getElementById('status');
const zoomSlider = document.getElementById('zoom');
const sizeSelect = document.getElementById('size');

export const state = {
  layout: 'nine',
  grade: 'sunset',
  caption: 'NEON COAST',
  subtitle: 'Vice nights, golden days',
  photos: [null, null, null],
  photoNames: ['Empty', 'Empty', 'Empty'],
  // The grid opens sliced: each panel shows a different part of the photo, so
  // the cover reads as one poster instead of nine repeated tiles.
  panels: Array.from({ length: 9 }, (_, i) => ({
    photo: i % 3 === 0 ? 0 : i % 3,
    zoom: 1.15,
    ox: (1 - (i % 3)) * 0.45,
    oy: (1 - Math.floor(i / 3)) * 0.45,
  })),
  grain: true,
  vignette: true,
  size: 'square',
  selected: 0,
};

let history = [];
let future = [];
let dragging = null;

function snapshot() {
  return JSON.stringify({
    layout: state.layout, grade: state.grade, caption: state.caption,
    subtitle: state.subtitle, panels: state.panels, grain: state.grain,
    vignette: state.vignette, size: state.size, selected: state.selected,
    photoNames: state.photoNames,
    photoSlots: state.photos.map((p, i) => (p ? p.dataset.slot ?? i : null)),
  });
}

function pushHistory() {
  history.push(snapshot());
  if (history.length > 60) history.shift();
  future = [];
  updateUndoButtons();
}

function restore(json) {
  const s = JSON.parse(json);
  state.layout = s.layout;
  state.grade = s.grade;
  state.caption = s.caption;
  state.subtitle = s.subtitle;
  state.panels = s.panels;
  state.grain = s.grain;
  state.vignette = s.vignette;
  state.size = s.size;
  state.selected = s.selected;
  state.photoNames = s.photoNames;
  syncControls();
  render();
}

export function undo() {
  if (!history.length) return;
  future.push(snapshot());
  restore(history.pop());
  updateUndoButtons();
}

export function redo() {
  if (!future.length) return;
  history.push(snapshot());
  restore(future.pop());
  updateUndoButtons();
}

function updateUndoButtons() {
  document.getElementById('undo').disabled = history.length === 0;
  document.getElementById('redo').disabled = future.length === 0;
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function render() {
  const size = SIZES[state.size] || SIZES.square;
  drawCover(canvas, state, size.w, size.h);
  const sel = document.querySelector('.panel-chip.selected');
  if (sel) sel.textContent = `Panel ${state.selected + 1} selected — drag on the cover to move its crop`;
}

function syncControls() {
  captionInput.value = state.caption;
  subtitleInput.value = state.subtitle;
  zoomSlider.value = String((state.panels[state.selected]?.zoom || 1));
  document.getElementById('zoomVal').textContent = `${Math.round((state.panels[state.selected]?.zoom || 1) * 100)}%`;
  sizeSelect.value = state.size;
  document.querySelectorAll('[data-layout]').forEach((b) => {
    b.classList.toggle('active', b.dataset.layout === state.layout);
    b.setAttribute('aria-pressed', String(b.dataset.layout === state.layout));
  });
  document.querySelectorAll('[data-grade]').forEach((b) => {
    b.classList.toggle('active', b.dataset.grade === state.grade);
    b.setAttribute('aria-pressed', String(b.dataset.grade === state.grade));
  });
  document.getElementById('grain').checked = state.grain;
  document.getElementById('vignette').checked = state.vignette;
  document.querySelectorAll('.slot').forEach((slot, i) => {
    slot.querySelector('.slot-name').textContent = state.photoNames[i];
    slot.classList.toggle('filled', Boolean(state.photos[i]));
  });
}

function setStatus(text) {
  statusEl.textContent = text;
}

/** Puts an image into a photo slot and fills empty panels with it. */
function setPhotoSlot(slot, img, name) {
  state.photos[slot] = img;
  state.photoNames[slot] = name;
  img.dataset.slot = String(slot);
  state.panels.forEach((p) => {
    if (!state.photos[p.photo]) p.photo = slot;
  });
  syncControls();
  render();
}

async function loadSample(slot, file, name) {
  try {
    const img = await loadImage(`samples/${file}`);
    pushHistory();
    setPhotoSlot(slot, img, name);
    setStatus(`${name} loaded into photo slot ${slot + 1}.`);
  } catch {
    setStatus(`Could not load ${name}.`);
  }
}

document.getElementById('photoFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const slot = Number(document.querySelector('.slot-picker:checked')?.value ?? 0);
  const img = await loadImage(URL.createObjectURL(file));
  pushHistory();
  setPhotoSlot(slot, img, file.name.length > 22 ? `${file.name.slice(0, 19)}…` : file.name);
  setStatus(`Your photo is in slot ${slot + 1} — click a panel, then a photo, to place it.`);
  e.target.value = '';
});

document.querySelectorAll('[data-sample]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const slot = Number(document.querySelector('.slot-picker:checked')?.value ?? 0);
    loadSample(slot, btn.dataset.sample, btn.dataset.sampleName);
  });
});

document.querySelectorAll('.slot').forEach((slotEl, i) => {
  slotEl.addEventListener('click', () => {
    if (!state.photos[i]) {
      setStatus(`Slot ${i + 1} is empty — load a sample or your own photo first.`);
      return;
    }
    pushHistory();
    state.panels[state.selected].photo = i;
    render();
    setStatus(`Panel ${state.selected + 1} now shows photo ${i + 1} (${state.photoNames[i]}).`);
  });
});

document.getElementById('fillAll').addEventListener('click', () => {
  const slot = Number(document.querySelector('.slot-picker:checked')?.value ?? 0);
  if (!state.photos[slot]) {
    setStatus(`Slot ${slot + 1} is empty — load a photo first.`);
    return;
  }
  pushHistory();
  state.panels.forEach((p) => { p.photo = slot; });
  render();
  setStatus(`All panels filled with photo ${slot + 1}.`);
});

captionInput.addEventListener('input', () => {
  state.caption = captionInput.value;
  render();
});
captionInput.addEventListener('change', pushHistory);
subtitleInput.addEventListener('input', () => {
  state.subtitle = subtitleInput.value;
  render();
});
subtitleInput.addEventListener('change', pushHistory);

document.querySelectorAll('[data-layout]').forEach((btn) => {
  btn.addEventListener('click', () => {
    if (state.layout === btn.dataset.layout) return;
    pushHistory();
    state.layout = btn.dataset.layout;
    state.selected = 0;
    syncControls();
    render();
    setStatus(`${LAYOUTS[state.layout].name} layout.`);
  });
});

document.querySelectorAll('[data-grade]').forEach((btn) => {
  btn.addEventListener('click', () => {
    if (state.grade === btn.dataset.grade) return;
    pushHistory();
    state.grade = btn.dataset.grade;
    syncControls();
    render();
    setStatus(`${GRADES[state.grade].name} grade.`);
  });
});

document.getElementById('grain').addEventListener('change', (e) => {
  pushHistory();
  state.grain = e.target.checked;
  render();
});
document.getElementById('vignette').addEventListener('change', (e) => {
  pushHistory();
  state.vignette = e.target.checked;
  render();
});

zoomSlider.addEventListener('input', () => {
  state.panels[state.selected].zoom = Number(zoomSlider.value);
  document.getElementById('zoomVal').textContent = `${Math.round(Number(zoomSlider.value) * 100)}%`;
  render();
});
zoomSlider.addEventListener('change', pushHistory);

sizeSelect.addEventListener('change', () => {
  pushHistory();
  state.size = sizeSelect.value;
  render();
  setStatus(`Preview now ${SIZES[state.size].label}.`);
});

document.getElementById('undo').addEventListener('click', undo);
document.getElementById('redo').addEventListener('click', redo);
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
    e.preventDefault();
    undo();
  } else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
    e.preventDefault();
    redo();
  }
});

// Canvas pointing: click selects a panel, drag pans its crop, wheel zooms it.
function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  const size = SIZES[state.size] || SIZES.square;
  return {
    x: ((e.clientX - r.left) / r.width) * size.w,
    y: ((e.clientY - r.top) / r.height) * size.h,
  };
}

function hitPanel(p) {
  const size = SIZES[state.size] || SIZES.square;
  const geo = panelRects(state.layout, size.w, size.h);
  for (let i = geo.panels.length - 1; i >= 0; i--) {
    const rc = geo.panels[i];
    // Undo a tilt for the hit test.
    let lx = p.x;
    let ly = p.y;
    if (rc.rot) {
      const cx = rc.x + rc.w / 2;
      const cy = rc.y + rc.h / 2;
      const a = (-rc.rot * Math.PI) / 180;
      const dx = p.x - cx;
      const dy = p.y - cy;
      lx = cx + dx * Math.cos(a) - dy * Math.sin(a);
      ly = cy + dx * Math.sin(a) + dy * Math.cos(a);
    }
    if (lx >= rc.x && lx <= rc.x + rc.w && ly >= rc.y && ly <= rc.y + rc.h) return i;
  }
  return -1;
}

canvas.addEventListener('pointerdown', (e) => {
  const p = canvasPoint(e);
  const hit = hitPanel(p);
  if (hit === -1) return;
  state.selected = hit;
  syncControls();
  render();
  dragging = { x: p.x, y: p.y, moved: false, crop: { ...state.panels[hit] } };
  canvas.setPointerCapture(e.pointerId);
});

canvas.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const p = canvasPoint(e);
  const size = SIZES[state.size] || SIZES.square;
  const rect = panelRects(state.layout, size.w, size.h).panels[state.selected];
  const crop = state.panels[state.selected];
  const img = state.photos[crop.photo];
  if (img) {
    const slack = cropSlack(img, rect, crop.zoom);
    if (slack.maxOx > 0) crop.ox = Math.max(-1, Math.min(1, dragging.crop.ox + (p.x - dragging.x) / slack.maxOx));
    if (slack.maxOy > 0) crop.oy = Math.max(-1, Math.min(1, dragging.crop.oy + (p.y - dragging.y) / slack.maxOy));
  }
  if (Math.abs(p.x - dragging.x) + Math.abs(p.y - dragging.y) > 2) dragging.moved = true;
  render();
});

canvas.addEventListener('pointerup', () => {
  if (dragging?.moved) pushHistory();
  dragging = null;
});

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const crop = state.panels[state.selected];
  pushHistory();
  crop.zoom = Math.max(1, Math.min(3, crop.zoom * (e.deltaY < 0 ? 1.1 : 0.9)));
  syncControls();
  render();
}, { passive: false });

/** Renders the cover at a post size and downloads it as a PNG. Returns the blob. */
export async function exportPNG(sizeKey) {
  const size = SIZES[sizeKey] || SIZES.square;
  const off = document.createElement('canvas');
  drawCover(off, state, size.w, size.h);
  const blob = await new Promise((resolve) => off.toBlob(resolve, 'image/png'));
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `neon-coast-${size.w}x${size.h}.png`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  setStatus(`Saved neon-coast-${size.w}x${size.h}.png (${size.label}).`);
  return blob;
}

document.querySelectorAll('[data-export]').forEach((btn) => {
  btn.addEventListener('click', () => exportPNG(btn.dataset.export));
});
document.getElementById('exportAll').addEventListener('click', async () => {
  for (const key of Object.keys(SIZES)) {
    await exportPNG(key);
    await new Promise((r) => setTimeout(r, 150));
  }
});

// Test hooks: the finalist review and the shot driver use these, never the network.
window.__exportPNG = async (sizeKey) => {
  const size = SIZES[sizeKey] || SIZES.square;
  const off = document.createElement('canvas');
  drawCover(off, state, size.w, size.h);
  const blob = await new Promise((resolve) => off.toBlob(resolve, 'image/png'));
  return { width: size.w, height: size.h, bytes: blob.size, type: blob.type };
};
window.__appState = state;

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), {
    loadSample: (file, name) => loadSample(0, file, name),
    loadSampleSlot: (slot, file, name) => loadSample(slot, file, name),
    setLayout: (layout) => { state.layout = layout; },
    setGrade: (grade) => { state.grade = grade; },
    setCaption: (text) => { state.caption = text; },
    setSubtitle: (text) => { state.subtitle = text; },
    setSize: (size) => { state.size = size; },
    render,
    syncControls,
  });
} else {
  syncControls();
  render();
  // The bundled boulevard photo loads at once so the first paint is already a cover.
  loadSample(0, 'boulevard.jpg', 'Boulevard sample');
  loadSample(1, 'pier.jpg', 'Pier sample');
}
