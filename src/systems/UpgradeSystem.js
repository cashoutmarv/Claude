import { UPGRADES } from "../config/upgrades.js";
import { XP } from "../config/balance.js";

export class UpgradeSystem {
  constructor() {
    this.stacks = Object.create(null); // id -> stack count
  }

  // 3 random upgrades that haven't hit max stacks.
  rollChoices(count = 3) {
    const eligible = UPGRADES.filter((u) => (this.stacks[u.id] || 0) < u.maxStacks);
    const pool = [...eligible];
    const out = [];
    while (out.length < count && pool.length > 0) {
      const i = Math.floor(Math.random() * pool.length);
      out.push(pool.splice(i, 1)[0]);
    }
    return out;
  }

  apply(upgrade, player) {
    upgrade.apply(player);
    this.stacks[upgrade.id] = (this.stacks[upgrade.id] || 0) + 1;
  }

  // XP needed to reach `targetLevel` from `targetLevel - 1`.
  static xpForLevel(targetLevel) {
    const n = Math.max(1, targetLevel - 1);
    return Math.round(XP.base + XP.step * Math.pow(n, XP.exp));
  }
}
