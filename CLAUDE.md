# CLAUDE.md — engineering conventions

> The **design** lives in `DESIGN.md`. Read that first. This file is purely
> *how we build*, not *what we build*.

## Tech stack

- Phaser 3 (HTML5, MIT) loaded from CDN; no build step in development.
- Vanilla JavaScript, ES modules. No TypeScript, no Webpack, no Vite.
- Capacitor wrap for iOS / Android — added at packaging time, not now.
- `localStorage` for persistence, behind `src/services/storage.js`.
- AdMob + Unity LevelPlay/AppLovin MAX mediation for ads — stubbed.
- RevenueCat for IAP / subscriptions — stubbed.

## Working agreements

- **DESIGN.md is canon.** Don't infer design from chat history; either it's
  in DESIGN.md or it isn't decided.
- **Branches**: `claude/<short-topic>-vN`. One topic per branch. Don't push
  to `main`. Always open a draft PR.
- **Skeleton stays small.** Only add a file when the current phase explicitly
  needs it. Don't pre-create empty scaffolding.
- **Test in browser before committing**: `python3 -m http.server` then load
  in Chrome DevTools with mobile emulation (iPhone or Pixel viewport). The
  touch joystick must work; the keyboard fallback must work.
- **Save migrations are mandatory.** Bumping `VERSION` in `storage.js`
  requires a `migrate(saved)` step. Never blow away existing saves silently.
- **No dead code.** If a feature is removed, delete its file. We rely on git
  history, not commented-out blocks, for archaeology.
- **No new comments unless they explain *why*.** Code that needs a *what*
  comment should be renamed.

## Repository layout

```
DESIGN.md                  ← source of truth for the game design.
CLAUDE.md                  ← this file.
README.md                  ← short public-facing summary.
index.html                 ← viewport + Phaser CDN + module entry.
src/
  game.js                  ← Phaser config + scene registration.
  scenes/                  ← BootScene, IntroScene, HubScene (more later).
  services/                ← storage.js (more later).
  systems/                 ← Joystick.js (more later).
```

New folders (`config/`, `entities/`, `ui/`, …) are added when the phase
that needs them lands — not preemptively.

## Phase log

Each phase is a separate branch + PR. Done when its DESIGN.md section's
verification criteria pass.

- **Phase 0 — Skeleton** *(this branch: `claude/skeleton-v1`)*: DESIGN.md,
  CLAUDE.md, BootScene → IntroScene → HubScene with one campfire. No
  enemies, no gacha, no caves, no raids.
- **Phase 1 — Hub depth + world synth**: trait dials, palette generation,
  hub scenery (trees, paths, building shells).
- **Phase 2 — First friend arrival**: scripted milestone, dialogue overlay,
  rift pulse animation.
- **Phase 3 — First cave run**: minimal procedural cave scene, return-with-
  loot loop, currency wallet.
- **Phase 4 — First raid**: wave director, building HP, raid resolution.
- **Phase 5 — Gacha v1**: standard banner, pity, selector tokens, movie-
  world NPC catalog gated by genre.
- **Phase 6 — Economy + IAP stubs**: gem packs, Adventurer's Pass surface,
  ads stub.
- **Phase 7 — Capacitor wrap + real AdMob / RevenueCat integration**.

Don't skip phases. Each phase's verification gates the next.
