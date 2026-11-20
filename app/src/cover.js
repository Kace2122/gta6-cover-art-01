// Neon Coast cover engine: draws a multi-panel GTA-style poster cover onto a
// 2D canvas. Pure drawing code — no network, no DOM reads except the images
// handed in through the state object.

export const LAYOUTS = [
  { id: "hero", name: "Hero Grid", panels: 4, blurb: "One hero panel, three stacked" },
  { id: "tilted", name: "Tilted Snaps", panels: 3, blurb: "Overlapping tilted snapshots" },
  { id: "full", name: "Full Bleed", panels: 1, blurb: "One photo, edge to edge" },
  { id: "nine", name: "Nine Panel", panels: 9, blurb: "A 3 by 3 poster grid" },
];

export const GRADES = [
  {
    id: "sunset", name: "Vice Sunset",
    sky: ["#ff9a3d", "#ff4d6d", "#7b2fbe"],
    tint: "#ff5a3c", wash: "#2b0a4d", accent: "#ffb02e", ink: "#fff6e8",
  },
  {
    id: "neon", name: "Neon Coast",
    sky: ["#0ff0c8", "#0a7cff", "#ff2e88"],
    tint: "#00e5c0", wash: "#12003d", accent: "#ff4d9d", ink: "#eafcff",
  },
  {
    id: "gold", name: "Golden Hour",
    sky: ["#ffd76a", "#ff8a3d", "#c22e6e"],
    tint: "#ffb02e", wash: "#3d1200", accent: "#fff3c4", ink: "#fff8e6",
  },
  {
    id: "midnight", name: "Midnight Palm",
    sky: ["#5a3df0", "#1b0f4d", "#ff2e88"],
    tint: "#7b5cff", wash: "#05001a", accent: "#2ee6c8", ink: "#f2ecff",
  },
];

export const SIZES = [
  { id: "square", name: "Square · 1080 × 1080", w: 1080, h: 1080 },
  { id: "portrait", name: "Story · 1080 × 1350", w: 1080, h: 1350 },
  { id: "wide", name: "Wide · 1920 × 1080", w: 1920, h: 1080 },
];

export function layoutById(id) {
  return LAYOUTS.find((l) => l.id === id) || LAYOUTS[0];
}
export function gradeById(id) {
  return GRADES.find((g) => g.id === id) || GRADES[0];
}
export function sizeById(id) {
  return SIZES.find((s) => s.id === id) || SIZES[0];
}

export function panelCount(layoutId) {
  return layoutById(layoutId).panels;
}

// Panel rectangles in cover pixels. The bottom band (about 22% of the height)
// is reserved for the title block; panels live above it.
export function panelRects(layoutId, W, H) {
  const band = Math.round(H * 0.22);
  const top = 0;
  const areaH = H - band;
  const g = Math.max(4, Math.round(W * 0.006)); // gutter
  if (layoutId === "hero") {
    const heroW = Math.round(W * 0.60);
    const sideW = W - heroW;
    const third = Math.floor((areaH - g * 2) / 3);
    return [
      { x: 0, y: top, w: heroW - g, h: areaH },
      { x: heroW, y: top, w: sideW, h: third },
      { x: heroW, y: top + third + g, w: sideW, h: third },
      { x: heroW, y: top + (third + g) * 2, w: sideW, h: areaH - (third + g) * 2 },
    ];
  }
  if (layoutId === "tilted") {
    const pw = Math.round(W * 0.42);
    const ph = Math.round(areaH * 0.86);
    return [
      { x: Math.round(W * 0.03), y: Math.round(areaH * 0.04), w: pw, h: ph, rot: -0.07 },
      { x: Math.round(W * 0.30), y: Math.round(areaH * 0.10), w: pw, h: ph, rot: 0.05 },
      { x: Math.round(W * 0.56), y: Math.round(areaH * 0.03), w: pw, h: ph, rot: -0.03 },
    ];
  }
  if (layoutId === "full") {
    return [{ x: 0, y: 0, w: W, h: H }];
  }
  // nine: 3 x 3 grid
  const cw = Math.floor((W - g * 2) / 3);
  const ch = Math.floor((areaH - g * 2) / 3);
  const rects = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      rects.push({ x: c * (cw + g), y: r * (ch + g), w: cw, h: ch });
    }
  }
  return rects;
}

