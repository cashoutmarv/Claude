// Lightweight k-means color extraction.
// We downsample the image to keep the per-pixel cost low, then run k-means on RGB triplets.

const K = 5;
const MAX_ITERS = 12;
const SAMPLE_DIM = 100; // resize image to ~100px on the long side before sampling

const dropzone = document.getElementById('dropzone');
const dzText = document.getElementById('dz-text');
const fileInput = document.getElementById('file');
const canvas = document.getElementById('canvas');
const palette = document.getElementById('palette');
const actions = document.getElementById('actions');
const copyBtn = document.getElementById('copy');
const resetBtn = document.getElementById('reset');

let currentHexes = [];

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('');
}

function distSq(a, b) {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return dr * dr + dg * dg + db * db;
}

// k-means++ style seeding for stable results
function seed(pixels, k) {
  const centers = [pixels[Math.floor(Math.random() * pixels.length)]];
  while (centers.length < k) {
    const distances = pixels.map((p) => {
      let min = Infinity;
      for (const c of centers) {
        const d = distSq(p, c);
        if (d < min) min = d;
      }
      return min;
    });
    const total = distances.reduce((a, b) => a + b, 0);
    if (total === 0) {
      centers.push(pixels[Math.floor(Math.random() * pixels.length)]);
      continue;
    }
    let target = Math.random() * total;
    let idx = 0;
    for (let i = 0; i < distances.length; i++) {
      target -= distances[i];
      if (target <= 0) { idx = i; break; }
    }
    centers.push(pixels[idx].slice());
  }
  return centers;
}

function kmeans(pixels, k = K) {
  let centers = seed(pixels, k).map((c) => c.slice());
  const assignments = new Array(pixels.length).fill(0);

  for (let iter = 0; iter < MAX_ITERS; iter++) {
    let changed = false;
    // assign
    for (let i = 0; i < pixels.length; i++) {
      let best = 0, bestD = Infinity;
      for (let j = 0; j < k; j++) {
        const d = distSq(pixels[i], centers[j]);
        if (d < bestD) { bestD = d; best = j; }
      }
      if (assignments[i] !== best) { assignments[i] = best; changed = true; }
    }
    // update
    const sums = Array.from({ length: k }, () => [0, 0, 0, 0]);
    for (let i = 0; i < pixels.length; i++) {
      const a = assignments[i];
      sums[a][0] += pixels[i][0];
      sums[a][1] += pixels[i][1];
      sums[a][2] += pixels[i][2];
      sums[a][3] += 1;
    }
    for (let j = 0; j < k; j++) {
      if (sums[j][3] > 0) {
        centers[j] = [
          sums[j][0] / sums[j][3],
          sums[j][1] / sums[j][3],
          sums[j][2] / sums[j][3],
        ];
      }
    }
    if (!changed) break;
  }

  // Sort clusters by population (most dominant first)
  const counts = new Array(k).fill(0);
  for (const a of assignments) counts[a]++;
  return centers
    .map((c, i) => ({ color: c, count: counts[i] }))
    .sort((a, b) => b.count - a.count)
    .map((c) => c.color);
}

function extractPalette(img) {
  const ctx = canvas.getContext('2d');
  // Downsample for speed
  const ratio = img.width / img.height;
  let w, h;
  if (ratio > 1) { w = SAMPLE_DIM; h = Math.round(SAMPLE_DIM / ratio); }
  else { h = SAMPLE_DIM; w = Math.round(SAMPLE_DIM * ratio); }
  canvas.width = w;
  canvas.height = h;
  ctx.drawImage(img, 0, 0, w, h);

  const data = ctx.getImageData(0, 0, w, h).data;
  const pixels = [];
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 200) continue; // skip transparent
    pixels.push([data[i], data[i + 1], data[i + 2]]);
  }
  if (pixels.length === 0) return [];
  return kmeans(pixels, K).map((c) => rgbToHex(c[0], c[1], c[2]));
}

function getLuminance(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function renderPalette(hexes) {
  palette.innerHTML = '';
  hexes.forEach((hex) => {
    const sw = document.createElement('div');
    sw.className = 'swatch';
    sw.style.background = hex;
    sw.textContent = hex.toUpperCase();
    if (getLuminance(hex) > 0.65) sw.style.color = '#111';
    sw.addEventListener('click', () => {
      navigator.clipboard.writeText(hex);
      sw.classList.add('copied');
      setTimeout(() => sw.classList.remove('copied'), 800);
    });
    palette.appendChild(sw);
  });
}

function handleFile(file) {
  if (!file || !file.type.startsWith('image/')) {
    alert('Please drop an image file.');
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const hexes = extractPalette(img);
      currentHexes = hexes;
      renderPalette(hexes);
      canvas.classList.remove('hidden');
      palette.classList.remove('hidden');
      actions.classList.remove('hidden');
      dzText.textContent = 'Drop a new image to try again';
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

dropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropzone.classList.add('drag');
});
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag'));
dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropzone.classList.remove('drag');
  if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', (e) => {
  if (e.target.files[0]) handleFile(e.target.files[0]);
});

copyBtn.addEventListener('click', () => {
  if (!currentHexes.length) return;
  navigator.clipboard.writeText(currentHexes.join(', '));
  copyBtn.textContent = 'Copied!';
  setTimeout(() => (copyBtn.textContent = 'Copy palette'), 1500);
});

resetBtn.addEventListener('click', () => {
  fileInput.value = '';
  currentHexes = [];
  canvas.classList.add('hidden');
  palette.classList.add('hidden');
  actions.classList.add('hidden');
  dzText.textContent = 'Drop an image here, or click to browse';
});
