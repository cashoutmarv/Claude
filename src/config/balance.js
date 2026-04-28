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
  grunt:  { hp: 18,  speed: 90,  damage: 8,  xp: 1, color: 0xc94a4a, radius: 12 },
  runner: { hp: 12,  speed: 150, damage: 6,  xp: 1, color: 0xe07a3c, radius: 10 },
  tank:   { hp: 80,  speed: 55,  damage: 14, xp: 4, color: 0x7a3ce0, radius: 18 },
  boss:   { hp: 1200, speed: 70, damage: 22, xp: 40, color: 0xf2c14e, radius: 34 },
};

export const WAVES = {
  // Spawn cadence is interpolated by elapsed seconds.
  initialSpawnMs: 1100,
  minSpawnMs: 140,
  rampSeconds: 480, // by 8min spawn rate hits floor
  bossEverySeconds: 120,
  // HP/dmg multiplier grows linearly with minutes survived.
  hpScalePerMinute: 0.22,
  damageScalePerMinute: 0.10,
};

export const XP = {
  // XP needed for level N (1-indexed) = base + step * (N-1) ^ exp
  base: 5,
  step: 4,
  exp: 1.35,
  gemColor: 0x49d6ff,
  magnetSpeed: 520,
};

// Drift mechanic — universal across mounts. The trigger is the same
// everywhere; the *effect* varies by mount (see config/mounts.js).
export const DRIFT = {
  // Sample recent input no faster than every 50ms — ignores micro-jitter.
  inputSampleMs: 50,
  // Only consider input "real" if magnitude exceeds this. Below this, the
  // joystick is essentially neutral.
  inputMagnitudeMin: 0.6,
  // How recent the "old direction" sample has to be to count as a turn.
  inputHistoryMs: 250,
  // Turn detection — dot product between current and recent input. Lower =
  // sharper turn. -0.3 ≈ 107° turn.
  turnDotMax: -0.3,
  // Skid mark interval during drift (visual).
  skidMs: 60,
};
