// Mount catalog. Mounts replace the previous "character" slot — each is a
// rideable creature/vehicle with base stats AND a unique drift signature
// (the same drift trigger does different things on different mounts).
//
// Drift signatures are referenced by string id and dispatched in
// GameScene.applyDriftSignature() so this file stays data-only.
//
// v1 launch target: 30 mounts (10 Common, 8 Uncommon, 6 Rare, 4 Epic,
// 2 Legendary). Mount #1 (Stable Pony) ships fully realized. The other
// entries below are *interim* — they keep the gacha pool alive with their
// existing stat passives, but their drift signature is the generic "pulse"
// effect with tier-scaled tuning. Each interim mount will be redesigned
// (unique signature, custom sprite, themed name) in subsequent commits.

export const MOUNTS = {
  // Mount #1 — fully designed.
  stable_pony: {
    id: "stable_pony",
    name: "Stable Pony",
    tier: "common",
    desc: "Reliable starter. Drift bursts a damage pulse and grants i-frames.",
    starterWeapon: "bolt",
    starter: true,
    apply: (s) => { s.xpMul *= 1.05; },
    drift: {
      signature: "pulse",
      durationMs: 350,
      cooldownMs: 700,
      speedMul: 1.5,
      iframes: true,
      pulseRadius: 110,
      pulseDamage: 16,
    },
  },

  // ---- Interim mounts below (former "characters"). Drift = generic pulse
  // until each one's signature gets designed. Stats unchanged so the gacha
  // economy and existing balance still hold.

  scout: {
    id: "scout",
    name: "Scout",
    tier: "uncommon",
    desc: "+12% move speed, +1 magnet range. Drift pulse damage.",
    starterWeapon: "bolt",
    apply: (s) => { s.speedMul *= 1.12; s.pickupMul *= 1.30; },
    drift: { signature: "pulse", durationMs: 350, cooldownMs: 700, speedMul: 1.6, iframes: true, pulseRadius: 120, pulseDamage: 18 },
  },
  duelist: {
    id: "duelist",
    name: "Duelist",
    tier: "rare",
    desc: "+15% damage, -5% max HP. Drift pulse damage.",
    starterWeapon: "bolt",
    apply: (s) => { s.damageMul *= 1.15; s.maxHp *= 0.95; },
    drift: { signature: "pulse", durationMs: 380, cooldownMs: 650, speedMul: 1.6, iframes: true, pulseRadius: 130, pulseDamage: 26 },
  },
  warden: {
    id: "warden",
    name: "Warden",
    tier: "rare",
    desc: "+30 max HP, +0.3 HP/sec regen. Drift pulse damage.",
    starterWeapon: "bolt",
    apply: (s) => { s.maxHp += 30; s.regenPerSec += 0.3; },
    drift: { signature: "pulse", durationMs: 400, cooldownMs: 700, speedMul: 1.4, iframes: true, pulseRadius: 130, pulseDamage: 24 },
  },
  sorcerer: {
    id: "sorcerer",
    name: "Sorcerer",
    tier: "epic",
    desc: "+1 projectile, +10% fire rate. Drift pulse damage.",
    starterWeapon: "bolt",
    apply: (s) => { s.projectiles += 1; s.fireRateMul *= 1.10; },
    drift: { signature: "pulse", durationMs: 380, cooldownMs: 600, speedMul: 1.6, iframes: true, pulseRadius: 140, pulseDamage: 32 },
  },
  archmage: {
    id: "archmage",
    name: "Archmage",
    tier: "legendary",
    desc: "+25% damage, +1 projectile, +1 pierce. Drift pulse damage.",
    starterWeapon: "bolt",
    apply: (s) => { s.damageMul *= 1.25; s.projectiles += 1; s.pierce += 1; },
    drift: { signature: "pulse", durationMs: 420, cooldownMs: 550, speedMul: 1.7, iframes: true, pulseRadius: 160, pulseDamage: 44 },
  },
};
