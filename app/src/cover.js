// renderLeonidaCover — the cover engine. One large hero panel, a strip of
// supporting photo panels, a painted Vice City skyline behind them, bold
// layered caption lettering, halftone print texture and film grain on top.
// Layout is computed from the export size, so the same engine draws the
// 1080x1080 square, the 1080x1350 portrait and the 1920x1080 landscape.
import { paintViceCitySkyline, createSeededRandom } from './skyline.js';

export const POST_SIZES = [
  { id: 'square', label: 'Square 1080 x 1080', w: 1080, h: 1080 },
  { id: 'portrait', label: 'Story 1080 x 1350', w: 1080, h: 1350 },
  { id: 'wide', label: 'Wide 1920 x 1080', w: 1920, h: 1080 },
];

export const LETTER_STYLES = [
  { id: 'sunset', label: 'Sunset Gradient' },
  { id: 'neon', label: 'Neon Outline' },
  { id: 'punch', label: 'Solid Punch' },
];

export const CAPTION_PRESETS = [
  'WELCOME TO LEONIDA',
  'VICE CITY NIGHTS',
  'AFTER DARK',
  'BOULEVARD QUEEN',
  'SUNSET HEIST',
  'NEON COAST',
];

export const SUBCAPTION_PRESETS = [
  'A LEONIDA STORY',
  'EST. 2026 — VICE CITY',
  'GOLDEN HOUR CLUB',
  'NIGHTS ON THE BOULEVARD',
];

// Cover-fit draw: fills rect with the image, honouring a per-panel crop
// (zoom 1..3, offsetX/offsetY -1..1) so the user can position each photo.
export function drawCoverFitPhoto(ctx, img, rect, crop) {
  if (!img || !img.naturalWidth) return false;
  const zoom = crop?.zoom ?? 1;
  const ox = crop?.offsetX ?? 0;
  const oy = crop?.offsetY ?? 0;
  const imgRatio = img.naturalWidth / img.naturalHeight;
  const rectRatio = rect.w / rect.h;
  let sw;
  let sh;
  if (imgRatio > rectRatio) {
    sh = img.naturalHeight;
    sw = sh * rectRatio / zoom;
  } else {
    sw = img.naturalWidth;
    sh = sw / rectRatio / zoom;
  }
  const maxOx = (img.naturalWidth - sw) / 2;
  const maxOy = (img.naturalHeight - sh) / 2;
  const sx = (img.naturalWidth - sw) / 2 + ox * maxOx;
  const sy = (img.naturalHeight - sh) / 2 + oy * maxOy;
  ctx.drawImage(img, sx, sy, sw, sh, rect.x, rect.y, rect.w, rect.h);
  return true;
}