function coverFitDraw(ctx, img, rect, crop) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const zoom = crop?.zoom ?? 1.15;
  const scale = Math.max(rect.w / iw, rect.h / ih) * zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = rect.x + (rect.w - dw) / 2 + (crop?.x ?? 0) * rect.w * 0.45;
  const dy = rect.y + (rect.h - dh) / 2 + (crop?.y ?? 0) * rect.h * 0.45;
  ctx.drawImage(img, dx, dy, dw, dh);
}

function paintPlaceholder(ctx, rect, grade, index) {
  const grad = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
  grad.addColorStop(0, grade.sky[0]);
  grad.addColorStop(0.55, grade.sky[1]);
  grad.addColorStop(1, grade.sky[2]);
  ctx.fillStyle = grad;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  // sun disc + palm-ish diagonal stripes, all drawn, no assets
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.beginPath();
  ctx.arc(rect.x + rect.w * 0.72, rect.y + rect.h * 0.30, Math.min(rect.w, rect.h) * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = Math.max(2, rect.w * 0.01);
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(rect.x + rect.w * (0.1 + i * 0.2), rect.y + rect.h);
    ctx.lineTo(rect.x + rect.w * (0.3 + i * 0.2), rect.y + rect.h * 0.55);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = `700 ${Math.max(14, rect.w * 0.055)}px Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(`ADD PHOTO ${index + 1}`, rect.x + rect.w / 2, rect.y + rect.h * 0.52);
}

function gradeWash(ctx, rect, grade) {
  ctx.save();
  ctx.globalCompositeOperation = "overlay";
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = grade.tint;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
  const wash = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  wash.addColorStop(0, "rgba(255,255,255,0.10)");
  wash.addColorStop(0.7, "rgba(0,0,0,0)");
  wash.addColorStop(1, grade.wash);
  ctx.save();
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = wash;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

function fitFont(ctx, text, maxWidth, startPx, family, weight) {
  let px = startPx;
  while (px > 12) {
    ctx.font = `${weight} ${px}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) return px;
    px -= 2;
  }
  return px;
}

