// Main lobby. Currency bar at top, big PLAY button, row of meta tabs at
// bottom (Gacha, Shop, Inventory, VIP). Daily login + subscription daily
// claim happen on first entry per session.

import { CurrencyBar } from "../ui/CurrencyBar.js";
import { installAchievementToast } from "../ui/AchievementToast.js";
import { Storage, utcDayIndex } from "../services/storage.js";
import { addGems } from "../services/currency.js";
import { Subscription } from "../services/subscription.js";
import { ECONOMY } from "../config/economy.js";

export class HomeScene extends Phaser.Scene {
  constructor() { super("HomeScene"); }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor("#0b0b14");

    new CurrencyBar(this);
    installAchievementToast(this);

    // Title.
    this.add.text(width / 2, 70, "DUNGEON DRIFT", {
      fontFamily: "system-ui, sans-serif",
      fontSize: Math.min(40, width * 0.07) + "px",
      color: "#49d6ff", fontStyle: "bold",
    }).setOrigin(0.5).setShadow(0, 0, "#49d6ff", 12, true, true);

    const save = Storage.load();
    const min = Math.floor(save.bestTimeSec / 60);
    const sec = Math.floor(save.bestTimeSec % 60).toString().padStart(2, "0");
    this.add.text(width / 2, 100,
      `Best ${min}:${sec}    Kills ${save.bestKills}    Runs ${save.totalRuns}`,
      { fontFamily: "system-ui, sans-serif", fontSize: "13px", color: "#7a8099" }
    ).setOrigin(0.5);

    // Big PLAY button.
    const btnW = Math.min(280, width * 0.7);
    const btnH = 72;
    const btnY = height * 0.45;
    const btn = this.add.rectangle(width / 2, btnY, btnW, btnH, 0x49d6ff)
      .setStrokeStyle(2, 0xffffff, 0.4)
      .setInteractive({ useHandCursor: true });
    this.add.text(width / 2, btnY, "PLAY", {
      fontFamily: "system-ui, sans-serif", fontSize: "30px", color: "#0b0b14", fontStyle: "bold",
    }).setOrigin(0.5);
    btn.on("pointerover", () => btn.setFillStyle(0x6cdfff));
    btn.on("pointerout",  () => btn.setFillStyle(0x49d6ff));
    btn.on("pointerdown", () => {
      btn.setFillStyle(0x2faedf);
      this.time.delayedCall(80, () => this.scene.start("GameScene"));
    });

    // Tabs row.
    const tabs = [
      { key: "gacha",     label: "Gacha",     scene: "GachaScene",     color: 0xc084fc },
      { key: "shop",      label: "Shop",      scene: "ShopScene",      color: 0x4ade80 },
      { key: "inventory", label: "Inventory", scene: "InventoryScene", color: 0xffd166 },
      { key: "vip",       label: "VIP",       scene: "VIPScene",       color: 0xff8aa8 },
    ];
    const tabY = height - 80;
    const tabW = Math.min(180, (width - 32 - (tabs.length - 1) * 12) / tabs.length);
    const totalW = tabs.length * tabW + (tabs.length - 1) * 12;
    let x = width / 2 - totalW / 2 + tabW / 2;
    for (const t of tabs) {
      const r = this.add.rectangle(x, tabY, tabW, 56, 0x1a1a2a, 1)
        .setStrokeStyle(2, t.color, 0.7)
        .setInteractive({ useHandCursor: true });
      this.add.text(x, tabY, t.label, {
        fontFamily: "system-ui, sans-serif", fontSize: "16px", color: "#ffffff", fontStyle: "bold",
      }).setOrigin(0.5);
      r.on("pointerdown", () => this.scene.start(t.scene));
      r.on("pointerover", () => r.setStrokeStyle(2, t.color, 1));
      r.on("pointerout",  () => r.setStrokeStyle(2, t.color, 0.7));
      x += tabW + 12;
    }

    // Daily login + subscription daily claim.
    this.handleDailyLogin();
    Subscription.claimDaily();
  }

  handleDailyLogin() {
    const today = utcDayIndex();
    const s = Storage.load();
    if (s.daily.lastLoginDay === today) return;

    const yesterday = today - 1;
    const nextStreak = s.daily.lastLoginDay === yesterday ? Math.min(s.daily.streak + 1, 7) : 1;

    const reward = ECONOMY.dailyLoginGems[nextStreak - 1] || ECONOMY.dailyLoginGems.at(-1);

    Storage.mutate((st) => {
      st.daily.lastLoginDay = today;
      st.daily.streak = nextStreak;
    });
    addGems(reward, `daily_login streak=${nextStreak}`);
    this.flashDailyReward(nextStreak, reward);
  }

  flashDailyReward(streak, gems) {
    const { width } = this.scale;
    const txt = this.add.text(width / 2, 140, `Day ${streak} bonus: +${gems} ◇`, {
      fontFamily: "system-ui, sans-serif", fontSize: "16px", color: "#49d6ff", fontStyle: "bold",
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: txt, alpha: 1, duration: 300, yoyo: true, hold: 1800,
      onComplete: () => txt.destroy() });
  }
}
