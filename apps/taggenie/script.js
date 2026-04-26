const goBtn = document.getElementById('go');
const keywordInput = document.getElementById('keyword');
const results = document.getElementById('results');
const matchInfo = document.getElementById('match-info');

// Levenshtein distance for fuzzy matching unknown keywords to known categories.
function lev(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

function findCategory(keyword) {
  const k = keyword.toLowerCase().trim();
  if (TAG_LIBRARY[k]) return { match: k, exact: true };
  // Substring match (e.g. "running shoes" → fitness if it contains "fit"-like)
  for (const cat of Object.keys(TAG_LIBRARY)) {
    if (k.includes(cat) || cat.includes(k)) return { match: cat, exact: false };
  }
  // Fuzzy fallback
  let best = null, bestScore = Infinity;
  for (const cat of Object.keys(TAG_LIBRARY)) {
    const d = lev(k, cat);
    if (d < bestScore) { bestScore = d; best = cat; }
  }
  return { match: best, exact: false, fuzzy: true, distance: bestScore };
}

function render(category) {
  const data = TAG_LIBRARY[category];
  results.innerHTML = '';

  const tiers = [
    { key: 'top', label: 'Top tier (high competition)' },
    { key: 'medium', label: 'Medium tier (sweet spot)' },
    { key: 'niche', label: 'Niche tier (easier reach)' },
  ];

  tiers.forEach(({ key, label }) => {
    const tags = data[key] || [];
    const block = document.createElement('div');
    block.className = 'tier';

    const head = document.createElement('div');
    head.className = 'tier-title';
    const h3 = document.createElement('h3');
    h3.textContent = label;
    const copy = document.createElement('button');
    copy.className = 'tier-copy';
    copy.textContent = 'Copy tier';
    copy.addEventListener('click', () => {
      navigator.clipboard.writeText(tags.join(' '));
      copy.textContent = 'Copied!';
      setTimeout(() => (copy.textContent = 'Copy tier'), 1200);
    });
    head.appendChild(h3);
    head.appendChild(copy);

    const tagWrap = document.createElement('div');
    tagWrap.className = 'tags';
    tags.forEach((t) => {
      const b = document.createElement('button');
      b.className = 'tag';
      b.textContent = t;
      b.addEventListener('click', () => {
        navigator.clipboard.writeText(t);
        b.textContent = 'Copied!';
        setTimeout(() => (b.textContent = t), 900);
      });
      tagWrap.appendChild(b);
    });

    block.appendChild(head);
    block.appendChild(tagWrap);
    results.appendChild(block);
  });

  // Bottom: copy ALL button
  const all = [...(data.top || []), ...(data.medium || []), ...(data.niche || [])];
  const allBtn = document.createElement('button');
  allBtn.className = 'btn';
  allBtn.style.marginTop = '0.5rem';
  allBtn.textContent = `Copy all 20 hashtags`;
  allBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(all.join(' '));
    allBtn.textContent = 'Copied to clipboard!';
    setTimeout(() => (allBtn.textContent = 'Copy all 20 hashtags'), 1500);
  });
  results.appendChild(allBtn);
}

function search() {
  const k = keywordInput.value.trim();
  if (!k) return;
  const { match, exact, fuzzy } = findCategory(k);
  if (!match) {
    matchInfo.textContent = 'No match found. Try: photography, travel, food, fitness, fashion, art, music, sunset, nature, baking, gym.';
    return;
  }
  if (exact) matchInfo.textContent = `Showing curated set for "${match}"`;
  else if (fuzzy) matchInfo.textContent = `Closest match: "${match}"`;
  else matchInfo.textContent = `Matched to "${match}"`;
  render(match);
}

goBtn.addEventListener('click', search);
keywordInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') search();
});
