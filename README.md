# Micro Tools

A small portfolio of focused, monetizable web apps. Each one solves a single
problem, ships standalone, and is cheap or free to host.

## What's in here

| App | Stack | Monetization | Path |
| --- | --- | --- | --- |
| **Text Summarizer** | Node.js (zero deps) + static UI | Stripe $1/use | `apps/summarizer` |
| **Resume Bullet Booster** | Static (HTML/CSS/JS) | Stripe $2 unlock | `apps/resume-booster` |
| **Icebreaker AI** | Static | Stripe $1 / 50 openers | `apps/icebreaker` |
| **PaletteSnap** | Static (canvas + k-means) | Buy Me a Coffee | `apps/palettesnap` |
| **TagGenie** | Static | Stripe $3 personalized strategy | `apps/taggenie` |
| **Fridge Chef** | Static | Stripe $1 tip | `apps/fridge-chef` |
| Landing page | Static | — | `site/` |

All payment URLs are placeholders (`https://buy.stripe.com/your-link-here`,
`https://www.buymeacoffee.com/your-link-here`). Replace them with your real
Stripe Payment Links / BMC / Gumroad URLs before going live.

---

## Running locally

### Static apps (resume-booster, icebreaker, palettesnap, taggenie, fridge-chef)

Each is plain HTML/CSS/JS with no build step. Two options:

```bash
# Option 1: open the file directly
open apps/resume-booster/index.html

# Option 2: serve the whole monorepo with any static server
python3 -m http.server 8000
# then visit http://localhost:8000/site/  (landing page)
# or     http://localhost:8000/apps/<app-name>/
```

### Node.js summarizer

```bash
cd apps/summarizer
npm start          # listens on http://localhost:3000
```

No dependencies needed — it's pure Node `http`. The summarizer ships with a
mock extractive summary function in `server.js`. To swap in a real model:

```js
// in server.js, replace mockSummarize() with a call to your provider
const Anthropic = require('@anthropic-ai/sdk');
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
async function summarize(text) {
  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    messages: [{ role: 'user', content: `Summarize concisely:\n\n${text}` }],
  });
  return msg.content[0].text;
}
```

---

## Free deployment

### Static apps → Netlify or GitHub Pages

**Netlify (drag-and-drop):**
1. Go to https://app.netlify.com/drop
2. Drag the app's folder (e.g. `apps/resume-booster/`) onto the page
3. Done — you'll get a free `*.netlify.app` URL

**GitHub Pages:**
1. Push this repo to GitHub
2. Settings → Pages → Source: `main` branch, `/ (root)`
3. Visit `https://<user>.github.io/<repo>/apps/<app-name>/`

**Cloudflare Pages / Vercel:** point them at the repo, set build command to
`echo static` and output dir to the app folder.

### Node.js summarizer → Render, Railway, or Fly.io

**Render (free tier):**
1. New → Web Service → connect this repo
2. Root directory: `apps/summarizer`
3. Build command: `npm install`
4. Start command: `npm start`

**Railway:** same setup, point at `apps/summarizer`. Railway auto-detects
Node and runs `npm start`.

**Fly.io:** `cd apps/summarizer && fly launch` and accept the defaults.

---

## Wiring up payments

1. Create a [Stripe Payment Link](https://dashboard.stripe.com/payment-links) for each tier
   ($1, $2, $3 — whatever you want).
2. Search the codebase for `your-link-here` and replace with your real URL(s).
3. For Buy Me a Coffee or Gumroad, swap the same placeholder for your link.

---

## File structure

```
.
├── apps/
│   ├── summarizer/       # Node.js + Stripe $1
│   ├── resume-booster/   # static + Stripe $2
│   ├── icebreaker/       # static + Stripe $1
│   ├── palettesnap/      # static + BMC
│   ├── taggenie/         # static + Stripe $3
│   └── fridge-chef/      # static + Stripe $1
├── site/                 # landing page linking to all apps
└── README.md
```
