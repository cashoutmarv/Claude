// Central tuning file. All gameplay numbers live here so designers (and
// future reskins) can tweak feel without touching engine code.

export const ARENA = {
  width: 2400,
  height: 2400,
};

export const PLAYER = {
  maxHp: 100,
  speed: 220,
  pickupRadius: 70,
  invulnMs: 600,
  startWeapon: "bolt",
};

export const WEAPONS = {
  bolt: {
    name: "Magic Bolt",
    cooldownMs: 520,
    damage: 12,
    speed: 520,
    lifeMs: 1200,
    pierce: 0,
    projectiles: 1,
    spreadDeg: 0,
  },
  orb: {
    name: "Orbiting Shard",
    orbitRadius: 70,
    orbitSpeed: 3.0, // radians/sec
    damage: 10,
    count: 0, // unlocked via upgrade
    tickMs: 250, // damage tick per enemy
  },
};

// Enemy archetypes. Stats scale with elapsed time — see WaveDirector.
export const ENEMIES = {
  grunt:  { hp: 32,  speed: 105, damage: 12, xp: 1,  color: 0xc94a4a, radius: 14 },
  runner: { hp: 20,  speed: 170, damage: 9,  xp: 1,  color: 0xe07a3c, radius: 10 },
  tank:   { hp: 140, speed: 62,  damage: 18, xp: 4,  color: 0x7a3ce0, radius: 20 },
  boss:   { hp: 2000, speed: 80, damage: 26, xp: 40, color: 0xf2c14e, radius: 36 },
};

export const WAVES = {
  initialSpawnMs: 800,
  minSpawnMs: 110,
  rampSeconds: 240,   // ramp twice as fast — peak density at 4 min not 8
  bossEverySeconds: 90,
  hpScalePerMinute: 0.35,
  damageScalePerMinute: 0.18,
};

export const XP = {
  // XP needed for level N (1-indexed) = base + step * (N-1) ^ exp
  base: 5,
  step: 4,
  exp: 1.35,
  gemColor: 0x49d6ff,
  magnetSpeed: 520,
};

// Dash — tap the right half of the screen (or SPACE) while moving to dash
// in your facing direction. Mount pickups (future) will enhance the effect.
export const DASH = {
  durationMs: 300,
  cooldownMs: 800,
  speedMul: 2.4,  // velocity multiplier during dash
};
