// Neon Coast cover engine: draws a multi-panel GTA-style poster onto any 2D canvas.
// Every layout is defined in unit coordinates (0..1) and scaled to the canvas, so the
// same drawing code renders the live preview and every export size (1080x1080,
// 1080x1350, 1920x1080, 1080x1920). Photos are drawn cover-fit per panel with their
// own crop (zoom + offset); grades are canvas filters plus a sunset/neon overlay;
// the title block is Anton capitals with a Pacifico neon script subtitle, grain
// and a vignette finish the poster.

export const LAYOUTS = {
  nine: { name: 'Nine-Panel Grid', panels: 9 },
  hero: { name: 'Hero + Three', panels: 4 },
  four: { name: 'Four-Panel Grid', panels: 4 },
  full: { name: 'Full Bleed', panels: 1 },
  tilted: { name: 'Tilted Snapshots', panels: 3 },
  poster: { name: 'Classic Poster', panels: 4 },
};

export const GRADES = {
  sunset: {
    name: 'Sunset', filter: 'saturate(1.3) contrast(1.06) sepia(0.12)',
    top: 'rgba(255, 122, 69, 0.10)', bottom: 'rgba(214, 48, 130, 0.42)',
    band: '#1c0b2e', accent: '#ffb347', sub: '#ff7ad9', bg: '#2b1838',
  },
  neon: {
    name: 'Neon', filter: 'saturate(1.55) contrast(1.12) hue-rotate(-8deg)',
    top: 'rgba(0, 229, 255, 0.12)', bottom: 'rgba(255, 0, 153, 0.45)',
    band: '#0d0221', accent: '#00e5ff', sub: '#ff2e9a', bg: '#12042b',
  },
  vice: {
    name: 'Vice', filter: 'saturate(1.2) contrast(1.02) sepia(0.06)',
    top: 'rgba(255, 183, 197, 0.14)', bottom: 'rgba(0, 184, 212, 0.38)',
    band: '#12233a', accent: '#7df9ff', sub: '#ffb3c6', bg: '#16283f',
  },
  gold: {
    name: 'Gold', filter: 'saturate(1.35) contrast(1.05) sepia(0.38)',
    top: 'rgba(255, 196, 0, 0.14)', bottom: 'rgba(176, 92, 0, 0.42)',
    band: '#241505', accent: '#ffd34d', sub: '#ffe9a8', bg: '#2e1c05',
  },
  noir: {
    name: 'Noir', filter: 'grayscale(1) contrast(1.28) brightness(1.04)',
    top: 'rgba(255, 255, 255, 0.06)', bottom: 'rgba(0, 0, 0, 0.5)',
    band: '#0a0a0a', accent: '#f2f2f2', sub: '#c9c9c9', bg: '#111111',
  },
};

export const SIZES = {
  square: { label: 'Square 1080 x 1080', w: 1080, h: 1080 },
  portrait: { label: 'Portrait 1080 x 1350', w: 1080, h: 1350 },
  wide: { label: 'Wide 1920 x 1080', w: 1920, h: 1080 },
  story: { label: 'Story 1080 x 1920', w: 1080, h: 1920 },
};

/** A blank per-panel crop: which photo slot it shows, its zoom and its pan offset. */
export function blankPanel(photo = 0) {
  return { photo, zoom: 1, ox: 0, oy: 0 };
}

