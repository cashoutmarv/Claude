// VIP system. 1 dollar of IAP spend = 1 VIP point. Levels grant pure perks
// (cosmetic frames, +X% gold/XP, daily free pulls, extra revive slot). No
// raw power increases — VIPs progress faster, not stronger.
//
// `cumulativePoints` is the total VIP points required to *enter* this level.
// `perks(stats)` is applied at run start in the same way relics are.

export const VIP_LEVELS = [
  { level: 0,  cumulativePoints: 0,    label: "—",
    desc: "Start your journey",
    perks: () => ({}),
  },
  { level: 1,  cumulativePoints: 5,    label: "VIP 1",
    desc: "+5% gold, bronze frame",
    perks: (s) => { s.goldMul *= 1.05; },
  },
  { level: 2,  cumulativePoints: 15,   label: "VIP 2",
    desc: "+10% gold, +1 daily standard pull",
    perks: (s) => { s.goldMul *= 1.10; },
    dailyFreePulls: 1,
  },
  { level: 3,  cumulativePoints: 30,   label: "VIP 3",
    desc: "+10% gold, +5% XP",
    perks: (s) => { s.goldMul *= 1.10; s.xpMul *= 1.05; },
    dailyFreePulls: 1,
  },
  { level: 4,  cumulativePoints: 60,   label: "VIP 4",
    desc: "+15% gold, +10% XP, silver frame",
    perks: (s) => { s.goldMul *= 1.15; s.xpMul *= 1.10; },
    dailyFreePulls: 1,
  },
  { level: 5,  cumulativePoints: 100,  label: "VIP 5",
    desc: "+1 revive slot, +15% gold, +10% XP",
    perks: (s) => { s.goldMul *= 1.15; s.xpMul *= 1.10; },
    extraReviveSlot: 1,
    dailyFreePulls: 2,
  },
  { level: 6,  cumulativePoints: 200,  label: "VIP 6",
    desc: "+20% gold, +15% XP",
    perks: (s) => { s.goldMul *= 1.20; s.xpMul *= 1.15; },
    extraReviveSlot: 1,
    dailyFreePulls: 2,
  },
  { level: 7,  cumulativePoints: 400,  label: "VIP 7",
    desc: "+25% gold, +20% XP, gold frame",
    perks: (s) => { s.goldMul *= 1.25; s.xpMul *= 1.20; },
    extraReviveSlot: 1,
    dailyFreePulls: 3,
  },
  { level: 8,  cumulativePoints: 800,  label: "VIP 8",
    desc: "+30% gold, +25% XP",
    perks: (s) => { s.goldMul *= 1.30; s.xpMul *= 1.25; },
    extraReviveSlot: 2,
    dailyFreePulls: 3,
  },
  { level: 9,  cumulativePoints: 1500, label: "VIP 9",
    desc: "+40% gold, +30% XP, animated frame",
    perks: (s) => { s.goldMul *= 1.40; s.xpMul *= 1.30; },
    extraReviveSlot: 2,
    dailyFreePulls: 4,
  },
  { level: 10, cumulativePoints: 3000, label: "VIP 10",
    desc: "+50% gold, +40% XP, prismatic frame",
    perks: (s) => { s.goldMul *= 1.50; s.xpMul *= 1.40; },
    extraReviveSlot: 3,
    dailyFreePulls: 5,
  },
];

export function vipLevelForPoints(points) {
  let last = VIP_LEVELS[0];
  for (const v of VIP_LEVELS) {
    if (points >= v.cumulativePoints) last = v;
    else break;
  }
  return last;
}
