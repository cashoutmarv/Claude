// Central save state. Versioned, namespaced, idempotent. All other services
// read/write through this so we never have multiple sources of truth.
//
// On native (Capacitor) the localStorage backend can be swapped for the
// Preferences plugin without touching callers.

const KEY = "dungeondrift.save.v2";
const VERSION = 2;

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
  // Currency wallet.
  wallet: { gold: 0, gems: 0, exchangeTokens: 0 },
  // Inventory.
  inventory: {
    // ownedCharacters[id] = { level, shards }
    ownedCharacters: { adventurer: { level: 1, shards: 0 } },
    ownedRelics: {},
    ownedWeapons: { bolt: { level: 1, shards: 0 } },
  },
  // Equipped state.
  equipped: {
    character: "adventurer",
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
    if (saved) deepMerge(data, saved);
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
