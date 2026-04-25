# Passive-Income Mobile Game Studio — Plan & Research

This repo is the working studio for shipping a portfolio of small mobile games
to the Apple App Store and Google Play Store, monetized for passive income.
The first title is a roguelike survivor.

## Strategy

**Goal.** Ship a small number of polished, retention-oriented mobile games that
earn passively from rewarded video ads + light IAP. Reuse one engine + one core
loop across multiple "reskins" so each new title costs days, not months.

**Cross-platform with one codebase.** Build the game in **Phaser 3** (HTML5 +
JavaScript). Wrap it with **Capacitor** to ship native iOS and Android apps
from the same source. This minimizes per-platform engineering and keeps
iteration fast. Web builds also serve as a free marketing channel
(itch.io / Poki / web embeds funnel installs).

**Reskin pipeline.** Game logic, UI, and data are decoupled from art and
content. To make game #2, swap art atlases + tune a JSON balance file. The
"engine" is a thin layer; new games are mostly content.

## Genre research — why roguelike survivor

The auto-shooter / "bullet heaven" roguelike has been the breakout mobile
genre of the last few years and dominates passive monetization charts.
Reference points: *Vampire Survivors*, *Survivor.io*, *Magic Survival*,
*20 Minutes Till Dawn*, *Brotato*. Why it works on mobile:

- **One-finger controls.** Move with a thumb; weapons auto-fire. Playable on
  the bus, in line, at the gym — perfect for mobile session length.
- **Short runs (5–15 min).** Permadeath + procgen produces a tight "one more
  run" loop that is structurally similar to slot machines.
- **Infinite content from finite assets.** Procedural waves and randomized
  upgrade picks turn ~20 enemies and ~15 weapons into hundreds of unique runs.
- **Strong rewarded-ad fit.** Death is frequent and feels bad → players
  willingly watch a 30s ad to revive. This single placement drives the bulk of
  ARPDAU in the genre.
- **Meta progression sells.** Persistent unlocks between runs (new characters,
  starter weapons, perks) give a natural IAP surface (currency packs, starter
  bundles) without pay-to-win pressure.
- **Low art bar.** Top earners ship with simple 2D pixel/vector art. A solo
  dev can produce competitive visuals; the moat is feel and balance.

## Monetization plan

1. **Rewarded video ads (primary).**
   - "Revive on death" — once per run.
   - "Double XP" — one-time boost mid-run.
   - "Reroll upgrade choice" — one per level-up screen.
2. **Interstitial ads (light).** One every 2–3 runs, never mid-run.
3. **IAP (secondary).**
   - Permanent ad removal ($3.99).
   - Starter pack ($1.99) — soft currency + a cosmetic.
   - Cosmetic skins (no gameplay advantage).
4. **No energy systems, no pay-to-win.** The genre's audience punishes both.

Networks: AdMob (Android primary) + Unity LevelPlay/AppLovin MAX as mediation;
RevenueCat for IAP. All wired through Capacitor plugins. **Implementation in
this repo is stubbed** behind `src/services/ads.js` and `src/services/iap.js`
so the game runs in a browser and integrations are dropped in at packaging.

## Tech stack

- **Engine:** Phaser 3 (MIT, HTML5 canvas/WebGL).
- **Language:** vanilla JavaScript ES modules — no build step required for
  iteration; can add Vite later if needed.
- **Mobile wrapper:** Capacitor (added at packaging time).
- **Ads / IAP:** AdMob + RevenueCat via Capacitor plugins (stubbed for now).
- **Art:** procedural shapes / emoji glyphs as placeholder; swap to atlases
  during polish.

## First title — "Dungeon Drift" (working name)

Top-down auto-shooter roguelike. Survive escalating waves in a dungeon; level
up to pick from random weapon/passive upgrades; die and run again.

Core loop:
1. Spawn in arena, weapons auto-fire at the nearest enemy.
2. Move to dodge enemies and collect XP gems.
3. On level up, pick 1 of 3 random upgrades (new weapon or stat boost).
4. Survive escalating waves; bosses every ~2 minutes.
5. On death, optionally revive (rewarded ad stub) or end run.

## Repository layout

```
index.html              # Mobile-friendly viewport, loads game.js
src/
  game.js               # Phaser game config + scene registration
  config/
    balance.js          # Numbers: HP, damage, spawn rates, XP curve
    upgrades.js         # Upgrade pool definition (data-driven)
  scenes/
    BootScene.js        # Asset load
    MenuScene.js        # Title screen
    GameScene.js        # Main run
    UpgradeScene.js     # Level-up overlay
    GameOverScene.js    # Death screen, revive prompt
  entities/
    Player.js
    Enemy.js
    Projectile.js
    XPGem.js
  systems/
    WaveDirector.js     # Spawns enemies based on time
    UpgradeSystem.js    # Applies picked upgrades to player
    Joystick.js         # Virtual touch joystick
  services/
    ads.js              # Rewarded / interstitial stubs
    iap.js              # IAP stubs
    storage.js          # Persistent meta progression (localStorage)
```

## Working agreements for this repo

- Branch: `claude/roguelike-game-development-vN5yL` for all work on this title.
- Keep the engine code generic enough to reskin. Game-specific tuning lives in
  `src/config/`.
- Test in browser (`python3 -m http.server`) before committing big changes.
- Defer Capacitor + ad SDK integration until the gameplay feels good — they
  add native build complexity that slows iteration.
