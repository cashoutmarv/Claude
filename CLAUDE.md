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

Designed around a hard rule: **a player who never taps an ad button never sees an ad.**
No interstitials, no banners, no forced video. All ad surfaces are
player-initiated, framed as a tradeoff ("watch ad OR spend gems"). Revenue
comes from the meta layer (gacha, subscription, gem packs, VIP perks) — ads
are a secondary income stream and a grind-relief tool for F2P players.

### Currencies

- **Gold** (soft) — earned in runs (kills, boss drops, run completion).
  Spent on standard gacha pulls, weapon level-ups, in-run revives.
- **Gems** (hard) — earned slowly via first-time achievements, daily login,
  opt-in rewarded ads, missions. Bought via IAP. Spent on premium gacha,
  cooldown skips, extra revives, cosmetics.

Early-game gems come almost entirely from one-shot **first-time
achievements** (first kill, first level up, first boss kill, survive 5 min,
etc.) so new players feel a steady drip of premium currency for ~1 week
before the IAP surface becomes the natural next step. See
`src/config/achievements.js`.

### Item tiers (5 levels)

Common → Uncommon → Rare → Epic → Legendary.
Applies to characters, weapons, and relics. Higher tier = higher stat
ceiling and visual polish. Duplicates from gacha convert to **shards** that
level the existing item (1 → 30), so dupes are never wasted.

### Items

- **Characters** — playable avatars. Each has a unique starter weapon and
  a passive (e.g. "Adventurer: +10% XP gain"). Common starter is free.
- **Weapons** — additional starting weapons unlocked via gacha. Weapons
  unlocked elsewhere are still upgradable in-run via the existing run-time
  upgrade pool.
- **Relics** — 3 equippable slots. Permanent stat bonuses applied at run
  start (e.g. "Sharpened Charm: +5% damage").

### Gacha

Two banners:

- **Standard banner** (always available). Pulls cost gold OR gems.
- **Featured banner** (rotates every 2-3 weeks). Pulls cost gems. Drives
  reactivation; rate-up on a featured Legendary character.

Rates and pity:

- Common 75%, Uncommon 18%, Rare 6%, Epic 0.9%, Legendary 0.1% (base).
- Soft pity: Legendary chance ramps from pull 60 onward.
- Hard pity: guaranteed Legendary by pull 80.
- 10-pull discount: 10% off, guaranteed Rare-or-better in every 10.
- Every pull also drops "exchange tokens" usable on a permanent shop —
  no pull is ever wasted.

Compliance: published odds in-game, region check (Belgium/Netherlands
restrict paid loot boxes — those regions get gold-only pulls).

### Revive economy

| Revive # in run | Cost |
|---|---|
| 1st | Watch rewarded ad **OR** 50 gems |
| 2nd | 100 gems (no ad option) |
| 3rd+ | 200 gems |

Players choose how to revive. The ad option exists; nobody is forced into it.

### VIP system

Every $1 spent via IAP = 1 VIP point. VIP levels unlock cosmetic frames,
+X% gold/XP boosts, daily free pulls, an extra revive slot. **Pure perks,
never raw power** — VIPs progress faster, not stronger.

### Adventurer's Pass (subscription)

$4.99 / month, cancel anytime via App Store / Play.

- 50 gems / day
- +50% XP from gems
- Exclusive cosmetic frame
- Extra free rewarded-ad slot per day

Sustainable revenue floor independent of gacha luck. RevenueCat handles
receipt validation, trial management, and cross-device entitlement sync.

### IAP catalog

| Product | Price | Type |
|---|---|---|
| Adventurer's Pass | $4.99/mo | auto-renewable subscription |
| Gem pack S | $0.99 | consumable (100 gems) |
| Gem pack M | $4.99 | consumable (600 gems) |
| Gem pack L | $9.99 | consumable (1,300 gems) |
| Gem pack XL | $49.99 | consumable (7,500 gems) |
| Gem pack XXL | $99.99 | consumable (16,000 gems) |
| Starter pack | $1.99 | one-time (gems + Rare relic + cosmetic) |
| Remove ads option | $3.99 | one-time (hides all ad buttons) |

### Ad placements (player-initiated only)

| Placement | Status |
|---|---|
| Rewarded video to revive | ✅ button on game-over |
| Rewarded video to reroll level-up upgrades | ✅ button on level-up modal |
| Rewarded video to double daily reward | ✅ button on home |
| Rewarded video to claim "free chest" timer | ✅ button on home |
| Interstitial between runs | ❌ removed |
| Banner ads | ❌ never |
| Forced video | ❌ never |

### Anti-pay-to-win guardrails

- No PvP. Power level is a solo concern.
- Every gacha item is also obtainable through gameplay (slower).
- Daily gem caps from F2P sources funnel toward IAP without locking
  content.
- Subscription gives convenience and cosmetics, never exclusive damage.

Networks: AdMob (Android primary) + Unity LevelPlay/AppLovin MAX as mediation;
RevenueCat for IAP and subscriptions. All wired through Capacitor plugins.
**Implementation in this repo is stubbed** behind `src/services/ads.js`,
`src/services/iap.js`, and `src/services/subscription.js` so the game runs
in a browser and integrations are dropped in at packaging.

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
    balance.js          # Run-time numbers: HP, damage, spawn rates
    upgrades.js         # In-run upgrade pool (level-up choices)
    economy.js          # Currency rates, prices, gem caps
    items.js            # Characters / weapons / relics catalog
    banners.js          # Gacha banners + odds + pity rules
    achievements.js     # First-time gem reward triggers
    vip.js              # VIP level perks
    subscription.js     # Adventurer's Pass benefits
  scenes/
    BootScene.js        # Asset load
    MenuScene.js        # Splash → HomeScene
    HomeScene.js        # Main lobby (currencies, Play, Gacha, Shop, ...)
    GameScene.js        # Main run
    HUDScene.js         # In-run HUD overlay
    UpgradeScene.js     # Level-up overlay
    GameOverScene.js    # Death screen, revive prompt, run summary
    GachaScene.js       # Gacha banners + pull animation
    ShopScene.js        # IAP gem packs + Adventurer's Pass
    InventoryScene.js   # Owned items, equip relics, level up
    VIPScene.js         # VIP track + perks
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
    storage.js          # Versioned save state (localStorage)
    currency.js         # Gold + gems wallet (events)
    inventory.js        # Owned items, equipped slots, level/shards
    gacha.js            # Pull logic with pity
    achievements.js     # First-time milestone tracking + rewards
    vip.js              # VIP point tracking + level perks
    subscription.js     # Adventurer's Pass entitlement state
    ads.js              # Rewarded-only ad stubs (no interstitials)
    iap.js              # Gem packs + subscription stubs
```

## Working agreements for this repo

- Branch: `claude/roguelike-game-development-vN5yL` for all work on this title.
- Keep the engine code generic enough to reskin. Game-specific tuning lives in
  `src/config/`.
- Test in browser (`python3 -m http.server`) before committing big changes.
- Defer Capacitor + ad SDK integration until the gameplay feels good — they
  add native build complexity that slows iteration.
