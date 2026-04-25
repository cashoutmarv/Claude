// Achievement / first-time milestone service. Gameplay code calls
// Achievements.fire("event_name", value) and we figure out whether any
// achievement just unlocked and award gems for it.
//
// Every achievement is one-shot per save. Lifetime counters live in
// storage.lifetime; per-run bests live in storage.bests. Triggers compare
// against the right counter depending on event semantics.

import { Storage } from "./storage.js";
import { ACHIEVEMENTS } from "../config/achievements.js";
import { addGems } from "./currency.js";

// Mapping of event name -> how to read the relevant counter from storage.
// `kind: "lifetime"` means the threshold compares against a cumulative count
// kept in storage.lifetime.<key>.
// `kind: "best"` compares against storage.bests.<key> (highest single-run).
const COUNTERS = {
  kill:             { kind: "lifetime", key: "kills" },
  boss_kill:        { kind: "lifetime", key: "bossKills" },
  death:            { kind: "lifetime", key: "deaths" },
  revive_used:      { kind: "lifetime", key: "revives" },
  run_end:          { kind: "lifetime", key: "runEnds" },
  gacha_pull:       { kind: "lifetime", key: "pulls" },
  gacha_rare:       { kind: "lifetime_tier", key: "rare" },
  gacha_epic:       { kind: "lifetime_tier", key: "epic" },
  gacha_legendary:  { kind: "lifetime_tier", key: "legendary" },
  level_up:         { kind: "best", key: "runLevel" },
  survive_seconds:  { kind: "best", key: "runSurviveSec" },
};

const unlockListeners = new Set();
export function onUnlock(fn) { unlockListeners.add(fn); return () => unlockListeners.delete(fn); }

// Bump the underlying counter if applicable. Some events (level_up, survive_seconds)
// pass an absolute value rather than an increment.
function bumpCounter(state, eventName, value) {
  const c = COUNTERS[eventName];
  if (!c) return;
  if (c.kind === "lifetime") {
    state.lifetime[c.key] = (state.lifetime[c.key] || 0) + value;
  } else if (c.kind === "lifetime_tier") {
    // value is just a +1 marker; the storage write happened in gacha.js
    // already, so don't double-count here.
  } else if (c.kind === "best") {
    if (value > (state.bests[c.key] || 0)) state.bests[c.key] = value;
  }
}

function counterValue(state, eventName) {
  const c = COUNTERS[eventName];
  if (!c) return 0;
  if (c.kind === "lifetime") return state.lifetime[c.key] || 0;
  if (c.kind === "lifetime_tier") return (state.lifetime.pullsByTier && state.lifetime.pullsByTier[c.key]) || 0;
  if (c.kind === "best") return state.bests[c.key] || 0;
  return 0;
}

function checkUnlocks(state) {
  const unlocked = [];
  for (const a of ACHIEVEMENTS) {
    if (state.claimedAchievements[a.id]) continue;
    const v = counterValue(state, a.trigger.event);
    if (v >= a.trigger.threshold) {
      state.claimedAchievements[a.id] = Date.now();
      unlocked.push(a);
    }
  }
  return unlocked;
}

export const Achievements = {
  fire(eventName, value) {
    let unlocked;
    Storage.mutate((s) => {
      bumpCounter(s, eventName, value);
      unlocked = checkUnlocks(s);
    });
    for (const a of unlocked) {
      addGems(a.gems, `achievement: ${a.id}`);
      for (const fn of unlockListeners) {
        try { fn(a); } catch (e) { console.error(e); }
      }
    }
    return unlocked;
  },
  isClaimed(id) { return !!Storage.load().claimedAchievements[id]; },
  // Useful for the achievements/profile UI later.
  list() { return ACHIEVEMENTS.map((a) => ({ ...a, claimed: this.isClaimed(a.id) })); },
};
