// Sentence templates. Each opener combines: a hook, a specific reference, and a soft pivot.
const TEMPLATES = [
  ({ name, company, fact }) =>
    `Hi ${name}, I came across the news that ${company} ${fact} — really impressive timing given how much the space is shifting right now. The way you've framed the story stood out to me, and it got me thinking about a few angles that might be useful as you build on that momentum.`,

  ({ name, company, fact }) =>
    `Hey ${name}, I wanted to reach out after seeing that ${company} ${fact}. It's the kind of move that signals real intent, and it caught my attention enough that I wanted to send a quick note rather than wait for a more polished moment.`,

  ({ name, company, fact }) =>
    `Hi ${name} — quick note: I saw ${company} ${fact} and it struck me as exactly the kind of bet that pays off later. I've been spending time with teams in similar shoes and figured it might be worth a brief conversation, no pressure either way.`,

  ({ name, company, fact }) =>
    `${name}, hope your week's going well. I just heard ${company} ${fact}, which is a great signal — most teams talk about it, few actually pull it off. I'd love to share a couple of observations from the other folks I've worked with on similar moves.`,

  ({ name, company, fact }) =>
    `Hi ${name}, congrats on the news that ${company} ${fact}. I rarely cold-email, but the timing felt right because what you're doing maps closely to a problem I've been thinking about a lot lately. Mind if I share a quick thought?`,

  ({ name, company, fact }) =>
    `Hey ${name}, the fact that ${company} ${fact} is the reason I'm writing — it's a clear signal about where you're heading, and I think there's a small but useful conversation to be had about what tends to come next for teams in your position.`,
];

const form = document.getElementById('form');
const output = document.getElementById('output');
const emailEl = document.getElementById('email');
const copyBtn = document.getElementById('copy');
const regenBtn = document.getElementById('regen');

let lastInput = null;
let lastIndex = -1;

function generate(input) {
  let i;
  do {
    i = Math.floor(Math.random() * TEMPLATES.length);
  } while (i === lastIndex && TEMPLATES.length > 1);
  lastIndex = i;
  return TEMPLATES[i](input);
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  lastInput = {
    name: document.getElementById('name').value.trim(),
    company: document.getElementById('company').value.trim(),
    fact: document.getElementById('fact').value.trim(),
  };
  emailEl.textContent = generate(lastInput);
  output.classList.remove('hidden');
});

regenBtn.addEventListener('click', () => {
  if (lastInput) emailEl.textContent = generate(lastInput);
});

copyBtn.addEventListener('click', () => {
  navigator.clipboard.writeText(emailEl.textContent);
  copyBtn.textContent = 'Copied!';
  setTimeout(() => (copyBtn.textContent = 'Copy'), 1500);
});
