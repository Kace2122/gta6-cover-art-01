// Fixed scenes for screenshots: ?shot=cover shows the exported cover alone, full
// frame, drawn by the app itself at the viewport's size; ?shot=editor shows the
// editor with a sample photo loaded. Query params pick the sample photo, caption,
// subtitle, layout, grade and post size. window.__shotReady is set once the fonts
// and photos have loaded and the cover has painted.
import { drawCover } from './cover.js';

/** Slices one photo across a grid: each panel shows a different part of it. */
function slicePanels(state, cols, rows, amount, zoom) {
  state.panels.forEach((p, i) => {
    p.photo = 0;
    p.zoom = zoom;
    p.ox = ((cols - 1) / 2 - (i % cols)) * amount;
    p.oy = ((rows - 1) / 2 - Math.floor(i / cols)) * amount;
  });
}

export async function runShot(shot, query, app) {
  const photo = query.get('photo') ?? 'boulevard';
  const caption = query.get('caption') ?? 'NEON COAST';
  const subtitle = query.get('subtitle') ?? 'Vice nights, golden days';
  const layout = query.get('layout') ?? 'nine';
  const grade = query.get('grade') ?? 'sunset';
  const size = query.get('size') ?? 'square';

  try {
    await document.fonts.load('400 100px Anton');
    await document.fonts.load('400 100px Pacifico');
    await document.fonts.ready;
  } catch {
    // System fallbacks still letter the cover; a missing font never blocks a shot.
  }

  app.setCaption(caption);
  app.setSubtitle(subtitle);
  app.setLayout(layout);
  app.setGrade(grade);
  app.setSize(size);

  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    await app.loadSample(`${photo}.jpg`, `${photo} sample`);
    const state = window.__appState;
    // One photo sliced across the panels: each panel shows a different crop of
    // the same photo, so the grid reads as a single poster, not a repeated tile.
    // A positive offset moves the photo so the window shows its top/left part.
    if (layout === 'tilted') {
      const crops = [
        { ox: 0.9, oy: 0.9 },
        { ox: -0.9, oy: -0.5 },
        { ox: 0, oy: -0.9 },
      ];
      state.panels.forEach((p, i) => {
        p.photo = 0;
        p.zoom = 1.1;
        p.ox = crops[i % 3].ox;
        p.oy = crops[i % 3].oy;
      });
    } else if (layout === 'nine' || layout === 'four') {
      const cols = layout === 'four' ? 2 : 3;
      const rows = layout === 'four' ? 2 : 3;
      slicePanels(state, cols, rows, 0.9, 1.15);
    } else {
      // The hero and full-bleed layouts want the whole photo, not a slice.
      state.panels.forEach((p) => { p.zoom = 1; p.ox = 0; p.oy = 0; });
    }
    const canvas = document.getElementById('cover');
    drawCover(canvas, state, window.innerWidth, window.innerHeight);
  } else {
    // Editor scene: the full app, both samples loaded and alternating across
    // the panels, ready to be used.
    await app.loadSample(`${photo}.jpg`, `${photo} sample`);
    await app.loadSampleSlot(1, 'pier.jpg', 'Pier sample');
    const state = window.__appState;
    state.panels.forEach((p, i) => {
      p.photo = i % 2;
      p.zoom = 1.15;
      p.ox = (1 - (i % 3)) * 0.45;
      p.oy = (1 - Math.floor(i / 3)) * 0.45;
    });
    app.syncControls();
    app.render();
  }

  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
