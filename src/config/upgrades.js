// Data-driven upgrade pool. Each upgrade has a stable id, display copy, max
// stack count, and an `apply(player)` mutator. Adding/balancing upgrades is
// just editing this file — no engine changes needed.

export const UPGRADES = [
  {
    id: "damage",
    name: "Sharpened Bolts",
    desc: "+20% projectile damage",
    maxStacks: 6,
    apply: (p) => { p.stats.damageMul *= 1.20; },
  },
  {
    id: "firerate",
    name: "Quickdraw",
    desc: "+15% fire rate",
    maxStacks: 6,
    apply: (p) => { p.stats.fireRateMul *= 1.15; },
  },
  {
    id: "speed",
    name: "Swift Boots",
    desc: "+10% move speed",
    maxStacks: 5,
    apply: (p) => { p.stats.speedMul *= 1.10; },
  },
  {
    id: "maxhp",
    name: "Vitality",
    desc: "+25 max HP, heal to full",
    maxStacks: 5,
    apply: (p) => {
      p.stats.maxHp += 25;
      p.hp = p.stats.maxHp;
    },
  },
  {
    id: "regen",
    name: "Regrowth",
    desc: "+0.5 HP / sec regen",
    maxStacks: 5,
    apply: (p) => { p.stats.regenPerSec += 0.5; },
  },
  {
    id: "projectiles",
    name: "Multi-shot",
    desc: "+1 projectile per volley",
    maxStacks: 4,
    apply: (p) => { p.stats.projectiles += 1; },
  },
  {
    id: "pierce",
    name: "Piercing Shot",
    desc: "Projectiles pierce +1 enemy",
    maxStacks: 3,
    apply: (p) => { p.stats.pierce += 1; },
  },
  {
    id: "magnet",
    name: "Lodestone",
    desc: "+50% pickup radius",
    maxStacks: 4,
    apply: (p) => { p.stats.pickupMul *= 1.5; },
  },
  {
    id: "orb",
    name: "Orbiting Shard",
    desc: "Adds an orbiting shard that damages enemies",
    maxStacks: 4,
    apply: (p) => { p.stats.orbCount += 1; },
  },
  {
    id: "xpgain",
    name: "Hungry Mind",
    desc: "+20% XP from gems",
    maxStacks: 5,
    apply: (p) => { p.stats.xpMul *= 1.20; },
  },
];
