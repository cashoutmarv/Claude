# DESIGN.md — *Project Rift* (working title)

> One canonical doc. Every future session reads this first. If a decision isn't
> written here, it isn't decided. Update this file when the design changes;
> never let conversational drift become canon by accident.

---

## 1. Premise

You and your three closest friends are watching your favorite movie at night.
A rustle outside — a portal has opened in the backyard grass. You lean in.
The dark leans back. You fall.

You wake somewhere quiet. The trees are wrong, the sky is wrong, the air is
wrong — but somehow familiar. You're in the world of the movie you were just
watching.

A rift hangs in the sky above where you landed. One by one, your friends
tumble out of it, dazed and confused. Then it closes.

You have to survive. You have to find a way home — or change this world
enough that home is what it becomes.

## 2. The core loop

```
        ┌────────────────────────────────────┐
        ▼                                    │
    ┌────────┐    leave camp     ┌──────────┐│
    │  HUB   │ ─────────────────▶│  CAVES   ││
    │ (camp) │                   │  (run)   ││
    └────────┘ ◀────────────────┘└──────────┘│
        │      bring back loot              │
        │  & rescued NPCs                   │
        │                                   │
        │     periodic raids                │
        └───────► (defend camp) ────────────┘
```

- **Hub** — your safe place between expeditions. Build it up, talk to people,
  decorate, sleep, plan.
- **Caves** — short procedural roguelite expeditions. You leave the hub to
  find resources, rescue people, and discover rift-fragments that progress
  the story.
- **Raids** — every so often the hub itself comes under attack. A bell rings,
  waves pour in, you fight alongside your friends and NPCs to keep your
  buildings (and your people) standing.

**Open-ended ending.** v1 ships without a "you won" screen. Updates add new
late-game milestones: lifting a curse, defeating the rift-warden, restoring
the kingdom. The narrative ratchets forward over time the way live-service
games do.

## 3. The intro (Kingdom Hearts–style)

Pure black. Dim spotlight. Gold cursive serif text fades in slowly. A few
particles of light drift upward. The whole sequence reads like a memory
being stitched back together.

Four soul questions:

1. **Passion** — *What are you most passionate about?*
   - the unknown — the next horizon
   - making something with your hands
   - the people you love
   - understanding the *why* of things
   - the open road, no map
   - facing the thing that scares you

2. **Seeking** — *What do you seek in life?*
   - a place where you fit
   - the right to choose your own shape
   - a story worth being inside of
   - to be excellent at something true

3. **Family** — *What does family mean to you?*
   - the people who raised you
   - the people who choose you back
   - the strangers who became home
   - the ones you built something with

