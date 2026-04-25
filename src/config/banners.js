// Gacha banners and rarity rates. Pity rules:
//   - softPityFrom: pulls before hard pity where Legendary chance starts ramping
//   - hardPity:     guaranteed Legendary on this pull index (1-indexed)
//
// Pull pool defines which items can drop per tier on this banner. A Featured
// banner narrows the Legendary pool to a specific item (rate-up).

export const RATES_BASE = {
  common:    0.6500,
  uncommon:  0.2100,
  rare:      0.1000,
  epic:      0.0350,
  legendary: 0.0050,
};

export const PITY = {
  softPityFrom: 50,
  hardPity: 70,
  // 10-pull: guaranteed Rare or better on the 10th if no Rare+ rolled.
  tenPullGuaranteeTier: "rare",
};

// Selector tokens — earned 1 per pull, redeemable for any item of the
// listed tier. The Legendary path (150 tokens ≈ 150 pulls ≈ one $99.99 gem
// pack) is the *hard* guarantee that no player ever spends more than ~$100
// to get a specific Legendary character.
export const SELECTOR_COSTS = {
  rare: 30,
  epic: 80,
  legendary: 150,
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
