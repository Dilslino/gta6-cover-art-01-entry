// paintViceCitySkyline — draws the whole Leonida backdrop procedurally on a 2D
// canvas: gradient sky, slatted setting sun, two layers of skyline silhouette
// with lit windows, palm silhouettes and a glowing horizon band. No image
// assets, no Rockstar art: every pixel is drawn in code, so the backdrop is
// original and looks identical at any export size.
export function createSeededRandom(seed) {
  let state = seed >>> 0;
  return function seededRandom() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const GOLDEN_HOUR_SKY = ['#2b1055', '#7597de'];
const GOLDEN_HOUR_BANDS = ['#ff9a3c', '#ff5e62', '#c6427a', '#7b2d8b'];
const NEON_NIGHT_SKY = ['#0b0620', '#1d0b38'];
const NEON_NIGHT_BANDS = ['#ff2e88', '#b537f2', '#3a0ca3', '#120458'];

function paintGradientSky(ctx, w, h, grade) {
  const stops = grade === 'neon' ? NEON_NIGHT_SKY : GOLDEN_HOUR_SKY;
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, stops[0]);
  sky.addColorStop(0.62, stops[1]);
  sky.addColorStop(1, grade === 'neon' ? '#2a0a4a' : '#3c1a5e');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
}

// The sun: a big disc low on the horizon with horizontal slats cut out of its
// lower half, the classic synthwave-sunset look, painted with a warm gradient.
function paintSlattedSun(ctx, w, h, grade, rand) {
  const cx = w * (grade === 'neon' ? 0.30 : 0.68);
  const cy = h * 0.52;
  const r = Math.min(w, h) * 0.21;
  const sun = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  if (grade === 'neon') {
    sun.addColorStop(0, '#ffe259');
    sun.addColorStop(0.55, '#ff7e5f');
    sun.addColorStop(1, '#ff2e88');
  } else {
    sun.addColorStop(0, '#fff3b0');
    sun.addColorStop(0.5, '#ffb347');
    sun.addColorStop(1, '#ff5e62');
  }
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = sun;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  // Slats: sky-coloured bars that widen toward the bottom of the disc.
  ctx.fillStyle = grade === 'neon' ? '#1d0b38' : '#7597de';
  let y = cy + r * 0.05;
  let gap = r * 0.045;
  while (y < cy + r) {
    ctx.fillRect(cx - r, y, r * 2, gap);
    y += gap + r * 0.085;
    gap *= 1.55;
  }
  ctx.restore();
  // Halo glow around the sun.
  const halo = ctx.createRadialGradient(cx, cy, r * 0.6, cx, cy, r * 2.1);
  halo.addColorStop(0, grade === 'neon' ? 'rgba(255,46,136,0.34)' : 'rgba(255,154,60,0.32)');
  halo.addColorStop(1, 'rgba(255,46,136,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(cx - r * 2.1, cy - r * 2.1, r * 4.2, r * 4.2);
}

function paintSkylineLayer(ctx, w, h, baseY, colour, rand, minW, maxW, minH, maxH, windows) {
  ctx.fillStyle = colour;
  let x = -10;
  while (x < w + 10) {
    const bw = minW + rand() * (maxW - minW);
    const bh = minH + rand() * (maxH - minH);
    const top = baseY - bh;
    ctx.fillRect(x, top, bw, bh + (h - baseY) + 4);
    // Rooftop antenna on some towers.
    if (rand() < 0.3) {
      ctx.fillRect(x + bw / 2 - 1.5, top - bh * 0.22, 3, bh * 0.22);
      ctx.beginPath();
      ctx.arc(x + bw / 2, top - bh * 0.22, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    // Lit windows: tiny warm rectangles scattered over the tower face.
    if (windows) {
      const cols = Math.max(2, Math.floor(bw / 16));
      const rows = Math.max(2, Math.floor(bh / 20));
      for (let c = 0; c < cols; c++) {
        for (let r2 = 0; r2 < rows; r2++) {
          if (rand() < 0.28) {
            ctx.fillStyle = rand() < 0.75 ? 'rgba(255,214,120,0.85)' : 'rgba(120,240,255,0.8)';
            ctx.fillRect(x + 5 + c * ((bw - 10) / cols), top + 7 + r2 * ((bh - 12) / rows), 4, 6);
            ctx.fillStyle = colour;
          }
        }
      }
    }
    x += bw + rand() * 8;
  }
}

function paintPalmSilhouette(ctx, x, baseY, height, lean, rand) {
  ctx.save();
  ctx.translate(x, baseY);
  ctx.strokeStyle = '#0d0518';
  ctx.lineWidth = Math.max(3, height * 0.045);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(lean * height * 0.25, -height * 0.55, lean * height * 0.45, -height);
  ctx.stroke();
  const topX = lean * height * 0.45;
  const topY = -height;
  ctx.translate(topX, topY);
  ctx.lineWidth = Math.max(2, height * 0.02);
  for (let i = 0; i < 6; i++) {
    const angle = -Math.PI * (0.12 + (i / 6) * 0.76) + lean * 0.35;
    const len = height * (0.26 + rand() * 0.10);
    // Fronds arc outward then droop down, like a real palm crown.
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(
      Math.cos(angle) * len * 0.55,
      Math.sin(angle) * len * 0.5 - len * 0.05,
      Math.cos(angle) * len,
      Math.sin(angle) * len * 0.72 + len * 0.30,
    );
    ctx.stroke();
  }
  ctx.restore();
}

export function paintViceCitySkyline(ctx, w, h, grade) {
  const rand = createSeededRandom(grade === 'neon' ? 20261119 : 90210);
  paintGradientSky(ctx, w, h, grade);
  paintSlattedSun(ctx, w, h, grade, rand);
  const horizon = h * 0.66;
  // Far skyline: hazy purple towers.
  paintSkylineLayer(ctx, w, h, horizon, grade === 'neon' ? '#2a1245' : '#4a2560', rand, w * 0.03, w * 0.07, h * 0.06, h * 0.17, false);
  // Near skyline: near-black towers with lit windows.
  paintSkylineLayer(ctx, w, h, horizon + h * 0.02, '#12081f', rand, w * 0.045, w * 0.09, h * 0.1, h * 0.26, true);
  // Horizon glow band where the sky meets the city.
  const band = grade === 'neon' ? NEON_NIGHT_BANDS : GOLDEN_HOUR_BANDS;
  const glow = ctx.createLinearGradient(0, horizon - h * 0.09, 0, horizon + h * 0.05);
  glow.addColorStop(0, 'rgba(255,94,98,0)');
  glow.addColorStop(0.5, grade === 'neon' ? 'rgba(255,46,136,0.5)' : 'rgba(255,154,60,0.45)');
  glow.addColorStop(1, 'rgba(255,94,98,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, horizon - h * 0.09, w, h * 0.14);
  // Ground: dark boulevard below the horizon.
  ctx.fillStyle = '#0a0514';
  ctx.fillRect(0, horizon + h * 0.02, w, h - horizon);
  // Palms framing the edges, mostly off-canvas so they frame, not intrude.
  paintPalmSilhouette(ctx, -w * 0.01, h * 0.99, h * 0.34, 0.4, rand);
  paintPalmSilhouette(ctx, w * 0.08, h * 1.0, h * 0.24, -0.3, rand);
  paintPalmSilhouette(ctx, w * 1.01, h * 0.99, h * 0.38, -0.4, rand);
  return { horizon, band };
}