/** Panel rectangles for a layout, in pixels, plus the title band rectangle. */
export function panelRects(layout, w, h) {
  const g = Math.round(Math.min(w, h) * 0.014); // panel gap
  const m = Math.round(Math.min(w, h) * 0.02); // outer margin
  const full = { x: 0, y: 0, w, h, rot: 0 };
  const bandH = Math.round(h * 0.17);
  const band = { x: 0, y: h - bandH, w, h: bandH };
  const grid = (cols, rows, x0, y0, x1, y1) => {
    const out = [];
    const cw = (x1 - x0 - g * (cols - 1)) / cols;
    const ch = (y1 - y0 - g * (rows - 1)) / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        out.push({ x: x0 + c * (cw + g), y: y0 + r * (ch + g), w: cw, h: ch, rot: 0 });
      }
    }
    return out;
  };
  switch (layout) {
    case 'nine':
      return { panels: grid(3, 3, m, m, w - m, h - m), band, bg: null };
    case 'hero': {
      const heroW = Math.round((w - m * 2 - g) * 0.62);
      const colX = m + heroW + g;
      const colW = w - m - colX;
      const ch = (h - m * 2 - g * 2) / 3;
      return {
        panels: [
          { x: m, y: m, w: heroW, h: h - m * 2, rot: 0 },
          { x: colX, y: m, w: colW, h: ch, rot: 0 },
          { x: colX, y: m + ch + g, w: colW, h: ch, rot: 0 },
          { x: colX, y: m + (ch + g) * 2, w: colW, h: ch, rot: 0 },
        ],
        band, bg: null,
      };
    }
    case 'four':
      return { panels: grid(2, 2, m, m, w - m, h - m), band, bg: null };
    case 'full':
      return { panels: [full], band, bg: null };
    case 'tilted': {
      const top = { x: 0, y: 0, w, h: Math.round(h * 0.2) };
      const cw = Math.round(w * 0.42);
      const ch = Math.round(h * 0.52);
      return {
        panels: [
          { x: Math.round(w * 0.05), y: Math.round(h * 0.24), w: cw, h: ch, rot: -6 },
          { x: Math.round(w * 0.53), y: Math.round(h * 0.22), w: cw, h: ch, rot: 5 },
          { x: Math.round(w * 0.30), y: Math.round(h * 0.68), w: Math.round(w * 0.40), h: Math.round(h * 0.24), rot: -2 },
        ],
        band: top, bg: 'photo', titleTop: true,
      };
    }
    case 'poster': {
      const stripY = Math.round(h * 0.535);
      const stripH = Math.round(h * 0.185);
      const heroH = stripY - g - m;
      const sw = (w - m * 2 - g * 2) / 3;
      return {
        panels: [
          { x: m, y: m, w: w - m * 2, h: heroH, rot: 0 },
          { x: m, y: stripY, w: sw, h: stripH, rot: 0 },
          { x: m + sw + g, y: stripY, w: sw, h: stripH, rot: 0 },
          { x: m + (sw + g) * 2, y: stripY, w: sw, h: stripH, rot: 0 },
        ],
        band: { x: 0, y: Math.round(h * 0.745), w, h: h - Math.round(h * 0.745) },
        bg: null, halftone: true,
      };
    }
    default:
      return { panels: grid(2, 2, m, m, w - m, h - m), band, bg: null };
  }
}

/** The slack a crop can pan within its panel, in canvas pixels. */
export function cropSlack(img, rect, zoom) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const scale = Math.max(rect.w / iw, rect.h / ih) * (zoom || 1);
  return {
    maxOx: Math.max(0, (iw * scale - rect.w) / 2),
    maxOy: Math.max(0, (ih * scale - rect.h) / 2),
  };
}

/** Draws one photo cover-fit into a rectangle, honouring its zoom and pan offset. */
function drawPhotoInto(ctx, img, rect, crop, grade) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const base = Math.max(rect.w / iw, rect.h / ih);
  const scale = base * (crop?.zoom || 1);
  const pw = iw * scale;
  const ph = ih * scale;
  // Pan is a -1..1 fraction of the available slack, so the same value frames the
  // same way on any panel size or aspect, and always covers its panel.
  const slack = cropSlack(img, rect, crop?.zoom || 1);
  const ox = Math.max(-1, Math.min(1, crop?.ox || 0)) * slack.maxOx;
  const oy = Math.max(-1, Math.min(1, crop?.oy || 0)) * slack.maxOy;
  ctx.save();
  ctx.filter = grade.filter;
  ctx.drawImage(img, rect.x + (rect.w - pw) / 2 + ox, rect.y + (rect.h - ph) / 2 + oy, pw, ph);
  ctx.restore();
}