4. **Genre** — *What kind of story did you fall into?*
   - epic fantasy *(LOTR, Princess Mononoke)*
   - cosmic sci-fi *(Interstellar, Treasure Planet)*
   - gothic horror *(Crimson Peak, Pan's Labyrinth)*
   - adventure / western *(Indiana Jones, Avatar: The Last Airbender)*
   - slice of life *(My Neighbor Totoro, Kiki's Delivery Service)*
   - surreal / dreamlike *(Spirited Away, The NeverEnding Story)*

Then:

5. *And what should the world call you?* — player name (defaults to "Traveler").
6. *Who fell with you?* — three friend names (defaults: "Jamie", "Sam", "Riley").
   These three friends are your **finite story-unlock cast** — they are never
   gacha pulls. They arrive at scripted milestones.

Closing line fades in: *"The world remembers."* Fade to hub.

## 4. World synthesis

The four answers + genre + names get hashed into a save. The world's *look*
and *enemies* are functions of them.

- **Genre** is the dominant axis. It picks:
  - The enemy roster (fantasy = orcs/wraiths; sci-fi = constructs/drones;
    horror = wraiths/cultists; slice-of-life = no enemies on the surface,
    only in caves; surreal = abstract shapes; adventure = bandits/beasts).
  - The building shapes (fantasy = thatched cottages; sci-fi = pod-domes;
    horror = ruined chapels; etc.).
  - The dialogue voice (fantasy = lyrical; sci-fi = clipped/technical;
    horror = formal/archaic; slice = warm/colloquial).
- **Passion / Seeking / Family** weight a secondary set of dials:
  - **Biome** (forest / desert / coast / mountain / cosmic / urban-ruin)
  - **Ambient** (dawn / day / dusk / night / liminal)
  - **Weather** (clear / golden hour / fog / drizzle / aurora)
  - **Tone** (warm / cool / vivid / muted)

Two players with the same genre but different soul answers land in the same
*kind* of world in different *moods*. Two players with the same soul but
different genres land in completely different worlds.

> *Synthesis is described here; the actual synthesizer module is deferred to
> a later phase. The skeleton just persists raw answers.*

## 5. The hub

**Art direction.** BOTW-minimalist.

- Palette: soft sage greens, warm ochre earth, clear sky tones. No harsh
  blacks; deepest "black" is a desaturated navy.
- Geometry: rounded, clean shapes. Trees = stacked soft circles. Buildings =
  warm rectangles with subtle roof triangles. No hard outlines on
  environment objects; only characters get a 1px outline.
- Lighting: time-of-day tint (golden during day, deep indigo during raids,
  amber at sunset). The tint is a full-screen colored overlay with low alpha.
- Particles: drifting leaves, fireflies at night, embers above the campfire,
  occasional dust motes in shafts of light.
- Music/SFX: deferred. Silent for v1.

**Starting state (Day 1).** You arrive in a small clearing. There is:
- one campfire (lit),
- one bedroll (yours),
- one rift-marker (a faint vertical seam of light overhead — the closed rift),
- nothing else.

**Building progression.** Buildings unlock at story milestones, not by
spending currency at v1:
- After surviving your first night → **Tent** (sleep / save).
- After first cave cleared → **Workbench** (craft from cave loot).
- After first friend arrives → **Hearth** (gather, talk).
- After third friend arrives → **Lookout** (raid early-warning).
- Later: Tavern (gacha), Market (shop), Stables (mounts), Lodge (VIP).

Layout: starts as one small clearing. New buildings appear in concentric
rings as the camp grows. No grid-snap building placement in v1 — placements
are scripted to keep aesthetic control.

## 6. Raids

Periodic timed wave events that attack the hub itself. Inspired by Minecraft
raids and Vampire Survivors waves.

**Cadence.**
- First raid: ~8 minutes after hub entry on Day 1 (so the player has time to
  meet the place).
- Subsequent raids: every 12–20 in-game minutes, with light randomness.
- Difficulty ramps with story progress, not real-time elapsed.

**Structure.**
- **Warning** — a bell, a colored sky, a 30-second countdown.
- **Waves** — 3 waves of mobs spawn from the edge of the camp. Each wave is
  ~30–60 seconds. Mid-wave a small mini-boss.
- **End** — last enemy down → "the wind softens" → loot drops on the ground,
  damaged buildings show smoke until repaired.

**Damage.** Mobs prioritize the campfire (your "core"). If the campfire dies,
the raid is lost — but losing a raid is a soft loss: you wake up the next
morning, building HP slightly reduced, story progress preserved.

**NPC participation.** Your three friends fight alongside you. Movie-world
NPCs you've recruited do too. They can be downed but not permanently killed
in v1 (a "knocked out" state recovers between raids).

> *Raid system is described here; implementation is deferred. Skeleton just
> renders an empty hub with a campfire.*

## 7. The caves

Recontextualized roguelite expeditions. Press E at the cave mouth, you leave
camp.

- Procedurally generated each run. Biome + modifier varies (flooded,
  cursed, swarming, lightless, festive — the modifier flavors the run).
- **What you bring back**: resources (wood, stone, iron), items (weapons,
  relics), occasionally a rescued movie-world NPC (joins as a recruit),
  rift-fragments (story currency).
- **Death** sends you back to hub with whatever you were carrying — you do
  not lose loot on death. Death is a return, not a punishment.
- **Run length**: 5–10 minutes, mobile-session sized.
- **Friends in the cave**: one of your three friends comes with you per run
  (you pick at the cave mouth). They fight at your side; if downed they
  retreat to camp.

> *Cave system is described here; implementation is deferred. The skeleton
> does not have a cave scene.*

## 8. The friends (story unlocks, not gacha)

Three friends, finite, named in the intro. They are story unlocks earned by
playing — never random pulls, never duplicates, never paywalled. Each has a
personality + power tied loosely to a "real-life archetype" the player can
imagine for them.

| Slot | Default name | Archetype | Power |
|---|---|---|---|
| 1 | Jamie | "the one who plans" | +XP gain in caves; spots ambushes |
| 2 | Sam   | "the athletic one" | +move speed; takes a hit for you once per run |
| 3 | Riley | "the nerd"         | reveals enemy stats; +loot quality |

Arrival timing:
- **Jamie** falls in during the first raid warning, mid-bell.
- **Sam** falls in after the first cave run ends.
- **Riley** falls in after surviving your first full night-raid cycle.

The rift in the sky pulses brighter before each friend arrival, and dims
permanently when the third friend has come through.

## 9. The gacha (movie-world NPCs only)

Separate banner system. Pulls deliver inhabitants of the movie world you
fell into — villagers, warriors, mages, rogues, scholars, etc. — drawn from
a roster gated by your chosen **genre**.

- 5 tiers: Common → Uncommon → Rare → Epic → Legendary. (Mythic reserved for
  post-launch.)
- Rates: 65 / 21 / 10 / 3.5 / 0.5%.
- Pity: soft ramp from pull 50, hard at 70. 10-pull discount + guaranteed
  Rare+.
- Selector tokens (1 per pull, never expire): 30 → any Rare, 80 → any Epic,
  150 → any Legendary.
- Two banners: Standard (always) and Featured (rotates 2–3 weeks).
- Duplicates → shards → level up the existing item (1 → 30).

Friends are **never** on any banner.

## 10. Economy + monetization

Hard rule: **a player who never taps an ad button never sees an ad.** No
interstitials, no banners, no forced video. Ads are player-initiated tradeoffs.

- **Currencies**: gold (run-earned), gems (premium / achievements / opt-in
  ads), materials (cave loot for building repair / crafting).
- **Achievements** drip ~9,000 gems over the first 3–4 weeks (≈10 ten-pulls
  free), then taper.
- **Revives**: 1st free (rewarded ad OR 50 gems), 2nd 100 gems, 3rd+ 200 gems.
- **Ads (rewarded only)**: revive on death; reroll level-up upgrades; double
  daily reward; claim free chest timer. *That's the entire list.*
- **VIP**: 1 point per $1 spent. Purely cosmetic / convenience perks.
- **Adventurer's Pass**: $4.99/mo. 50 gems/day, +50% gem-from-XP, exclusive
  frame, extra rewarded-ad slot.
- **IAP catalog**: Pass $4.99/mo, Gem packs $0.99 → $99.99, Starter pack
  $1.99 one-time. Any IAP grants permanent ad-free.

Region compliance: Belgium / Netherlands get gold-only pulls (paid loot
boxes restricted).

> *Economy is described here; implementation is deferred.*

## 11. Tech stack

- **Engine**: Phaser 3 (HTML5 canvas/WebGL).
- **Language**: vanilla JavaScript ES modules. No build step in dev.
- **Mobile wrap**: Capacitor — deferred until the game feels good.
- **Ads**: AdMob (primary) + Unity LevelPlay/AppLovin MAX mediation —
  stubbed until wrap.
- **IAP**: RevenueCat — stubbed until wrap.
- **Storage**: `localStorage` (versioned, migratable). Capacitor `Preferences`
  swap at wrap-time, single-file change.
- **Test loop**: `python3 -m http.server`; Chrome DevTools mobile emulation
  for touch.

## 12. Repo layout (target — grows as systems land)

```
DESIGN.md                  ← this file. Source of truth.
CLAUDE.md                  ← engineering conventions + pointer to this file.
README.md                  ← short public-facing summary.
index.html                 ← mobile viewport + Phaser CDN load.
src/
  game.js                  ← Phaser config + scene registration.
  scenes/
    BootScene.js           ← preload + route to Intro or Hub.
    IntroScene.js          ← KH-style 4-question intro + naming.
    HubScene.js            ← walkable camp.
  services/
    storage.js             ← versioned save + migrations.
  systems/
    Joystick.js            ← virtual touch joystick.
```

Later phases add: `config/` (catalogs), `entities/` (player/enemy), more
`scenes/` (Cave, Gacha, Shop, etc.), more `services/` (currency, gacha,
inventory, ads, iap, subscription).

## 13. Working agreements

- One canonical doc: **this file**. If you wrote a decision in chat but not
  here, it's a draft — update DESIGN.md before assuming it's locked.
- Branch hygiene: feature work on `claude/<short-topic>-vN`. Don't push to
  `main`. Use draft PRs while iterating.
- Test in mobile-emulated browser before commit.
- Defer native packaging until the gameplay feels good.
- Defer audio until the visual identity feels good.
- Never add a system "for completeness" — it has to be required by the next
  thing in this doc.

## 14. What's *not* in this design

Explicitly out of scope, to keep the project from sprawling:
- PvP, leaderboards, social features.
- Player-driven base building (placement, snapping). Building positions are
  scripted.
- A "win the game" screen — the ending is open-ended.
- Multiplayer co-op raids.
- User-generated content.
- Multiple save slots.
- A second title / reskin. The reuse story (engine → multiple games) is real
  but it's the *next* product, not v1's concern.
