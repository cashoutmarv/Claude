// Power verb dictionary, grouped by intent so we can pick contextually.
const POWER_VERBS = {
  lead: ['Spearheaded', 'Orchestrated', 'Directed', 'Championed', 'Drove'],
  build: ['Engineered', 'Architected', 'Built', 'Launched', 'Established'],
  improve: ['Streamlined', 'Optimized', 'Revamped', 'Accelerated', 'Enhanced'],
  support: ['Resolved', 'Delivered', 'Owned', 'Coordinated', 'Facilitated'],
  grow: ['Scaled', 'Expanded', 'Grew', 'Boosted', 'Amplified'],
  analyze: ['Analyzed', 'Audited', 'Diagnosed', 'Surfaced', 'Identified'],
};

// Replace weak verbs/phrases at the start of the bullet.
const WEAK_PATTERNS = [
  { re: /^responsible for\s+/i, intent: 'support' },
  { re: /^helped (with )?/i, intent: 'support' },
  { re: /^worked on\s+/i, intent: 'build' },
  { re: /^assisted (with |in )?/i, intent: 'support' },
  { re: /^involved in\s+/i, intent: 'lead' },
  { re: /^did\s+/i, intent: 'build' },
  { re: /^made\s+/i, intent: 'build' },
  { re: /^handled\s+/i, intent: 'support' },
  { re: /^managed\s+/i, intent: 'lead' },
  { re: /^in charge of\s+/i, intent: 'lead' },
  { re: /^tasked with\s+/i, intent: 'support' },
  { re: /^duties included\s+/i, intent: 'support' },
];

// Verb-form fix: most patterns leave a gerund or noun phrase. Convert "answering phones"
// to "phone support", "helping customers" to "customer issues", etc. Keep light — JS only.
const NOUN_FIXES = [
  [/^answering (the )?phones?\b/i, 'inbound phone support'],
  [/^helping (customers?|clients?|users?)\b/i, 'customer issues'],
  [/^writing\s+/i, 'creation of '],
  [/^doing\s+/i, ''],
  [/^making\s+/i, ''],
  [/^working with\s+/i, ''],
];

const METRIC_PLACEHOLDERS = [
  'driving a [X]% improvement in resolution time',
  'serving [N]+ customers daily',
  'reducing turnaround by [X]%',
  'increasing satisfaction scores by [X] points',
  'cutting costs by $[X]K annually',
  'supporting [N]+ stakeholders across [X] teams',
];

function pick(arr, i = null) {
  if (i === null) return arr[Math.floor(Math.random() * arr.length)];
  return arr[i % arr.length];
}

function detectIntent(text) {
  const lower = text.toLowerCase();
  for (const { re, intent } of WEAK_PATTERNS) {
    if (re.test(lower)) return intent;
  }
  if (/(grew|increased|sales|revenue|customers)/i.test(lower)) return 'grow';
  if (/(fixed|optimized|improved|streamlined)/i.test(lower)) return 'improve';
  if (/(built|created|launched|developed|designed)/i.test(lower)) return 'build';
  if (/(led|managed|directed|owned)/i.test(lower)) return 'lead';
  if (/(analyzed|reviewed|audited)/i.test(lower)) return 'analyze';
  return 'support';
}

function stripWeakPrefix(text) {
  let result = text.trim();
  for (const { re } of WEAK_PATTERNS) {
    result = result.replace(re, '');
  }
  for (const [re, replacement] of NOUN_FIXES) {
    result = result.replace(re, replacement);
  }
  // Lowercase the first letter so it appends cleanly after a verb.
  return result.charAt(0).toLowerCase() + result.slice(1);
}

function refineBullet(text) {
  const intent = detectIntent(text);
  const verbPool = POWER_VERBS[intent];
  const stripped = stripWeakPrefix(text).replace(/[.!]+$/, '');

  // Variant A: Strong verb + cleaned phrase + metric placeholder
  const a = `${pick(verbPool, 0)} ${stripped}, ${pick(METRIC_PLACEHOLDERS, 0)}.`;

  // Variant B: Different verb + cleaned phrase + different metric
  const b = `${pick(verbPool, 1)} ${stripped} for [N]+ users, ${pick(METRIC_PLACEHOLDERS, 1)}.`;

  // Variant C: Lead with impact framing
  const c = `${pick(verbPool, 2)} ${stripped} — ${pick(METRIC_PLACEHOLDERS, 2)} while collaborating cross-functionally with [team] to deliver measurable results.`;

  return [a, b, c].map(capitalize);
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const refineBtn = document.getElementById('refine');
const bulletInput = document.getElementById('bullet');
const results = document.getElementById('results');

refineBtn.addEventListener('click', () => {
  const text = bulletInput.value.trim();
  if (!text) {
    bulletInput.focus();
    return;
  }
  const variants = refineBullet(text);
  results.innerHTML = '';
  variants.forEach((v, i) => {
    const card = document.createElement('div');
    card.className = 'card';
    const p = document.createElement('p');
    p.textContent = v;
    const copy = document.createElement('button');
    copy.className = 'copy';
    copy.textContent = `Copy v${i + 1}`;
    copy.addEventListener('click', () => {
      navigator.clipboard.writeText(v);
      copy.textContent = 'Copied!';
      setTimeout(() => (copy.textContent = `Copy v${i + 1}`), 1500);
    });
    card.appendChild(p);
    card.appendChild(copy);
    results.appendChild(card);
  });
});

bulletInput.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') refineBtn.click();
});
