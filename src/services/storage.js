// Central save state. Versioned, namespaced, idempotent. All other services
// read/write through this so we never have multiple sources of truth.
//
// On native (Capacitor) the localStorage backend can be swapped for the
// Preferences plugin without touching callers.

const KEY = "dungeondrift.save.v2";
const VERSION = 5;

// Default save shape. Adding a new field here = automatic migration: any
// missing key is filled in on load.
const DEFAULTS = () => ({
  version: VERSION,
  // Run stats / records.
  bestTimeSec: 0,
  bestKills: 0,
  totalRuns: 0,
  // Lifetime counters that drive achievements.
  lifetime: {
    kills: 0,
    bossKills: 0,
    deaths: 0,
    revives: 0,
    pulls: 0,
    pullsByTier: { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 },
    runEnds: 0,
  },
  // Highest-ever achieved values, used for achievement triggers like
  // "reach level 10" or "survive 5 minutes" in a single run.
  bests: {
    runLevel: 1,
    runSurviveSec: 0,
  },
  // Achievement claim record: { [achievementId]: claimedTimestamp }.
  claimedAchievements: {},
  // Currency wallet. `materials` is the new hub-upgrade currency dropped
  // from cave runs and hub raids.
  wallet: { gold: 0, gems: 0, exchangeTokens: 0, materials: 0 },
  // Inventory.
  inventory: {
    // ownedCharacters[id] = { level, shards }
    // (the slot is still called "character" in storage; the items in it are
    // mounts — see config/mounts.js. Renaming the storage key is deferred so
    // existing dev saves don't get blown away.)
    ownedCharacters: { stable_pony: { level: 1, shards: 0 } },
    ownedRelics: {},
    ownedWeapons: { bolt: { level: 1, shards: 0 } },
  },
  // Equipped state.
  equipped: {
    character: "stable_pony",
    relics: [null, null, null],
  },
  // Gacha pity counters per banner.
  pity: {}, // { [bannerId]: { sinceLegendary: 0, totalPulls: 0 } }
  // VIP track.
  vip: { points: 0, level: 0 },
  // Subscription state.
  subscription: { active: false, sinceTs: 0, lastClaimTs: 0 },
  // Daily login.
  daily: { lastLoginDay: 0, streak: 0, lastRewardClaimedDay: 0 },
  // IAP entitlements.
  iap: { adFreeOwned: false, starterPackBought: false },
  // Ads.
  ads: { dailyAdGemEarnings: 0, dailyAdResetDay: 0 },
  // World synthesis from the KH-style intro. `stack` null = intro not yet
  // completed; the boot scene routes to IntroScene until this is set.
  //
  // `stack` is the resolved dial pick produced by services/worldgen.js. The
  // legacy `archetype` field is preserved on disk for diagnostics but is no
  // longer consulted at runtime once a `stack` exists.
  world: {
    archetype: null,        // legacy: kept for v4 saves migrating to v5
    stack: null,            // { biome, architecture, tone, weather, ambient }
    worldName: "",          // procedural name; player can rename at bonfire
    firstFriend: null,      // companion id who lands first
    tone: null,             // dialogue tone derived from family answer
    answers: { passion: null, seeking: null, family: null },
    chosenAt: 0,
  },
  // Player identity carried across runs. The intro asks for a first name
  // (optional — defaults to "Traveler").
  player: { name: "Traveler" },
  // Plot beat progression. Each entry in seenBeats is a beat id that has
  // already been shown so it never replays.
  plot: {
    seenBeats: [],
    friendsFound: [],       // companion ids in the order they arrive
    nextRaidUnlockAtRuns: 1, // first raid unlocks after run #1
  },
  // Hub building upgrade levels. Each building has a level 1..N.
  hub: {
    buildings: {
      tavern:   { level: 1 },
      market:   { level: 1 },
      garage:   { level: 1 },
      vipLodge: { level: 1 },
    },
    raidsCompleted: 0,
  },
});

