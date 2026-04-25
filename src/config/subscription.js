// Adventurer's Pass — the single auto-renewable subscription product.
// Benefits applied while entitlement is active.

export const ADVENTURERS_PASS = {
  id: "adv_pass",
  name: "Adventurer's Pass",
  price: "$4.99 / month",
  benefits: {
    gemsPerDay: 50,           // claimed once per UTC day
    xpMul: 1.5,               // applied at run start
    extraDailyAdRewardSlots: 1,
    cosmeticFrame: "pass_blue",
  },
  trialDays: 0, // set to 7 if you want a free trial
};
