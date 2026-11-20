// Screenshot scenes for the entry's screenshots: ?shot=cover draws one exported
// cover full-frame, ?shot=portrait draws a story-size cover, ?shot=tilted draws
// a second landscape cover, and ?shot=editor shows the editor with a photo
// loaded. The app itself draws every scene — nothing is composited outside it.

import { sizeById } from "./cover.js";

const SCENES = {
  cover: {
    bodyClass: "shot-cover",
    size: "wide",
    layout: "hero",
    grade: "sunset",
    caption: "NEON COAST",
    subtitle: "Vice City nights, palm trees & pink skies",
    badge: "★★★★★ LEONIDA",
  },
  portrait: {
    bodyClass: "shot-portrait",
    size: "portrait",
    layout: "nine",
    grade: "neon",
    caption: "NEON COAST",
    subtitle: "nine panels, one sunset",
    badge: "★ 9 PANELS",
  },
  tilted: {
    bodyClass: "shot-cover",
    size: "wide",
    layout: "tilted",
    grade: "gold",
    caption: "GOLDEN HOUR",
    subtitle: "boulevard cruise at dusk",
    badge: "★★★★★ PIER 9",
  },
  editor: {
    bodyClass: "",
    size: "square",
    layout: "tilted",
    grade: "sunset",
    caption: "NEON COAST",
    subtitle: "Vice City nights, palm trees & pink skies",
    badge: "★★★★★ LEONIDA",
  },
};

export function initShotMode(deps) {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get("shot");
  if (!shot || !SCENES[shot]) return false;
  const scene = SCENES[shot];
  const { state, render, canvas } = deps;

  state.layout = scene.layout;
  state.grade = scene.grade;
  state.size = scene.size;
  state.caption = scene.caption;
  state.subtitle = scene.subtitle;
  state.badge = scene.badge;
  // spread the two sample photos across the panels
  state.panelPhoto = [0, 1, 0, 1, 0, 1, 0, 1, 0];
  state.crops = state.crops.map((c, i) => ({ zoom: 1.2, x: i % 2 ? 0.08 : -0.06, y: 0 }));

  const s = sizeById(scene.size);
  canvas.width = s.w;
  canvas.height = s.h;
  if (scene.bodyClass) document.body.classList.add(scene.bodyClass);

  const finish = () => {
    render();
    // draw once more after webfonts arrive so the title uses Anton/Pacifico
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => {
        render();
        window.__shotReady = true;
      });
    } else {
      window.__shotReady = true;
    }
  };

  // Captions / selects in the editor chrome reflect the scene too.
  const captionInput = document.getElementById("captionInput");
  if (captionInput) captionInput.value = state.caption;
  const subtitleInput = document.getElementById("subtitleInput");
  if (subtitleInput) subtitleInput.value = state.subtitle;
  const badgeInput = document.getElementById("badgeInput");
  if (badgeInput) badgeInput.value = state.badge;
  const note = document.getElementById("previewNote");
  if (note) note.textContent = `${s.w} × ${s.h} · click a panel to select it · drag on a panel to pan it`;

  finish();
  return true;
}
