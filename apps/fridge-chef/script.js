const cookBtn = document.getElementById('cook');
const ingredientsInput = document.getElementById('ingredients');
const results = document.getElementById('results');

// Light synonyms so common variations still match.
const SYNONYMS = {
  scallion: 'onion',
  scallions: 'onion',
  onions: 'onion',
  tomatoes: 'tomato',
  potatoes: 'potato',
  egg: 'eggs',
  mushrooms: 'mushroom',
  peppers: 'pepper',
  bellpepper: 'pepper',
  parm: 'parmesan',
  cucumbers: 'cucumber',
  bananas: 'banana',
  garlics: 'garlic',
};

function normalize(word) {
  const w = word.toLowerCase().trim().replace(/[^a-z]/g, '');
  return SYNONYMS[w] || w;
}

function parseIngredients(raw) {
  return raw
    .split(/[,\n]/)
    .map((s) => normalize(s))
    .filter(Boolean);
}

function rankRecipes(userSet) {
  const have = new Set(userSet);
  return RECIPES
    .map((r) => {
      const matched = r.ingredients.filter((ing) => have.has(normalize(ing)));
      return { recipe: r, matched, count: matched.length };
    })
    .filter((x) => x.count >= 2)
    .sort((a, b) => b.count - a.count);
}

function renderRecipe({ recipe, matched }) {
  const card = document.createElement('article');
  card.className = 'recipe';

  const h2 = document.createElement('h2');
  h2.textContent = recipe.name;

  const matchBar = document.createElement('div');
  matchBar.className = 'match-bar';
  matchBar.textContent = `${matched.length} of your ingredients match`;

  const list = document.createElement('div');
  list.className = 'matched-list';
  list.innerHTML = `<strong>Matched:</strong> ${matched.join(', ')}<br/><strong>Also needs:</strong> ${recipe.ingredients.filter((i) => !matched.includes(i)).join(', ') || 'nothing else!'}`;

  const details = document.createElement('details');
  const summary = document.createElement('summary');
  summary.textContent = 'Show steps';
  details.appendChild(summary);

  const ol = document.createElement('ol');
  recipe.steps.forEach((s) => {
    const li = document.createElement('li');
    li.textContent = s;
    ol.appendChild(li);
  });
  details.appendChild(ol);

  card.appendChild(h2);
  card.appendChild(matchBar);
  card.appendChild(list);
  card.appendChild(details);
  return card;
}

function renderEmpty(userSet) {
  // Surprise me — a random recipe.
  const random = RECIPES[Math.floor(Math.random() * RECIPES.length)];
  results.innerHTML = '';
  const note = document.createElement('div');
  note.className = 'empty';
  note.textContent = `No recipes matched at least 2 of your ingredients (${userSet.join(', ') || 'empty'}). Here's a surprise pick instead:`;
  results.appendChild(note);
  results.appendChild(renderRecipe({ recipe: random, matched: [] }));
}

cookBtn.addEventListener('click', () => {
  const userSet = parseIngredients(ingredientsInput.value);
  if (userSet.length === 0) {
    ingredientsInput.focus();
    return;
  }
  const ranked = rankRecipes(userSet);
  results.innerHTML = '';
  if (ranked.length === 0) return renderEmpty(userSet);
  ranked.slice(0, 3).forEach((r) => results.appendChild(renderRecipe(r)));
});

ingredientsInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') cookBtn.click();
});
