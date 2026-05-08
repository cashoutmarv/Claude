# Escape The Multiverse — Things You Need To Create

Everything that requires Studio / create.roblox.com / your hands. Each item
includes name, slot, price, where it goes, and where the corresponding code
ID slot lives so I can wire it up afterward.

When you finish a section, paste me the IDs and I'll commit them.

---

## Tier 0 — One-time setup (must come first)

| # | Item | Where | Notes |
|---|---|---|---|
| 0.1 | **Install Roblox Studio** | https://create.roblox.com/dashboard → Download Studio | Free, Mac/Windows only. |
| 0.2 | **Create a new Experience** | create.roblox.com → *Create New Experience* | Pick *Universal* genre is fine. Privacy = Private until launch. Save the **Experience (Universe) ID** + **Place ID**. |
| 0.3 | **Build the .rbxlx and open it** | terminal in `roblox/escape-the-multiverse/`: `aftman install && rojo build place.project.json -o build/EscapeTheMultiverse.rbxlx` then double-click the file | Studio opens our 200-stage world. |
| 0.4 | **File → Save to Roblox As** | Studio menu | Pick the place from 0.2. From now on `rojo serve` connects live. |
| 0.5 | **Game Settings → Security**: enable *"Studio Access to API Services"* and *"Allow HTTP Requests"* | Studio → Home → Game Settings | Required for DataStore + MarketplaceService. Without this, saves silently fail. |

**Cost:** $0. Studio + experience creation are free.

---

## Tier 1 — Gamepasses (11 total)

Created at: **create.roblox.com → your experience → Monetization → Passes → Create a Pass**.
Each needs: name, description (1 sentence), 512×512 PNG icon, price.

**Roblox fee:** free to create. Roblox takes 30% on every sale.

| Code slot | Pass name (use exactly) | Price (Robux) | Description suggestion |
|---|---|---|---|
| `VIP` | `VIP Access` | **499** | "Unlocks the gold barrier at the end of THE VOID and grants a permanent VIP nameplate." |
| `SkipW1` | `Skip Stage 15 — Glitch` | **49** | "Skip the toughest jump in The Glitch World." |
| `SkipW2` | `Skip Stage 15 — Candy` | **49** | "Skip the toughest jump in Candy Apocalypse." |
| `SkipW3` | `Skip Stage 15 — Temple` | **49** | "Skip the toughest jump in Ancient God Temple." |
| `SkipW4` | `Skip Stage 15 — Moon` | **49** | "Skip the toughest jump on The Moon Base." |
| `SkipW5` | `Skip Stage 15 — Abyss` | **49** | "Skip the toughest jump in Underwater Abyss." |
| `SkipW6` | `Skip Stage 15 — Kitchen` | **49** | "Skip the toughest jump in Hell's Kitchen." |
| `SkipW7` | `Skip Stage 15 — Cloud` | **49** | "Skip the toughest jump in Cloud City." |
| `SkipW8` | `Skip Stage 15 — Backrooms` | **49** | "Skip the toughest jump in The Backrooms." |
| `SkipW9` | `Skip Stage 15 — Cyber` | **49** | "Skip the toughest jump in Cyber Tokyo." |
| `SkipW10` | `Skip Stage 15 — Void` | **99** | "Skip the toughest jump in THE VOID. Premium tier." |

**Code lives at:** `src/shared/Config/Monetization.lua` → `GAMEPASSES`.
**Hand back to me:** 11 numeric IDs, one per slot above.

**Total cost to create:** 0 Robux.

---

## Tier 2 — Developer Products (7 total)

Created at: **Monetization → Developer Products → Create**.
Same icon spec as passes; price is Robux per purchase (consumable).

| Code slot | Product name | Price (Robux) | Grants in-game |
|---|---|---|---|
| `GemPackS` | `Gem Pack S` | **79** | 100 gems |
| `GemPackM` | `Gem Pack M` | **399** | 600 gems |
| `GemPackL` | `Gem Pack L` | **799** | 1,300 gems |
| `GemPackXL` | `Gem Pack XL` | **3,999** | 7,500 gems |
| `GemPackXXL` | `Gem Pack XXL` | **7,999** | 16,000 gems |
| `GachaSingleHard` | `Gacha Pull (1)` | **99** | 1 premium pull |
| `GachaTenHard` | `Gacha Pull (10)` | **899** | 10 premium pulls (10% off vs single ×10) |

**Code lives at:** `src/shared/Config/Monetization.lua` → `DEV_PRODUCTS`.
**Hand back:** 7 numeric IDs.

