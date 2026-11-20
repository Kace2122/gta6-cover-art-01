// Neon Coast Cover Studio — editor wiring: state, uploads, panel picking,
// undo/redo, live preview and PNG export. Imports the cover engine and the
// screenshot scenes; all drawing lives in cover.js.

import { LAYOUTS, GRADES, SIZES, layoutById, panelCount, panelRects, sizeById, drawCover } from "./cover.js";
import { initShotMode } from "./shots.js";

const $ = (id) => document.getElementById(id);
const canvas = $("previewCanvas");
const ctx = canvas.getContext("2d");

const SAMPLE_URLS = ["samples/boulevard.jpg", "samples/pier.jpg"];

function defaultCrops(n) {
  return Array.from({ length: n }, () => ({ zoom: 1.15, x: 0, y: 0 }));
}

const state = {
  photos: [null, null, null],
  photoNames: ["", "", ""],
  panelPhoto: [0, 1, 0, 1, 0, 1, 2, 0, 1],
  crops: defaultCrops(9),
  selected: 0,
  caption: "NEON COAST",
  subtitle: "Vice City nights, palm trees & pink skies",
  badge: "★★★★★ LEONIDA",
  layout: "hero",
  grade: "sunset",
  size: "square",
  halftone: true,
  grain: true,
  frame: true,
};

let undoStack = [];
let redoStack = [];

function snapshot() {
  return JSON.stringify({
    panelPhoto: state.panelPhoto,
    crops: state.crops,
    caption: state.caption,
    subtitle: state.subtitle,
    badge: state.badge,
    layout: state.layout,
    grade: state.grade,
    size: state.size,
    halftone: state.halftone,
    grain: state.grain,
    frame: state.frame,
  });
}

function restore(json) {
  const s = JSON.parse(json);
  Object.assign(state, s);
  state.crops = s.crops;
  state.panelPhoto = s.panelPhoto;
  syncControls();
  render();
}

function pushUndo() {
  undoStack.push(snapshot());
  if (undoStack.length > 60) undoStack.shift();
  redoStack = [];
  syncUndoButtons();
}

function doUndo() {
  if (!undoStack.length) return;
  redoStack.push(snapshot());
  restore(undoStack.pop());
  syncUndoButtons();
}

function doRedo() {
  if (!redoStack.length) return;
  undoStack.push(snapshot());
  restore(redoStack.pop());
  syncUndoButtons();
}

function syncUndoButtons() {
  $("undoBtn").disabled = undoStack.length === 0;
  $("redoBtn").disabled = redoStack.length === 0;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function loadSamples() {
  try {
    const [a, b] = await Promise.all(SAMPLE_URLS.map(loadImage));
    state.photos[0] = a;
    state.photos[1] = b;
    state.photoNames[0] = "boulevard.jpg";
    state.photoNames[1] = "pier.jpg";
    buildSlots();
    render();
  } catch (err) {
    console.warn("sample photos did not load", err);
  }
}

function buildSlots() {
  const wrap = $("photoSlots");
  wrap.innerHTML = "";
  state.photos.forEach((photo, i) => {
    const label = document.createElement("label");
    label.className = "slot" + (photo ? " filled" : "");
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      try {
        state.photos[i] = await loadImage(url);
        state.photoNames[i] = file.name;
        buildSlots();
        buildPanelStrip();
        render();
      } catch (err) {
        console.warn("photo did not load", err);
      }
    });
    label.appendChild(input);
    if (photo) {
      const img = document.createElement("img");
      img.src = photo.src;
      img.alt = state.photoNames[i] || `Photo ${i + 1}`;
      label.appendChild(img);
      const span = document.createElement("span");
      span.textContent = (state.photoNames[i] || `Photo ${i + 1}`).slice(0, 18);
      label.appendChild(span);
    } else {
      label.appendChild(document.createTextNode(`Photo ${i + 1}\n+ add image`));
    }
    wrap.appendChild(label);
  });
}

function buildChips(containerId, items, current, onPick) {
  const wrap = $(containerId);
  wrap.innerHTML = "";
  items.forEach((item) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = item.name;
    btn.title = item.blurb || item.name;
    if (item.id === current) btn.classList.add("active");
    btn.addEventListener("click", () => {
      pushUndo();
      onPick(item.id);
      buildChips(containerId, items, item.id, onPick);
      render();
    });
    wrap.appendChild(btn);
  });
}

function buildPanelStrip() {
  const wrap = $("panelStrip");
  wrap.innerHTML = "";
  const n = panelCount(state.layout);
  for (let i = 0; i < n; i++) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = `Panel ${i + 1}`;
    if (i === state.selected) btn.classList.add("active");
    btn.addEventListener("click", () => selectPanel(i));
    wrap.appendChild(btn);
  }
}

function selectPanel(i) {
  state.selected = i;
  syncControls();
  buildPanelStrip();
  render();
}

