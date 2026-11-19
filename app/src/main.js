// LeonidaAfterDarkEditor — the editor behind the cover engine. Loads the
// user's own photos (or the bundled AI-made samples), lets them crop and
// position each panel, edit the caption, switch grades and lettering, and
// export a PNG in the three common post sizes. Everything runs offline;
// photos never leave the machine.
import { renderLeonidaCover, POST_SIZES, LETTER_STYLES, CAPTION_PRESETS, SUBCAPTION_PRESETS } from './cover.js';

const $ = (id) => document.getElementById(id);

function emptyCrop() {
  return { zoom: 1, offsetX: 0, offsetY: 0 };
}

export function createDefaultCoverState() {
  return {
    sizeId: 'wide',
    grade: 'neon',
    letterStyle: 'sunset',
    caption: 'WELCOME TO LEONIDA',
    subcaption: 'A LEONIDA STORY',
    photos: { hero: null, strip1: null, strip2: null },
    crops: { hero: emptyCrop(), strip1: emptyCrop(), strip2: emptyCrop() },
    selectedPanel: 'hero',
  };
}

function loadImageFromUrl(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('could not read that photo'));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error('could not read that file'));
    reader.readAsDataURL(file);
  });
}

async function loadSamplePhotos(state) {
  const [boulevard, pier] = await Promise.all([
    loadImageFromUrl('./samples/boulevard.jpg'),
    loadImageFromUrl('./samples/pier.jpg'),
  ]);
  state.photos.hero = boulevard;
  state.photos.strip1 = pier;
  state.photos.strip2 = boulevard;
}

function downloadCoverPng(canvas, filename) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve(false);
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      resolve(true);
    }, 'image/png');
  });
}

export function exportCoverAsDataUrl(canvas) {
  return canvas.toDataURL('image/png');
}

function buildPresetChips(container, presets, onPick) {
  container.textContent = '';
  presets.forEach((preset) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.textContent = preset;
    chip.addEventListener('click', () => onPick(preset));
    container.appendChild(chip);
  });
}

function syncCropControls(state) {
  const crop = state.crops[state.selectedPanel];
  $('zoomRange').value = String(crop.zoom);
  $('panXRange').value = String(crop.offsetX);
  $('panYRange').value = String(crop.offsetY);
  $('zoomValue').textContent = `${Math.round(crop.zoom * 100)}%`;
  document.querySelectorAll('[data-panel]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.panel === state.selectedPanel);
  });
}

function renderPreview(state) {
  const canvas = $('previewCanvas');
  renderLeonidaCover(canvas, state);
  const size = POST_SIZES.find((s) => s.id === state.sizeId);
  $('sizeLabel').textContent = `${size.label} — live preview`;
}

