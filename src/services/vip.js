// VIP point + level service. addPoints is called from iap.js whenever a
// real-money purchase succeeds (1 USD = 1 point).

import { Storage } from "./storage.js";
import { vipLevelForPoints, VIP_LEVELS } from "../config/vip.js";

const listeners = new Set();
export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit() { for (const fn of listeners) try { fn(); } catch (e) { console.error(e); } }

export const VIP = {
  state() {
    const v = Storage.load().vip;
    const level = vipLevelForPoints(v.points);
    const next = VIP_LEVELS[level.level + 1];
    return {
      points: v.points,
      level: level.level,
      label: level.label,
      desc: level.desc,
      pointsToNext: next ? next.cumulativePoints - v.points : 0,
      nextLabel: next ? next.label : null,
    };
  },
  addPoints(amount) {
    if (amount <= 0) return;
    Storage.mutate((s) => {
      s.vip.points += amount;
      s.vip.level = vipLevelForPoints(s.vip.points).level;
    });
    emit();
  },
  applyToStats(stats) {
    const lvl = VIP_LEVELS[Storage.load().vip.level] || VIP_LEVELS[0];
    if (lvl && lvl.perks) lvl.perks(stats);
    return stats;
  },
};
