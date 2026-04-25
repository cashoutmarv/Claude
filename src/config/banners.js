// Gacha banners and rarity rates. Pity rules:
//   - softPityFrom: pulls before hard pity where Legendary chance starts ramping
//   - hardPity:     guaranteed Legendary on this pull index (1-indexed)
//
// Pull pool defines which items can drop per tier on this banner. A Featured
// banner narrows the Legendary pool to a specific item (rate-up).

export const RATES_BASE = {
  common:    0.7500,
  uncommon:  0.1800,
  rare:      0.0600,
  epic:      0.0090,
  legendary: 0.0010,
};

export const PITY = {
  softPityFrom: 60,
  hardPity: 80,
  // 10-pull: guaranteed Rare or better on the 10th if no Rare+ rolled.
  tenPullGuaranteeTier: "rare",
};

// Default pool — every non-starter item is eligible. Featured banner
// overrides legendaryPool to lock in a single rate-up character.
export const STANDARD_BANNER = {
  id: "standard",
  name: "Standard Banner",
  costGems: 100,
  costGemsTen: 900,
  costGoldAlt: 500,    // standard banner allows gold pulls
  costGoldAltTen: 4500,
  pool: {
    common: ["iron_charm", "brisk_ring"],
    uncommon: ["scout", "sharp_charm", "gold_idol"],
    rare: ["duelist", "warden", "swift_band", "hardy_amulet"],
    epic: ["sorcerer", "greedy_horn", "scholar_tome"],
    legendary: ["archmage", "void_pendant"],
  },
};

export const FEATURED_BANNER = {
  id: "featured_archmage",
  name: "Archmage Rate-Up",
  costGems: 100,
  costGemsTen: 900,
  // No gold path on featured banners.
  pool: {
    common: ["iron_charm", "brisk_ring"],
    uncommon: ["scout", "sharp_charm", "gold_idol"],
    rare: ["duelist", "warden", "swift_band", "hardy_amulet"],
    epic: ["sorcerer", "greedy_horn", "scholar_tome"],
    legendary: ["archmage"], // rate-up: pity / legendary roll always = archmage
  },
};

export const BANNERS = [STANDARD_BANNER, FEATURED_BANNER];