export function initLeonidaEditor() {
  const state = createDefaultCoverState();
  const params = new URLSearchParams(location.search);
  const shot = params.get('shot');
  const photo = params.get('photo') ?? 'boulevard';
  const caption = params.get('caption');
  if (caption) state.caption = caption;
  if (params.get('grade') === 'golden') state.grade = 'golden';
  if (params.get('size')) state.sizeId = params.get('size');

  const previewWrap = $('previewWrap');
  const canvas = $('previewCanvas');

  function refresh() {
    renderPreview(state);
    syncCropControls(state);
  }

  // Grade toggle: Golden Hour vs Neon Night, one click, visibly different.
  document.querySelectorAll('[data-grade]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.grade = btn.dataset.grade;
      document.querySelectorAll('[data-grade]').forEach((b) => b.classList.toggle('active', b === btn));
      refresh();
    });
  });

  // Lettering styles: three bold layered looks for the caption.
  const styleRow = $('letterStyleRow');
  LETTER_STYLES.forEach((style) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'seg' + (style.id === state.letterStyle ? ' active' : '');
    btn.textContent = style.label;
    btn.addEventListener('click', () => {
      state.letterStyle = style.id;
      styleRow.querySelectorAll('.seg').forEach((b) => b.classList.toggle('active', b === btn));
      refresh();
    });
    styleRow.appendChild(btn);
  });

  // Post sizes: square, story, wide — one click re-lays the cover out.
  const sizeRow = $('sizeRow');
  POST_SIZES.forEach((size) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'seg' + (size.id === state.sizeId ? ' active' : '');
    btn.textContent = size.label;
    btn.addEventListener('click', () => {
      state.sizeId = size.id;
      sizeRow.querySelectorAll('.seg').forEach((b) => b.classList.toggle('active', b === btn));
      refresh();
    });
    sizeRow.appendChild(btn);
  });

  buildPresetChips($('captionChips'), CAPTION_PRESETS, (preset) => {
    state.caption = preset;
    $('captionInput').value = preset;
    refresh();
  });
  buildPresetChips($('subcaptionChips'), SUBCAPTION_PRESETS, (preset) => {
    state.subcaption = preset;
    $('subcaptionInput').value = preset;
    refresh();
  });

  $('captionInput').addEventListener('input', (e) => {
    state.caption = e.target.value;
    refresh();
  });
  $('subcaptionInput').addEventListener('input', (e) => {
    state.subcaption = e.target.value;
    refresh();
  });

  // Per-panel photo pickers + "one photo for all panels".
  ['hero', 'strip1', 'strip2'].forEach((panel) => {
    $(`photo-${panel}`).addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        state.photos[panel] = await loadImageFromFile(file);
        state.crops[panel] = emptyCrop();
        state.selectedPanel = panel;
        $('statusLine').textContent = `Loaded ${file.name} into the ${panel} panel.`;
        refresh();
      } catch (err) {
        $('statusLine').textContent = String(err.message ?? err);
      }
    });
  });
  $('fillAllBtn').addEventListener('click', () => {
    const src = state.photos[state.selectedPanel] ?? state.photos.hero;
    if (!src) {
      $('statusLine').textContent = 'Load a photo first, then fill all panels with it.';
      return;
    }
    state.photos.hero = src;
    state.photos.strip1 = src;
    state.photos.strip2 = src;
    $('statusLine').textContent = 'One photo now fills every panel — pick a panel to give it its own photo.';
    refresh();
  });
  $('sampleBtn').addEventListener('click', async () => {
    await loadSamplePhotos(state);
    $('statusLine').textContent = 'Sample photos loaded (AI-made boulevard + pier). Swap in your own any time.';
    refresh();
  });

  // Crop controls for the selected panel.
  document.querySelectorAll('[data-panel]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.selectedPanel = btn.dataset.panel;
      refresh();
    });
  });
  $('zoomRange').addEventListener('input', (e) => {
    state.crops[state.selectedPanel].zoom = Number(e.target.value);
    refresh();
  });
  $('panXRange').addEventListener('input', (e) => {
    state.crops[state.selectedPanel].offsetX = Number(e.target.value);
    refresh();
  });
  $('panYRange').addEventListener('input', (e) => {
    state.crops[state.selectedPanel].offsetY = Number(e.target.value);
    refresh();
  });
  document.querySelectorAll('[data-focal]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const crop = state.crops[state.selectedPanel];
      const focal = btn.dataset.focal;
      crop.offsetX = focal === 'left' ? -0.7 : focal === 'right' ? 0.7 : 0;
      crop.offsetY = focal === 'top' ? -0.7 : focal === 'bottom' ? 0.7 : 0;
      refresh();
    });
  });
  $('resetCropBtn').addEventListener('click', () => {
    state.crops[state.selectedPanel] = emptyCrop();
    refresh();
  });

  // Drag on the preview pans the selected panel's photo; wheel zooms it.
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  canvas.addEventListener('pointerdown', (e) => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const crop = state.crops[state.selectedPanel];
    const rect = canvas.getBoundingClientRect();
    crop.offsetX += ((e.clientX - lastX) / rect.width) * 2;
    crop.offsetY += ((e.clientY - lastY) / rect.height) * 2;
    crop.offsetX = Math.max(-1, Math.min(1, crop.offsetX));
    crop.offsetY = Math.max(-1, Math.min(1, crop.offsetY));
    lastX = e.clientX;
    lastY = e.clientY;
    refresh();
  });
  canvas.addEventListener('pointerup', () => {
    dragging = false;
  });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const crop = state.crops[state.selectedPanel];
    crop.zoom = Math.max(1, Math.min(3, crop.zoom + (e.deltaY < 0 ? 0.15 : -0.15)));
    refresh();
  }, { passive: false });

  // One-click PNG export at the chosen post size.
  $('exportBtn').addEventListener('click', async () => {
    const size = POST_SIZES.find((s) => s.id === state.sizeId);
    const ok = await downloadCoverPng(canvas, `leonida-after-dark-${size.id}-${size.w}x${size.h}.png`);
    $('statusLine').textContent = ok
      ? `Exported ${size.w} x ${size.h} PNG — ready to share.`
      : 'Export failed in this browser — try Chrome.';
  });

  // Screenshot scenes (?shot=cover renders the cover full-bleed; ?shot=editor
  // shows the editor with a sample photo loaded) — used by the maker only.
  async function runShotScene() {
    await document.fonts.load('90px Anton');
    await document.fonts.ready;
    if (shot === 'cover') {
      document.body.classList.add('shot-cover');
      const img = await loadImageFromUrl(`./samples/${photo === 'pier' ? 'pier' : 'boulevard'}.jpg`);
      state.photos.hero = img;
      state.photos.strip1 = photo === 'pier' ? await loadImageFromUrl('./samples/boulevard.jpg') : await loadImageFromUrl('./samples/pier.jpg');
      state.photos.strip2 = img;
      // Frame the subjects' faces: the sample photos are square, the panels
      // are wider than tall, so a centred crop would cut heads off. This is
      // the same "Focus top" preset the editor offers, applied for the shot.
      state.crops.hero.offsetY = -0.55;
      state.crops.strip1.offsetY = -0.45;
      state.crops.strip2.offsetY = -0.45;
      renderPreview(state);
      window.__leonidaReady = true;
      window.__exportCover = () => exportCoverAsDataUrl(canvas);
      return;
    }
    if (shot === 'editor') {
      await loadSamplePhotos(state);
      refresh();
      window.__leonidaReady = true;
      return;
    }
    refresh();
    window.__leonidaReady = true;
  }

  window.__leonidaState = state;
  window.__leonidaRefresh = refresh;
  runShotScene().catch((err) => {
    $('statusLine').textContent = String(err.message ?? err);
    refresh();
  });
}

initLeonidaEditor();
