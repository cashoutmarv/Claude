// Gacha pull engine. Implements rate distribution, soft + hard pity, and
// 10-pull guarantees. All randomness is plain Math.random — for production
// we'd want a seedable / server-validated RNG, but for v1 client-side is
// fine and matches industry norms for this scale.

import { Storage } from "./storage.js";
import { Achievements } from "./achievements.js";
import { addTokens } from "./currency.js";
import { grant } from "./inventory.js";
import { RATES_BASE, PITY } from "../config/banners.js";
import { TIERS } from "../config/economy.js";

function pity(state, bannerId) {
  if (!state.pity[bannerId]) state.pity[bannerId] = { sinceLegendary: 0, totalPulls: 0 };
  return state.pity[bannerId];
}

function pickTier(rates) {
  const r = Math.random();
  let cum = 0;
  for (const [tier, p] of Object.entries(rates)) {
    cum += p;
    if (r <= cum) return tier;
  }
  return "common";
}

function pickIdFromTier(banner, tier) {
  const pool = banner.pool[tier] || [];
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

// Adjust rates for soft pity: starting at softPityFrom, the chance of a
// Legendary climbs linearly until hard pity guarantees one.
function ratesForPull(pityCount) {
  if (pityCount + 1 >= PITY.hardPity) {
    return { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 1 };
  }
  if (pityCount < PITY.softPityFrom) return RATES_BASE;
  // Ramp legendary chance from base up to ~10x by the pull before hard pity.
  const span = PITY.hardPity - PITY.softPityFrom;
  const t = (pityCount - PITY.softPityFrom) / span;
  const lego = Math.min(0.50, RATES_BASE.legendary + t * (0.50 - RATES_BASE.legendary));
  // Steal the bonus probability from common.
  const stolen = lego - RATES_BASE.legendary;
  return {
    common:    Math.max(0, RATES_BASE.common - stolen),
    uncommon:  RATES_BASE.uncommon,
    rare:      RATES_BASE.rare,
    epic:      RATES_BASE.epic,
    legendary: lego,
  };
}

function singlePullInternal(banner, state) {
  const p = pity(state, banner.id);
  const rates = ratesForPull(p.sinceLegendary);
  const tier = pickTier(rates);
  const id = pickIdFromTier(banner, tier);

  p.totalPulls += 1;
  if (tier === "legendary") p.sinceLegendary = 0;
  else p.sinceLegendary += 1;

  return { tier, id };
}

// Public single pull.
export function pullOne(banner) {
  let result;
  Storage.mutate((s) => {
    result = singlePullInternal(banner, s);
    s.lifetime.pulls += 1;
    s.lifetime.pullsByTier[result.tier] = (s.lifetime.pullsByTier[result.tier] || 0) + 1;
  });
  applyResult(result);
  return result;
}

// 10-pull. Guarantees Rare-or-better in the 10 if no Rare+ rolled naturally.
export function pullTen(banner) {
  const results = [];
  Storage.mutate((s) => {
    for (let i = 0; i < 10; i++) {
      const r = singlePullInternal(banner, s);
      s.lifetime.pulls += 1;
      s.lifetime.pullsByTier[r.tier] = (s.lifetime.pullsByTier[r.tier] || 0) + 1;
      results.push(r);
    }
    // Guarantee enforcement.
    const guaranteeRank = TIERS[PITY.tenPullGuaranteeTier].rank;
    const hasGuaranteed = results.some((r) => TIERS[r.tier].rank >= guaranteeRank);
    if (!hasGuaranteed) {
      const upgrade = { tier: PITY.tenPullGuaranteeTier, id: pickIdFromTier(banner, PITY.tenPullGuaranteeTier) };
      results[results.length - 1] = upgrade;
    }
  });
  for (const r of results) applyResult(r);
  return results;
}

// Apply a single roll: grant the item, add exchange tokens, fire achievements.
function applyResult(result) {
  if (result.id) grant(result.id);
  addTokens(1);
  Achievements.fire("gacha_pull", 1);
  if (result.tier === "rare")      Achievements.fire("gacha_rare", 1);
  if (result.tier === "epic")      Achievements.fire("gacha_epic", 1);
  if (result.tier === "legendary") Achievements.fire("gacha_legendary", 1);
}

// Read-only snapshot for UI: how close are we to hard pity on this banner.
export function pityState(bannerId) {
  return Storage.load().pity[bannerId] || { sinceLegendary: 0, totalPulls: 0 };
}