function syncControls() {
  $("captionInput").value = state.caption;
  $("subtitleInput").value = state.subtitle;
  $("badgeInput").value = state.badge;
  $("halftoneToggle").checked = state.halftone;
  $("grainToggle").checked = state.grain;
  $("frameToggle").checked = state.frame;
  const crop = state.crops[state.selected] || { zoom: 1.15, x: 0, y: 0 };
  $("zoomSlider").value = String(crop.zoom);
  $("panXSlider").value = String(crop.x);
  $("panYSlider").value = String(crop.y);
  $("panelHint").textContent =
    `Panel ${state.selected + 1} selected · photo ${((state.panelPhoto[state.selected] ?? 0) + 1)} · ${layoutById(state.layout).name}`;
  const sel = $("panelPhotoSelect");
  sel.innerHTML = "";
  state.photos.forEach((photo, i) => {
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = photo ? `Photo ${i + 1} — ${state.photoNames[i]}` : `Photo ${i + 1} — empty`;
    sel.appendChild(opt);
  });
  sel.value = String(state.panelPhoto[state.selected] ?? 0);
  buildChips("layoutChips", LAYOUTS, state.layout, (id) => {
    state.layout = id;
    if (state.selected >= panelCount(id)) state.selected = 0;
    buildPanelStrip();
    syncControls();
  });
  buildChips("gradeChips", GRADES, state.grade, (id) => { state.grade = id; });
  buildChips("sizeChips", SIZES, state.size, (id) => {
    state.size = id;
    const s = sizeById(id);
    canvas.width = s.w;
    canvas.height = s.h;
    $("previewNote").textContent =
      `${s.w} × ${s.h} · click a panel to select it · drag on a panel to pan it`;
  });
}

function render() {
  const s = sizeById(state.size);
  if (canvas.width !== s.w) canvas.width = s.w;
  if (canvas.height !== s.h) canvas.height = s.h;
  drawCover(ctx, s.w, s.h, state);
}

function exportPNG() {
  const s = sizeById(state.size);
  const off = document.createElement("canvas");
  off.width = s.w;
  off.height = s.h;
  drawCover(off.getContext("2d"), s.w, s.h, state);
  off.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safe = (state.caption || "cover").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "cover";
    a.href = url;
    a.download = `neon-coast-${safe}-${s.w}x${s.h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }, "image/png");
}

// Click a panel in the preview to select it; drag to pan the selected panel.
let dragging = null;
function panelAt(clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  const x = (clientX - r.left) * (canvas.width / r.width);
  const y = (clientY - r.top) * (canvas.height / r.height);
  const rects = panelRects(state.layout, canvas.width, canvas.height);
  for (let i = rects.length - 1; i >= 0; i--) {
    const p = rects[i];
    if (x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) return i;
  }
  return -1;
}
canvas.addEventListener("pointerdown", (e) => {
  const i = panelAt(e.clientX, e.clientY);
  if (i < 0) return;
  selectPanel(i);
  dragging = { x: e.clientX, y: e.clientY };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener("pointermove", (e) => {
  if (!dragging) return;
  const r = canvas.getBoundingClientRect();
  const crop = state.crops[state.selected];
  crop.x += ((e.clientX - dragging.x) / r.width) * 1.4;
  crop.y += ((e.clientY - dragging.y) / r.height) * 1.4;
  crop.x = Math.max(-0.5, Math.min(0.5, crop.x));
  crop.y = Math.max(-0.5, Math.min(0.5, crop.y));
  dragging = { x: e.clientX, y: e.clientY };
  syncControls();
  render();
});
canvas.addEventListener("pointerup", () => {
  if (dragging) pushUndo();
  dragging = null;
});

$("captionInput").addEventListener("input", (e) => { state.caption = e.target.value; render(); });
$("captionInput").addEventListener("change", () => pushUndo());
$("subtitleInput").addEventListener("input", (e) => { state.subtitle = e.target.value; render(); });
$("subtitleInput").addEventListener("change", () => pushUndo());
$("badgeInput").addEventListener("input", (e) => { state.badge = e.target.value; render(); });
$("badgeInput").addEventListener("change", () => pushUndo());
$("zoomSlider").addEventListener("input", (e) => {
  state.crops[state.selected].zoom = Number(e.target.value);
  render();
});
$("zoomSlider").addEventListener("change", () => pushUndo());
$("panXSlider").addEventListener("input", (e) => {
  state.crops[state.selected].x = Number(e.target.value);
  render();
});
$("panXSlider").addEventListener("change", () => pushUndo());
$("panYSlider").addEventListener("input", (e) => {
  state.crops[state.selected].y = Number(e.target.value);
  render();
});
$("panYSlider").addEventListener("change", () => pushUndo());
$("panelPhotoSelect").addEventListener("change", (e) => {
  pushUndo();
  state.panelPhoto[state.selected] = Number(e.target.value);
  render();
});
$("halftoneToggle").addEventListener("change", (e) => { pushUndo(); state.halftone = e.target.checked; render(); });
$("grainToggle").addEventListener("change", (e) => { pushUndo(); state.grain = e.target.checked; render(); });
$("frameToggle").addEventListener("change", (e) => { pushUndo(); state.frame = e.target.checked; render(); });
$("exportBtn").addEventListener("click", exportPNG);
$("undoBtn").addEventListener("click", doUndo);
$("redoBtn").addEventListener("click", doRedo);
$("sampleBtn").addEventListener("click", loadSamples);
$("clearBtn").addEventListener("click", () => {
  pushUndo();
  state.photos = [null, null, null];
  state.photoNames = ["", "", ""];
  buildSlots();
  render();
});

buildSlots();
buildPanelStrip();
syncControls();
syncUndoButtons();
render();
loadSamples().then(() => {
  initShotMode({ state, render, loadSamples, selectPanel, canvas });
});