**Total cost to create:** 0 Robux. (Prices align 1:1 with the Phaser project's USD packs at ~80 R$/$1.)

---

## Tier 3 — Badges (14 total)

Created at: **your experience → Badges → Create Badge**.
Each needs: name, description (1 sentence), 256×256 PNG icon.

**Roblox fee:** Roblox charges a per-badge upload fee (currently in the
low-100 Robux range — verify on the create page; pricing has changed
historically). If you make 14 badges, budget ~1,500 R$ for badge uploads.

| Code slot | Badge name | Description |
|---|---|---|
| `World1Cleared` | `Glitch World Cleared` | "Cleared all 20 stages of The Glitch World." |
| `World2Cleared` | `Candy Apocalypse Cleared` | "Cleared all 20 stages of Candy Apocalypse." |
| `World3Cleared` | `Ancient Temple Cleared` | "Cleared all 20 stages of the Ancient God Temple." |
| `World4Cleared` | `Moon Base Cleared` | "Cleared all 20 stages of The Moon Base." |
| `World5Cleared` | `Abyss Cleared` | "Cleared all 20 stages of the Underwater Abyss." |
| `World6Cleared` | `Hell's Kitchen Cleared` | "Cleared all 20 stages of Hell's Kitchen." |
| `World7Cleared` | `Cloud City Cleared` | "Cleared all 20 stages of Cloud City." |
| `World8Cleared` | `Backrooms Cleared` | "Cleared all 20 stages of The Backrooms." |
| `World9Cleared` | `Cyber Tokyo Cleared` | "Cleared all 20 stages of Cyber Tokyo." |
| `World10Cleared` | `Void Conqueror` | "Cleared all 20 stages of THE VOID." |
| `AbyssSecretRoom` | `Hidden Pearl` | "Found the secret room hidden in World 5." |
| `MultiverseEscape` | `Multiverse Escapist` | "Cleared all 200 stages — you escaped the multiverse." |
| `FirstRaceWin` | `First Place` | "Won your first race." |
| `HundredDeaths` | `Persistent` | "Died 100 times in a single session." |

**Code lives at:** `src/shared/Config/Badges.lua`.
**Hand back:** 14 numeric IDs.

**Total cost to create:** ~1,500 Robux (verify per-badge fee on the create page).

---

## Tier 4 — Audio asset IDs (10 world music tracks) — optional

`src/shared/Config/Worlds.lua` references 10 `rbxassetid://` music IDs. These
are *placeholder community uploads* that may or may not still be valid /
licensed for use in your experience.

**Two paths:**

- **(a) Skip for v1** — game still plays without music. We can ship without.
- **(b) Upload your own audio.** Roblox audio uploads now cost based on
  duration (long tracks cost more Robux; short loops are cheap). Best
  practice: 60–120 second loop per world.

| World | Vibe target |
|---|---|
| 1 Glitch | Distorted synth, magenta/cyan static feel |
| 2 Candy | Bouncy chiptune, happy/manic |
| 3 Temple | Tribal drums, low brass |
| 4 Moon | Ambient pad, slow swells |
| 5 Abyss | Submerged whale calls + low hum |
| 6 Kitchen | Clattering sizzle, tense jazz |
| 7 Cloud | Soft choir, glockenspiel |
| 8 Backrooms | Fluorescent hum + reverb |
| 9 Cyber | Synthwave, 130bpm |
| 10 Void | Sub-bass drone, no melody |

**Hand back:** 10 `rbxassetid://NUMBER` strings, one per world.
**Code lives at:** `src/shared/Config/Worlds.lua` → each world's `music` field.

---

## Tier 5 — Hand-crafted milestone stages (40 .rbxmx files) — optional

All 200 stages already work procedurally. Replacing a milestone with a
hand-crafted `.rbxmx` upgrades just that one stage's visuals/layout.
**Recommended for v1: do 4 marquee stages, defer the rest.**

### Strongly recommended (4 stages)
| File name | Why this one |
|---|---|
| `W1_S01.rbxmx` | First stage every player sees — sets the bar. |
| `W5_S08.rbxmx` | Hosts the secret room (precise side jump). Procedural can't guarantee a clean off-line jump opportunity. |
| `W5_S15.rbxmx` | The first SKIP-gate stage players will pay for. Make it visibly hard. |
| `W10_S20.rbxmx` | The VIP gold gate finale. The capstone stage. |

### Recommended (after launch)
| File range | Count |
|---|---|
| `W{1..10}_S01.rbxmx` (each world's intro) | 10 |
| `W{1..10}_S20.rbxmx` (each world's finale) | 10 |

### Full set (eventually)
- `W{1..10}_S{01,10,15,20}.rbxmx` — 40 total.

### How to author one
1. In Studio, navigate to `Workspace.Worlds.W{N}.S{NN}` (e.g. `W5.S08`).
2. Delete the procedurally-generated children if you want a clean slate.
3. Build the stage. **Required**: include a `Part` named `StartAnchor` and a `Part` named `EndAnchor`. The end anchor must be tagged with CollectionService tag `StageReached` and have attributes `World = 5`, `Stage = 8`.
4. Right-click the `S08` Folder → **Save to File** → save as `W5_S08.rbxmx` into `roblox/escape-the-multiverse/src/workspace/MilestoneStages/`.
5. Tell me which milestones you authored and I'll flip `handcrafted = true` for those rows in `StageTable.lua`.

**Cost:** $0. Studio time only.

---

## Tier 6 — Cosmetic visuals (Trails / Auras / Nameplates) — optional

The current code creates trails programmatically (color sequences, no custom
texture) and auras / nameplates are tracked by `id` only. To get unique
visuals per cosmetic, you'd need to:

1. Upload texture decals (Roblox charges ~10 R$ each for image uploads).
2. Build each cosmetic as a Model in Studio.
3. Save each as `.rbxmx` under `assets/{Trails,Auras,Nameplates}/`.
4. Update `Cosmetics.lua` to reference the asset by name.

**Inventory (if going all-in):**
- Trails: 4 (already in code as starter kiosk: Fire, Ice, Rainbow, Glitch — visuals are color-driven, no texture needed)
- Auras: 11 (Spark, Leaf, Flame, Frost, Thunder, Void, Starlight, Nebula, GlitchStorm, Eternity, …)
- Nameplates: 9 (Paper, Wood, Bronze, Silver, Gold, Obsidian, Diamond, Emerald, Celestial)

**Cost:** ~250 R$ for ~24 image uploads, plus Studio time. Skip for v1 — game ships fine without unique visuals.

---

## Tier 7 — Group / Funding (optional but recommended)

If you want to take Robux payouts directly to a Roblox group (cleaner DevEx):

- Create a Roblox group (free if you already have Premium; otherwise ~100 R$ to create).
- Put the experience in the group's ownership instead of personal.
- Adjust Tier 0.2: create the experience under the group.

**Skip for v1** unless you have multiple collaborators.

---

## Total Robux budget summary

| Category | Robux cost | Notes |
|---|---|---|
| Gamepasses (11) | 0 | Free to create. 30% Roblox cut on sales. |
| Dev products (7) | 0 | Free to create. 30% cut. |
| Badges (14) | ~1,500 | Per-badge upload fee, verify current price. |
| Audio (10) | varies | Skip for v1, or upload short loops. |
| Cosmetic textures (~24) | ~250 | Skip for v1. |
| Group creation | 0 or 100 | Skip for v1. |
| **Minimum to ship v1** | **~1,500** | Just badges. |
| **Full polish** | **~2,000–5,000** | + audio + textures. |

**To buy Robux:** 1,000 R$ ≈ $9.99 USD on the Roblox site. Minimum 1,500 R$
≈ $14.99 to fund the must-do badges.

---

## What to send back to me, in this order

1. **Experience (Universe) ID** + **Place ID** (after Tier 0).
2. **11 gamepass IDs** keyed to the slot names from Tier 1.
3. **7 dev product IDs** keyed to the slot names from Tier 2.
4. **14 badge IDs** keyed to the slot names from Tier 3.
5. *(optional)* 10 audio IDs for Tier 4.
6. *(optional)* List of which milestone `.rbxmx` files you authored for Tier 5.

You can drop them on me in chunks — I'll commit incrementally. The game is
already wired so each ID flips that feature live the moment it's set; until
then, that feature gracefully no-ops.

---

## What I will do *while you create*

Let me know which to start on (or all of them, in order):

- **A.** Builders.spec.lua + Diagnostics.spec.lua (more CI coverage).
- **B.** Mark PR #6 ready for review and merge to main.
- **C.** StyLua autofix on src/ + flip stylua to a hard gate.
- **D.** Pre-stub a `MonetizationConfigCheck.lua` that warns at boot when any
  ID is still 0, so you'll get a clear Studio output telling you exactly
  which slots are unfilled.