function drawPhotoPanel(ctx, img, rect, crop, border, grade) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = rect.w * 0.02;
  ctx.shadowOffsetY = rect.w * 0.012;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(rect.x - border, rect.y - border, rect.w + border * 2, rect.h + border * 2);
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  const drawn = drawCoverFitPhoto(ctx, img, rect, crop);
  if (!drawn) {
    // Empty panel: a warm placeholder gradient with a camera glyph, so the
    // cover still reads as a poster before any photo is loaded.
    const g = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
    g.addColorStop(0, grade === 'neon' ? '#3a0ca3' : '#ff9a3c');
    g.addColorStop(1, grade === 'neon' ? '#ff2e88' : '#c6427a');
    ctx.fillStyle = g;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = `700 ${Math.round(rect.h * 0.16)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('＋ ADD PHOTO', rect.x + rect.w / 2, rect.y + rect.h / 2);
  }
  ctx.restore();
  // Thin inner keyline so the photo sits inside its white frame.
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = Math.max(1, rect.w * 0.004);
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
}

function computeCoverLayout(w, h) {
  const m = Math.min(w, h) * 0.028; // outer margin
  if (w >= h) {
    // Landscape: hero right, caption + strip left.
    const hero = { x: w * 0.52, y: h * 0.055, w: w * 0.445, h: h * 0.62 };
    const stripH = h * 0.235;
    const stripW = (w * 0.485 - m) / 2;
    return {
      hero,
      strips: [
        { x: m, y: h * 0.70, w: stripW, h: stripH },
        { x: m + stripW + m, y: h * 0.70, w: stripW, h: stripH },
      ],
      caption: { x: m, y: h * 0.10, w: w * 0.47, size: w * 0.062, lines: 3 },
      subcaption: { x: m, y: h * 0.60, size: w * 0.016 },
      badge: { x: w - m - w * 0.055, y: h * 0.055 + hero.h + m * 0.4, r: w * 0.032 },
      border: Math.max(4, w * 0.006),
    };
  }
  if (h > w * 1.15) {
    // Portrait: hero on top, strip middle, caption at the bottom.
    const hero = { x: m, y: h * 0.045, w: w - m * 2, h: h * 0.47 };
    const stripH = h * 0.175;
    const stripW = (w - m * 3) / 2;
    return {
      hero,
      strips: [
        { x: m, y: h * 0.535, w: stripW, h: stripH },
        { x: m * 2 + stripW, y: h * 0.535, w: stripW, h: stripH },
      ],
      caption: { x: m, y: h * 0.735, w: w - m * 2, size: w * 0.092, lines: 2 },
      subcaption: { x: m, y: h * 0.875, size: w * 0.030 },
      badge: { x: w - m - w * 0.075, y: h * 0.535 + stripH + m, r: w * 0.045 },
      border: Math.max(4, w * 0.007),
    };
  }
  // Square: hero top-right, caption left, strip along the bottom.
  const hero = { x: w * 0.47, y: h * 0.05, w: w * 0.485, h: h * 0.55 };
  const stripH = h * 0.20;
  const stripW = (w - m * 3) / 2;
  return {
    hero,
    strips: [
      { x: m, y: h * 0.755, w: stripW, h: stripH },
      { x: m * 2 + stripW, y: h * 0.755, w: stripW, h: stripH },
    ],
    caption: { x: m, y: h * 0.09, w: w * 0.42, size: w * 0.068, lines: 3 },
    subcaption: { x: m, y: h * 0.60, size: w * 0.02 },
    badge: { x: w - m - w * 0.06, y: h * 0.63, r: w * 0.038 },
    border: Math.max(4, w * 0.007),
  };
}

function wrapCaptionLines(ctx, text, maxWidth) {
  const words = String(text || '').toUpperCase().split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth || !line) line = test;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// Three layered lettering styles: gradient fill + outline + offset shadow,
// neon glow outline, or solid white with a hard punch shadow.
function paintBoldCaption(ctx, text, sub, layout, style, grade, w, h) {
  const cap = layout.caption;
  ctx.save();
  ctx.font = `${cap.size}px Anton, 'Arial Narrow', sans-serif`;
  ctx.textBaseline = 'alphabetic';
  const lines = wrapCaptionLines(ctx, text, cap.w).slice(0, cap.lines);
  const lineH = cap.size * 1.02;
  let y = cap.y + lineH;
  lines.forEach((lineText, i) => {
    const ly = y + i * lineH;
    ctx.save();
    if (style === 'sunset') {
      const grad = ctx.createLinearGradient(cap.x, ly - cap.size, cap.x, ly);
      grad.addColorStop(0, '#fff3b0');
      grad.addColorStop(0.45, '#ffb347');
      grad.addColorStop(1, grade === 'neon' ? '#ff2e88' : '#ff5e62');
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#12081f';
      ctx.lineWidth = cap.size * 0.16;
      ctx.strokeText(lineText, cap.x, ly);
      ctx.shadowColor = 'rgba(255,46,136,0.85)';
      ctx.shadowBlur = cap.size * 0.18;
      ctx.shadowOffsetX = cap.size * 0.045;
      ctx.shadowOffsetY = cap.size * 0.06;
      ctx.fillStyle = grad;
      ctx.fillText(lineText, cap.x, ly);
    } else if (style === 'neon') {
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = cap.size * 0.05;
      ctx.shadowColor = '#ff2e88';
      ctx.shadowBlur = cap.size * 0.28;
      ctx.strokeText(lineText, cap.x, ly);
      ctx.strokeStyle = '#ff2e88';
      ctx.lineWidth = cap.size * 0.03;
      ctx.strokeText(lineText, cap.x, ly);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(lineText, cap.x, ly);
    } else {
      ctx.lineJoin = 'round';
      ctx.fillStyle = '#12081f';
      ctx.fillText(lineText, cap.x + cap.size * 0.07, ly + cap.size * 0.08);
      ctx.strokeStyle = '#12081f';
      ctx.lineWidth = cap.size * 0.14;
      ctx.strokeText(lineText, cap.x, ly);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(lineText, cap.x, ly);
    }
    ctx.restore();
  });
  // Subcaption: small letter-spaced line under the main caption.
  if (sub) {
    const subY = layout.subcaption.y + layout.subcaption.size;
    ctx.font = `700 ${layout.subcaption.size}px system-ui, sans-serif`;
    ctx.fillStyle = grade === 'neon' ? '#7df9ff' : '#ffe9a8';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 4;
    ctx.fillText(String(sub).toUpperCase(), layout.subcaption.x, subY);
    ctx.shadowBlur = 0;
    ctx.fillStyle = grade === 'neon' ? '#ff2e88' : '#ff5e62';
    ctx.fillRect(layout.subcaption.x, subY + layout.subcaption.size * 0.5, layout.subcaption.size * 6, Math.max(2, layout.subcaption.size * 0.16));
  }
  ctx.restore();
}

function paintRoundBadge(ctx, badge, grade) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(badge.x, badge.y, badge.r, 0, Math.PI * 2);
  ctx.fillStyle = grade === 'neon' ? '#ff2e88' : '#ffb347';
  ctx.fill();
  ctx.lineWidth = Math.max(2, badge.r * 0.09);
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
  ctx.fillStyle = '#12081f';
  ctx.font = `${badge.r * 0.95}px Anton, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('★', badge.x, badge.y + badge.r * 0.05);
  ctx.restore();
}