function halftoneBand(ctx, x, y, w, h, color) {
  const step = Math.max(7, Math.round(w / 90));
  ctx.save();
  for (let row = 0; row * step < h; row++) {
    for (let col = 0; col * step < w; col++) {
      const fade = 1 - row * step / h;
      const r = step * 0.32 * fade + 0.6;
      ctx.globalAlpha = 0.16 + 0.30 * fade;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x + col * step + step / 2, y + row * step + step / 2, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function seededDots(ctx, W, H, seed, count, color) {
  let s = seed || 7;
  const next = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  ctx.save();
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    ctx.globalAlpha = 0.05 + next() * 0.12;
    const r = 0.6 + next() * 1.6;
    ctx.fillRect(next() * W, next() * H, r, r);
  }
  ctx.restore();
}

export function drawCover(ctx, W, H, st) {
  const grade = gradeById(st.grade);
  const bandH = Math.round(H * 0.22);
  const bandY = H - bandH;
  const rects = panelRects(st.layout, W, H);

  // Sky backdrop behind the gutters.
  const sky = ctx.createLinearGradient(0, 0, W, H);
  sky.addColorStop(0, grade.sky[0]);
  sky.addColorStop(0.5, grade.sky[1]);
  sky.addColorStop(1, grade.sky[2]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Panels.
  rects.forEach((rect, i) => {
    const photo = st.photos?.[st.panelPhoto?.[i] ?? (i % 3)] ?? null;
    const crop = st.crops?.[i] ?? { zoom: 1.15, x: 0, y: 0 };
    ctx.save();
    if (rect.rot) {
      ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
      ctx.rotate(rect.rot);
      ctx.translate(-rect.w / 2, -rect.h / 2);
      ctx.beginPath();
      ctx.rect(0, 0, rect.w, rect.h);
      ctx.clip();
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(-6, -6, rect.w + 12, rect.h + 12);
      const inner = { x: 5, y: 5, w: rect.w - 10, h: rect.h - 10 };
      if (photo) coverFitDraw(ctx, photo, inner, crop);
      else paintPlaceholder(ctx, inner, grade, i);
      gradeWash(ctx, inner, grade);
    } else {
      ctx.beginPath();
      ctx.rect(rect.x, rect.y, rect.w, rect.h);
      ctx.clip();
      if (photo) coverFitDraw(ctx, photo, rect, crop);
      else paintPlaceholder(ctx, rect, grade, i);
      gradeWash(ctx, rect, grade);
    }
    ctx.restore();

    // thin white frame line per panel
    ctx.save();
    ctx.strokeStyle = "rgba(255,248,239,0.95)";
    ctx.lineWidth = Math.max(2, W * 0.003);
    if (rect.rot) {
      ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
      ctx.rotate(rect.rot);
      ctx.strokeRect(-rect.w / 2, -rect.h / 2, rect.w, rect.h);
    } else {
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    }
    ctx.restore();
  });

  // Title band.
  const bandGrad = ctx.createLinearGradient(0, bandY, W, H);
  bandGrad.addColorStop(0, grade.wash);
  bandGrad.addColorStop(1, "#0a0616");
  ctx.fillStyle = bandGrad;
  ctx.fillRect(0, bandY, W, bandH);
  ctx.fillStyle = grade.accent;
  ctx.fillRect(0, bandY, W, Math.max(3, H * 0.004));
  if (st.halftone) halftoneBand(ctx, 0, bandY + bandH * 0.55, W, bandH * 0.45, grade.accent);

  const pad = Math.round(W * 0.04);
  const title = (st.caption || "NEON COAST").toUpperCase();
  // Measure the badge first: the title must stop short of it, never run under it.
  let badgeW = 0;
  const badgePx = Math.max(13, Math.round(bandH * 0.16));
  if (st.badge) {
    ctx.save();
    ctx.font = `700 ${badgePx}px Arial, sans-serif`;
    badgeW = ctx.measureText(st.badge).width + badgePx * 1.6;
    ctx.restore();
  }
  const titleMax = W - pad * 2 - (badgeW ? badgeW + pad : 0);
  const titlePx = fitFont(ctx, title, titleMax, Math.round(bandH * 0.52), '"Anton", "Arial Narrow", sans-serif', 400);
  ctx.save();
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.font = `400 ${titlePx}px "Anton", "Arial Narrow", sans-serif`;
  ctx.lineWidth = Math.max(2, titlePx * 0.06);
  ctx.strokeStyle = "rgba(10,4,20,0.9)";
  ctx.strokeText(title, pad, bandY + bandH * 0.38);
  ctx.fillStyle = grade.ink;
  ctx.fillText(title, pad, bandY + bandH * 0.38);
  ctx.restore();

  const sub = st.subtitle || "";
  if (sub) {
    const subPx = Math.max(14, Math.round(bandH * 0.20));
    ctx.save();
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.font = `${subPx}px "Pacifico", cursive`;
    ctx.fillStyle = grade.accent;
    ctx.shadowColor = grade.accent;
    ctx.shadowBlur = Math.round(subPx * 0.5);
    ctx.fillText(sub, pad, bandY + bandH * 0.80);
    ctx.restore();
  }

  if (st.badge) {
    const badgePx = Math.max(13, Math.round(bandH * 0.16));
    ctx.save();
    ctx.font = `700 ${badgePx}px Arial, sans-serif`;
    const bw = ctx.measureText(st.badge).width + badgePx * 1.6;
    const bh = badgePx * 2.1;
    const bx = W - pad - bw;
    const by = bandY + bandH * 0.12;
    ctx.fillStyle = "rgba(255,255,255,0.14)";
    ctx.strokeStyle = grade.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, bh / 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(st.badge, bx + bw / 2, by + bh / 2 + 1);
    ctx.restore();
  }

  // Vignette + grain over everything.
  if (st.grain) {
    const vig = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, "rgba(0,0,0,0.34)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);
    seededDots(ctx, W, H, (st.caption || "x").length * 7919 + 13, Math.round(W * H / 2600), "#ffffff");
  }

  // Outer white poster frame.
  if (st.frame) {
    ctx.strokeStyle = "#fff8ef";
    ctx.lineWidth = Math.max(4, W * 0.008);
    ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, W - ctx.lineWidth, H - ctx.lineWidth);
  }
}