/** A vector sunset skyline used when a panel has no photo yet, so empty covers still read as art. */
function drawPlaceholder(ctx, rect, grade) {
  const sky = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
  sky.addColorStop(0, '#ff9a5a');
  sky.addColorStop(0.55, '#e84a8a');
  sky.addColorStop(1, '#2b1055');
  ctx.fillStyle = sky;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  const cx = rect.x + rect.w * 0.5;
  const cy = rect.y + rect.h * 0.62;
  const r = Math.min(rect.w, rect.h) * 0.22;
  ctx.fillStyle = '#ffd34d';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(20, 8, 40, 0.85)';
  const base = rect.y + rect.h;
  for (let i = 0; i < 5; i++) {
    const bw = rect.w / 5;
    const bh = rect.h * (0.18 + ((i * 37) % 20) / 100);
    ctx.fillRect(rect.x + i * bw + bw * 0.08, base - bh, bw * 0.84, bh);
  }
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.font = `600 ${Math.max(12, rect.h * 0.06)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('ADD A PHOTO', cx, rect.y + rect.h * 0.16);
}

let grainTile = null;
function grainPattern(ctx) {
  if (grainTile) return grainTile;
  const t = document.createElement('canvas');
  t.width = 140;
  t.height = 140;
  const tc = t.getContext('2d');
  const data = tc.createImageData(140, 140);
  for (let i = 0; i < data.data.length; i += 4) {
    const v = Math.floor(Math.random() * 255);
    data.data[i] = v;
    data.data[i + 1] = v;
    data.data[i + 2] = v;
    data.data[i + 3] = 22;
  }
  tc.putImageData(data, 0, 0);
  grainTile = ctx.createPattern(t, 'repeat');
  return grainTile;
}

/** Shrinks a font until the text fits the given width, returning the fitted size. */
function fitFont(ctx, text, family, weight, startSize, maxWidth) {
  let size = startSize;
  ctx.font = `${weight} ${size}px ${family}`;
  while (size > 10 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

/**
 * Draws the whole cover.
 * state: { layout, grade, caption, subtitle, photos, panels, grain, vignette }
 * photos: array of Image (or null) per slot; panels: per-panel crop objects.
 */
export function drawCover(canvas, state, width, height) {
  const w = width || canvas.width;
  const h = height || canvas.height;
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const ctx = canvas.getContext('2d');
  const grade = GRADES[state.grade] || GRADES.sunset;
  const geo = panelRects(state.layout || 'nine', w, h);
  const border = Math.max(2, Math.round(Math.min(w, h) * 0.008));

  ctx.fillStyle = grade.bg;
  ctx.fillRect(0, 0, w, h);

  // Tilted layout: a dark, blurred full-bleed photo sits behind the snapshot cards.
  if (geo.bg === 'photo') {
    const bg = (state.photos || []).find(Boolean);
    if (bg) {
      ctx.save();
      ctx.filter = 'blur(6px) brightness(0.55) saturate(1.2)';
      const bw = bg.naturalWidth || bg.width;
      const bh = bg.naturalHeight || bg.height;
      const bscale = Math.max((w + 40) / bw, (h + 40) / bh);
      ctx.drawImage(bg, -20 + ((w + 40) - bw * bscale) / 2, -20 + ((h + 40) - bh * bscale) / 2, bw * bscale, bh * bscale);
      ctx.restore();
    } else {
      drawPlaceholder(ctx, { x: 0, y: 0, w, h }, grade);
    }
  }

  // Panels: photo (or placeholder), inked white frame, thin inner shadow line.
  geo.panels.forEach((rect, i) => {
    const crop = (state.panels || [])[i] || blankPanel(0);
    const img = (state.photos || [])[crop.photo] || null;
    ctx.save();
    if (rect.rot) {
      ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
      ctx.rotate((rect.rot * Math.PI) / 180);
      ctx.translate(-rect.w / 2, -rect.h / 2);
      rect = { x: 0, y: 0, w: rect.w, h: rect.h };
    }
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    if (img) drawPhotoInto(ctx, img, rect, crop, grade);
    else drawPlaceholder(ctx, rect, grade);
    ctx.restore();
    ctx.save();
    if (rect.rot) {
      ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
      ctx.rotate((rect.rot * Math.PI) / 180);
      ctx.translate(-rect.w / 2, -rect.h / 2);
      rect = { x: 0, y: 0, w: rect.w, h: rect.h };
    }
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = border;
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.lineWidth = Math.max(1, border / 3);
    ctx.strokeRect(rect.x + border, rect.y + border, rect.w - border * 2, rect.h - border * 2);
    ctx.restore();
  });

  // Grade wash over the whole poster.
  const wash = ctx.createLinearGradient(0, 0, 0, h);
  wash.addColorStop(0, grade.top);
  wash.addColorStop(1, grade.bottom);
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);

  // Title band: dark slab, halftone dots on the poster layout, Anton caption,
  // neon script subtitle, thin accent rule and corner stars.
  const band = geo.band;
  const bandGrad = ctx.createLinearGradient(0, band.y, 0, band.y + band.h);
  bandGrad.addColorStop(0, grade.band);
  bandGrad.addColorStop(1, '#000000');
  ctx.fillStyle = bandGrad;
  ctx.fillRect(band.x, band.y, band.w, band.h);
  ctx.fillStyle = grade.accent;
  ctx.fillRect(band.x, band.y, band.w, Math.max(2, h * 0.004));
  if (geo.halftone) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.10)';
    const step = Math.max(10, Math.round(w * 0.012));
    for (let y = band.y + step; y < band.y + band.h * 0.35; y += step) {
      for (let x = band.x + step / 2; x < band.x + band.w; x += step) {
        ctx.beginPath();
        ctx.arc(x, y, Math.max(1.5, step * 0.12), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  const caption = (state.caption || 'NEON COAST').trim().toUpperCase() || 'NEON COAST';
  const pad = Math.max(16, w * 0.04);
  const capSize = fitFont(ctx, caption, '"Anton", "Arial Black", sans-serif', 400, band.h * 0.52, w - pad * 2);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = capSize * 0.12;
  ctx.shadowOffsetY = capSize * 0.04;
  ctx.fillText(caption, w / 2, band.y + band.h * (state.subtitle ? 0.38 : 0.52));
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  if (state.subtitle) {
    const subSize = fitFont(ctx, state.subtitle, '"Pacifico", cursive', 400, band.h * 0.26, w - pad * 2);
    ctx.fillStyle = grade.sub;
    ctx.fillText(state.subtitle, w / 2, band.y + band.h * 0.78);
  }
  // Corner stars on the band, sized to the poster.
  const starR = Math.max(5, band.h * 0.09);
  ctx.fillStyle = grade.accent;
  for (const sx of [pad, w - pad]) {
    ctx.save();
    ctx.translate(sx, band.y + band.h * 0.5);
    ctx.beginPath();
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4;
      const r = k % 2 === 0 ? starR : starR * 0.45;
      ctx[k === 0 ? 'moveTo' : 'lineTo'](Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Grain, then vignette: the poster finish.
  if (state.grain !== false) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = grainPattern(ctx);
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  if (state.vignette !== false) {
    const vig = ctx.createRadialGradient(
      w / 2, h / 2, Math.min(w, h) * 0.42,
      w / 2, h / 2, Math.max(w, h) * 0.75,
    );
    vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vig.addColorStop(1, 'rgba(0, 0, 0, 0.38)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);
  }
  return geo;
}
