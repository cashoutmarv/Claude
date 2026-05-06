# Dungeon Drift — Session Handoff

Pick this up in a new Claude Code chat by saying:

> Read HANDOFF.md, then tell me where we are and what's next.

---

## TL;DR

I'm an indie solo dev (cashoutmarv) building **Dungeon Drift**, a one-finger
roguelike survivor for iOS/Android. Game is built in Phaser 3 with a planned
Capacitor wrapper for native builds. This is the first of a planned
passive-income studio portfolio.

- **Repo:** https://github.com/cashoutmarv/Claude
- **Active branch:** `claude/roguelike-game-development-vN5yL`
- **Latest PR:** [#3 — mount #1 (Stable Pony) + drift mechanic](https://github.com/cashoutmarv/Claude/pull/3) (draft)
- **Current task:** playtest the drift mechanic on phone before any more
  feature work or marketing.

## What's in the game today

Playable end-to-end:

- Top-down auto-shooter survivor. Move with virtual joystick (mobile) or
  WASD/arrows (desktop). Weapons auto-fire at the nearest enemy.
- Procedural enemy waves (grunt / runner / tank), bosses every 2 minutes.
- XP gems with magnet pickup; level-up modal with 3 random upgrades.
- Game-over screen with rewarded-ad revive (stub) + gem revive.
- Meta layer: Home, Gacha (with pity + selector tokens), Shop (IAP stubs),
  Inventory, VIP, daily login.
- **Mount system** (just landed): "characters" reframed as mounts. Each
  has a unique drift signature. Mount #1 (Stable Pony) is fully designed;
  the rest are interim with a generic `pulse` signature until redesigned.
- **Drift mechanic** (just landed): sharp joystick turn while moving fast =
  350ms slide in the old direction, with i-frames + a per-mount effect.
  Stable Pony's effect = 110px damage pulse.
- Ad/IAP/subscription services are all stubbed behind clean boundaries
  (`src/services/{ads,iap,subscription}.js`) so the SDK swap happens at
  packaging time without touching gameplay.

## The 9-item plan

1. ✅ Pivot to mounts + drift mechanic (PR #3)
2. ⏸ Update press kit + post templates with mount theme
3. ⏸ Replace procedural shapes with proper sprite atlases
4. ⏸ Set up GitHub Pages (will be done as part of testing — see below)
5. ⏸ Capture first gameplay clip + queue first social post
6. ⏸ Wire Capacitor for native iOS/Android builds
7. ⏸ Add the remaining 29 mounts (signatures + sprites)
8. ⏸ Add 3 weapons keyed to mount theme
9. ⏸ Difficulty curve tuning

## Locked design decisions

- **Mount system.** v1 launch: 30 mounts total (10 Common, 8 Uncommon,
  6 Rare, 4 Epic, 2 Legendary). Each has a unique drift signature.
- **Drift is universal**, signatures are per-mount. Effects dispatched in
  `GameScene.applyDriftSignature()` — adding a new effect = adding a `case`.
- **Free starters.** 3 mounts of Common/Uncommon tier are unlocked at
  account creation (player picks one before each run).
- **Mid-run mount boxes.** Spawn in the arena over time. Driving over one
  swaps your mount (hard swap; old mount gone for that run; XP/level/
  upgrades persist).
- **Premium Start.** Bundled with the existing "any IAP grants permanent
  ad-free" promise: paying players can start runs with any owned mount,
  not just the 3 free starters.
- **Skins.** Each mount has 1 base + 2–3 unlockable skins (palette/material
  for v1, full art later). Picked beforehand in the garage.
- **Reference relics ("homage" tier).** Non-trademarked names that nod to
  gaming culture (Plumber's Mushroom, Hero's Triangle Charm, Blue
  Hedgehog Sneakers, Sleek Master Edge, Cardboard Box, etc.). Coming in a
  future commit; ~8 at launch.

## Monetization rules (do not break)

These are non-negotiable and live in `CLAUDE.md`:

- No banner ads, no interstitials, no forced video. **Ever.**
- Only player-initiated rewarded video (revive, reroll upgrade, double
  daily reward, free chest).
- Any IAP — even a $0.99 gem pack — grants **permanent ad-free** as a
  thank-you. Cheapest path to ad-free is $0.99.
- No PvP, so power can never be pay-to-win.
- Gacha: hard pity at 70 pulls. Selector tokens drop 1 per pull and never
  expire. Worst-case spend to pick a specific Legendary ≈ $100.

## How to playtest right now (revised: GitHub Pages, no local install)

The local Python-server path was friction. New approach:

1. Go to https://github.com/cashoutmarv/Claude/settings/pages
2. Under **Build and deployment**:
   - **Source:** Deploy from a branch
   - **Branch:** `claude/roguelike-game-development-vN5yL`
   - **Folder:** `/ (root)`
3. Click **Save**. Wait ~30–60 seconds. The page will show a green
   "Your site is live at https://cashoutmarv.github.io/Claude/" link.
4. Open that URL on your phone (or desktop browser). Tap **PLAY**.

That's it. Every time we push to the feature branch, Pages auto-redeploys
within a minute. Once we merge to `main`, change the Pages source to
`main` and the public URL stays the same.

### How to trigger drift

While moving fast in one direction, snap the joystick (or arrow keys) to
the opposite direction. You should see:
- Cyan ring expand around the player
- HUD's `DRIFT` text flash yellow → dim grey (cooldown) → cyan (ready)
- A short skid trail
- Enemies in the ring's radius take damage

### What to give feedback on

Even one-word feedback is useful — feel-tuning data:

- Does drift trigger **when you want it to**? (too sensitive / too hard)
- Do the **i-frames** let you slide through enemies safely?
- Does the damage pulse feel **meaningful** vs. early enemies?
- Does the **700ms cooldown** feel fair, or too restrictive?
- Anything **broken or weird** visually?

## Adjacent things mentioned in conversation

- **Skillz / Unity project.** I have a Skillz dev account and downloaded
  Unity for a separate skill-based PvP game, Triumph-style. That's a
  **separate repo** — do NOT mix it with Dungeon Drift. Spin up when ready.
- **Marketing folder** (`marketing/`) was scaffolded with press kit, post
  templates, hype calendar, and capture frame. All static. Templates
  reference variables like `{game}` that need to be replaced with real
  handles/URLs once those exist. Will be re-themed for mounts in task #2.

## File map (where to look)

```
CLAUDE.md                      # Studio plan + monetization rules (READ FIRST)
HANDOFF.md                     # This file
index.html                     # Entry point
src/
  game.js                      # Phaser scene registration
  config/
    balance.js                 # Run-time numbers (HP, damage, drift constants)
    mounts.js                  # ★ Mount catalog (drift signatures live here)
    items.js                   # Re-exports MOUNTS as CHARACTERS
    upgrades.js                # In-run level-up pool
    economy.js                 # Currency + IAP + revive costs
    achievements.js            # First-time gem reward triggers
    banners.js                 # Gacha banners + odds
    vip.js, subscription.js
  scenes/                      # BootScene, HomeScene, GameScene, etc.
  entities/                    # Player.js (★ drift mechanic), Enemy, Projectile, XPGem
  systems/                     # WaveDirector, UpgradeSystem, Joystick
  services/                    # storage, currency, inventory, gacha, ads, iap, vip, sub, achievements
  ui/                          # CurrencyBar, AchievementToast
marketing/
  presskit/index.html          # Press kit
  templates/posts.json         # Post templates per platform/phase
  calendar.md                  # 8-week pre-launch schedule
  capture.html                 # 9:16 frame for clean OBS capture
```

## What's next after playtest

- If drift feels good → start task #2 (re-theme press kit + templates for
  mounts, then sprite atlases / GitHub Pages tasks).
- If drift feels off → tune `DRIFT` constants in `src/config/balance.js`
  and Stable Pony's drift block in `src/config/mounts.js`. Iterate until
  it lands, then proceed.
- After playtest, decide whether to merge PR #3 to `main` (Pages source
  can then move to `main`) or keep iterating on the feature branch.
