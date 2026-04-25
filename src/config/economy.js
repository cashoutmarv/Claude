// Centralized economy numbers. Currency drop rates, gacha prices, gem caps,
// IAP product values. Tweak here without touching service code.

export const ECONOMY = {
  // Gold awarded per kill. Multiplied by enemy.xp value so tougher enemies
  // (boss = 40xp) yield much more gold.
  goldPerKillBase: 1,
  goldPerKillXpMul: 0.6,
  goldPerSecondSurvived: 0.2, // tiny passive trickle to floor a bad run
  goldRunCompletionFlat: 25,  // awarded once at end of any run

  // Gold to gold-pull at standard banner.
  pullCostGold: 500,
  pullCostGoldTen: 4500, // 10% off

  // Gem prices.
  pullCostGems: 100,
  pullCostGemsTen: 900,

  // Revive escalator. First option also has a free-with-ad path; gem-only
  // option always exists too.
  reviveCostGems: [50, 100, 200, 200], // by revive index

  // Daily caps so f2p income is sustainable but not infinite.
  dailyAdGemCap: 30,           // max gems/day from "double daily reward" ads
  dailyLoginGems: [10, 15, 20, 25, 35, 50, 100], // 7-day rolling streak

  // Soft starter — first 5 runs of a new save get a small completion bonus
  // on top of normal gold so the meta loop opens up faster.
  newPlayerRunBonusRuns: 5,
  newPlayerRunBonusGold: 100,
};

// Single source of truth for IAP prices/values. Real money values are set
// in App Store Connect / Play Console; these are display fallbacks +
// gem amounts granted on successful purchase.
export const IAP_CATALOG = {
  pass:        { id: "adv_pass",     price: "$4.99/mo", gemsPerDay: 50,           xpMul: 1.5 },
  starter:     { id: "starter_pack", price: "$1.99",    gems: 300,  bonusRelicTier: "rare" },
  removeAds:   { id: "remove_ads",   price: "$3.99" },
  gem_s:       { id: "gem_s",        price: "$0.99",    gems: 100  },
  gem_m:       { id: "gem_m",        price: "$4.99",    gems: 600  },
  gem_l:       { id: "gem_l",        price: "$9.99",    gems: 1300 },
  gem_xl:      { id: "gem_xl",       price: "$49.99",   gems: 7500 },
  gem_xxl:     { id: "gem_xxl",      price: "$99.99",   gems: 16000 },
};

export const TIERS = {
  common:    { rank: 0, color: 0x9aa0c0, label: "Common" },
  uncommon:  { rank: 1, color: 0x4ade80, label: "Uncommon" },
  rare:      { rank: 2, color: 0x49d6ff, label: "Rare" },
  epic:      { rank: 3, color: 0xc084fc, label: "Epic" },
  legendary: { rank: 4, color: 0xffd166, label: "Legendary" },
};