// Halftone print dots across the sky + deterministic film grain + vignette:
// the printed-poster feel that makes the cover read as rich, layered art
// rather than a flat photo filter.
function paintHalftoneAndGrain(ctx, w, h, grade) {
  const rand = createSeededRandom(grade === 'neon' ? 777 : 555);
  ctx.save();
  const dotGap = Math.max(7, w * 0.008);
  for (let y = dotGap; y < h * 0.5; y += dotGap) {
    for (let x = dotGap / 2; x < w; x += dotGap) {
      const depth = 1 - y / (h * 0.5);
      const r = dotGap * 0.16 + depth * dotGap * 0.14;
      ctx.fillStyle = `rgba(18,8,31,${0.05 + depth * 0.10})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Film grain: thousands of tiny speckles, seeded so every render matches.
  const specks = Math.floor((w * h) / 900);
  for (let i = 0; i < specks; i++) {
    const gx = rand() * w;
    const gy = rand() * h;
    const light = rand() < 0.5;
    ctx.fillStyle = light ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
    ctx.fillRect(gx, gy, 1.4, 1.4);
  }
  // Vignette: darken the corners so the hero and lettering pop.
  const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75);
  vg.addColorStop(0, 'rgba(10,5,20,0)');
  vg.addColorStop(1, 'rgba(10,5,20,0.34)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

export function renderLeonidaCover(canvas, state) {
  const size = POST_SIZES.find((s) => s.id === state.sizeId) ?? POST_SIZES[2];
  canvas.width = size.w;
  canvas.height = size.h;
  const ctx = canvas.getContext('2d');
  const grade = state.grade === 'neon' ? 'neon' : 'golden';
  paintViceCitySkyline(ctx, size.w, size.h, grade);
  const layout = computeCoverLayout(size.w, size.h);
  drawPhotoPanel(ctx, state.photos.hero, layout.hero, state.crops.hero, layout.border, grade);
  drawPhotoPanel(ctx, state.photos.strip1, layout.strips[0], state.crops.strip1, layout.border, grade);
  drawPhotoPanel(ctx, state.photos.strip2, layout.strips[1], state.crops.strip2, layout.border, grade);
  paintBoldCaption(ctx, state.caption, state.subcaption, layout, state.letterStyle, grade, size.w, size.h);
  paintRoundBadge(ctx, layout.badge, grade);
  paintHalftoneAndGrain(ctx, size.w, size.h, grade);
  return { layout, size };
}