function deepMerge(into, from) {
  if (!from || typeof from !== "object") return into;
  for (const k of Object.keys(from)) {
    if (from[k] && typeof from[k] === "object" && !Array.isArray(from[k])) {
      into[k] = deepMerge(into[k] && typeof into[k] === "object" ? into[k] : {}, from[k]);
    } else if (into[k] === undefined) {
      into[k] = from[k];
    } else {
      into[k] = from[k]; // saved value wins for primitives
    }
  }
  return into;
}

// In-place save migrations. Runs before deepMerge so default values can fill
// in any newly-introduced fields automatically.
function migrate(saved) {
  if (!saved || typeof saved !== "object") return saved;
  const v = saved.version || 1;
  if (v < 3) {
    // v2 → v3: starter character "adventurer" was renamed to "stable_pony"
    // when the character slot was reframed as the mount slot.
    const inv = saved.inventory;
    if (inv && inv.ownedCharacters && inv.ownedCharacters.adventurer && !inv.ownedCharacters.stable_pony) {
      inv.ownedCharacters.stable_pony = inv.ownedCharacters.adventurer;
      delete inv.ownedCharacters.adventurer;
    }
    if (saved.equipped && saved.equipped.character === "adventurer") {
      saved.equipped.character = "stable_pony";
    }
  }
  if (v < 4) {
    // v3 → v4: hub world introduced. Pre-existing saves never saw the
    // intro, so we mark them with a default archetype so they skip the
    // intro and land directly in the hub. New saves (no prior data) hit
    // the DEFAULTS path with archetype=null and run the intro.
    if (!saved.world) {
      saved.world = {
        archetype: "whispering_woods",
        firstFriend: "rin",
        tone: "warm",
        answers: { passion: "connection", seeking: "belonging", family: "chosen" },
        chosenAt: Date.now(),
      };
    }
  }
  if (v < 5) {
    // v4 → v5: archetype catalog replaced by trait-stack synthesis. Derive
    // a stack from the old archetype id so existing players keep their
    // chosen world. Lookup is intentionally inline so this migration can
    // outlive the deletion of config/worlds.js.
    if (saved.world && saved.world.archetype && !saved.world.stack) {
      const LEGACY = {
        whispering_woods: { biome: "forest",   architecture: "cottage",  tone: "warm",    weather: "goldenHour", ambient: "dawn" },
        sunscar_dunes:    { biome: "desert",   architecture: "tent",     tone: "warm",    weather: "clear",      ambient: "day" },
        drowning_tide:    { biome: "ocean",    architecture: "stilt",    tone: "cool",    weather: "drizzle",    ambient: "day" },
        skyborne_isles:   { biome: "sky",      architecture: "pagoda",   tone: "cool",    weather: "clear",      ambient: "dawn" },
        emberveil:        { biome: "volcanic", architecture: "ruin",     tone: "warm",    weather: "fog",        ambient: "dusk" },
        starlit_grotto:   { biome: "cosmic",   architecture: "ruin",     tone: "cool",    weather: "aurora",     ambient: "night" },
      };
      saved.world.stack = LEGACY[saved.world.archetype] || LEGACY.whispering_woods;
      saved.world.worldName = saved.world.worldName || "";
    }
  }
  return saved;
}

let cache = null;

export const Storage = {
  load() {
    if (cache) return cache;
    let raw;
    try { raw = localStorage.getItem(KEY); } catch { raw = null; }
    let saved = null;
    if (raw) {
      try { saved = JSON.parse(raw); } catch { saved = null; }
    }
    const data = DEFAULTS();
    if (saved) {
      migrate(saved);
      deepMerge(data, saved);
    }
    data.version = VERSION;
    cache = data;
    return cache;
  },

  save() {
    if (!cache) return;
    try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch {}
  },

  reset() {
    cache = null;
    try { localStorage.removeItem(KEY); } catch {}
  },

  // Convenience patcher — `mutator(state)` is given the cached object and
  // expected to mutate it in place; we then persist.
  mutate(mutator) {
    const data = this.load();
    mutator(data);
    this.save();
    return data;
  },
};

// UTC day index — used for daily-reset logic across timezones.
export function utcDayIndex(now = Date.now()) {
  return Math.floor(now / (24 * 60 * 60 * 1000));
}
