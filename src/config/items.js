// Item catalog. Three kinds:
//   - mounts:   playable creatures/vehicles (formerly "characters") with
//               base stats AND a drift signature. Defined in mounts.js.
//   - weapons:  starting weapons (run-time upgrade pool still applies)
//   - relics:   equippable passives (3 slots) applied at run start
//
// Each item has a stable id, tier (common/uncommon/rare/epic/legendary),
// and `apply(stats)` mutator. Stats are mutated *before the run starts*.

import { MOUNTS } from "./mounts.js";

// "Character" is the legacy slot name; mounts ride in that slot. Existing
// code (inventory, gacha, save state) references CHARACTERS — alias here so
// the rename is purely surface-level for now.
export const CHARACTERS = MOUNTS;

// Weapons — for v1 only the bolt is implemented; this catalog reserves IDs
// for future variants so the gacha pool has texture.
export const WEAPONS_CATALOG = {
  bolt:        { id: "bolt",       name: "Magic Bolt",      tier: "common",    desc: "Pierce-friendly straight projectile" },
  triple:      { id: "triple",     name: "Triple Shot",     tier: "uncommon",  desc: "Three-projectile spread", planned: true },
  homing:      { id: "homing",     name: "Homing Spark",    tier: "rare",      desc: "Tracks nearest enemy", planned: true },
  chain:       { id: "chain",      name: "Chain Lightning", tier: "epic",      desc: "Bounces between enemies", planned: true },
  meteor:      { id: "meteor",     name: "Meteor",          tier: "legendary", desc: "Falls from above on cooldown", planned: true },
};

export const RELICS = {
  iron_charm:    { id: "iron_charm",    name: "Iron Charm",      tier: "common",    desc: "+5 max HP",
                   apply: (s) => { s.maxHp += 5; } },
  brisk_ring:    { id: "brisk_ring",    name: "Brisk Ring",      tier: "common",    desc: "+3% move speed",
                   apply: (s) => { s.speedMul *= 1.03; } },
  sharp_charm:   { id: "sharp_charm",   name: "Sharpened Charm", tier: "uncommon",  desc: "+5% damage",
                   apply: (s) => { s.damageMul *= 1.05; } },
  gold_idol:    { id: "gold_idol",     name: "Gold Idol",       tier: "uncommon",  desc: "+10% gold from kills",
                   apply: (s) => { s.goldMul *= 1.10; } },
  swift_band:    { id: "swift_band",    name: "Swift Band",      tier: "rare",      desc: "+8% fire rate",
                   apply: (s) => { s.fireRateMul *= 1.08; } },
  hardy_amulet:  { id: "hardy_amulet",  name: "Hardy Amulet",    tier: "rare",      desc: "+25 max HP, +0.2 regen",
                   apply: (s) => { s.maxHp += 25; s.regenPerSec += 0.2; } },
  greedy_horn:   { id: "greedy_horn",   name: "Greedy Horn",     tier: "epic",      desc: "+25% gold from kills",
                   apply: (s) => { s.goldMul *= 1.25; } },
  scholar_tome:  { id: "scholar_tome",  name: "Scholar's Tome",  tier: "epic",      desc: "+20% XP from gems",
                   apply: (s) => { s.xpMul *= 1.20; } },
  void_pendant:  { id: "void_pendant",  name: "Void Pendant",    tier: "legendary", desc: "+15% damage, +1 projectile",
                   apply: (s) => { s.damageMul *= 1.15; s.projectiles += 1; } },
};

// Convenience lookup: { id -> { kind, def } } so generic UI code can render
// any item without knowing its kind.
export function lookupItem(id) {
  if (CHARACTERS[id]) return { kind: "character", def: CHARACTERS[id] };
  if (WEAPONS_CATALOG[id]) return { kind: "weapon", def: WEAPONS_CATALOG[id] };
  if (RELICS[id]) return { kind: "relic", def: RELICS[id] };
  return null;
}
