// Death screen. Shows run summary (gold earned, achievements unlocked
// during this run) and offers two revive paths plus a return-to-home /
// retry path. The first revive is "watch ad OR pay gems"; subsequent
// revives are gem-only with escalating cost.

import { CurrencyBar } from "../ui/CurrencyBar.js";
import { Ads } from "../services/ads.js";
import { spendGems, getBalances } from "../services/currency.js";
import { ECONOMY } from "../config/economy.js";

export class GameOverScene extends Phaser.Scene {
  constructor() { super("GameOverScene"); }

  init(data) {
    this.kills = data.kills;
    this.bossKills = data.bossKills || 0;
    this.timeSec = data.timeSec;
    this.level = data.level;
    this.runRevives = data.runRevives || 0;
    this.goldEarned = data.goldEarned || 0;
    this.achievementsThisRun = data.achievementsThisRun || [];
    this.onRevive = data.onRevive;
  }

  create() {
    const { width, height } = this.scale;

    new CurrencyBar(this);

    this.cameras.main.setBackgroundColor("#0b0b14");
    this.add.rectangle(0, 0, width, height, 0x000000, 0.55).setOrigin(0);

    this.add.text(width / 2, height * 0.13, "YOU DIED", {
      fontFamily: "system-ui, sans-serif",
      fontSize: Math.min(48, width * 0.09) + "px",
      color: "#ff5266", fontStyle: "bold",
    }).setOrigin(0.5);

    // Run summary.
    const m = Math.floor(this.timeSec / 60);
    const s = Math.floor(this.timeSec % 60).toString().padStart(2, "0");
    this.add.text(width / 2, height * 0.22,
      `Time ${m}:${s}    Level ${this.level}    Kills ${this.kills}` +
      (this.bossKills ? `    Bosses ${this.bossKills}` : ""),
      { fontFamily: "system-ui, sans-serif", fontSize: "16px", color: "#cfd2e6" }
    ).setOrigin(0.5);

    this.add.text(width / 2, height * 0.27,
      `Gold earned this run: +${this.goldEarned.toLocaleString()} ◆`,
      { fontFamily: "system-ui, sans-serif", fontSize: "14px", color: "#ffd166", fontStyle: "bold" }
    ).setOrigin(0.5);

    // Achievements unlocked during this run.
    if (this.achievementsThisRun.length > 0) {
      let y = height * 0.32;
      this.add.text(width / 2, y, "ACHIEVEMENTS UNLOCKED", {
        fontFamily: "system-ui, sans-serif", fontSize: "11px", color: "#7a8099", fontStyle: "bold",
      }).setOrigin(0.5);
      y += 16;
      const max = Math.min(4, this.achievementsThisRun.length);
      for (let i = 0; i < max; i++) {
        const a = this.achievementsThisRun[i];
        this.add.text(width / 2, y, `${a.name}  +${a.gems} ◇`, {
          fontFamily: "system-ui, sans-serif", fontSize: "13px", color: "#49d6ff",
        }).setOrigin(0.5);
        y += 16;
      }
      if (this.achievementsThisRun.length > max) {
        this.add.text(width / 2, y, `+${this.achievementsThisRun.length - max} more…`, {
          fontFamily: "system-ui, sans-serif", fontSize: "11px", color: "#7a8099",
        }).setOrigin(0.5);
      }
    }

    // Action buttons.
    const buttons = [];
    const reviveCost = ECONOMY.reviveCostGems[this.runRevives] ?? ECONOMY.reviveCostGems.at(-1);
    const canAfford = getBalances().gems >= reviveCost;
    const isFirstRevive = this.runRevives === 0;
    const adFree = Ads.isAdFreeOwned();

    if (this.onRevive && isFirstRevive) {
      // Ad-free supporters get the first revive truly free — no ad
      // viewing, no gem spend. Otherwise the player can watch an ad.
      if (adFree) {
        buttons.push({
          label: "Revive",
          sub: "free (supporter)",
          color: 0x4ade80, textColor: "#0b0b14",
          action: () => this.acceptFreeRevive(),
        });
      } else {
        buttons.push({
          label: "Revive (Watch Ad)",
          sub: "free",
          color: 0xffd166, textColor: "#0b0b14",
          action: () => this.requestReviveByAd(),
        });
      }
    }
    if (this.onRevive) {
      buttons.push({
        label: "Revive",
        sub: `${reviveCost} ◇`,
        color: canAfford ? 0xc084fc : 0x2a2a3a,
        textColor: canAfford ? "#0b0b14" : "#7a8099",
        action: () => this.requestReviveByGems(reviveCost),
      });
    }
    buttons.push({
      label: "Play Again",
      sub: null,
      color: 0x49d6ff, textColor: "#0b0b14",
      action: () => this.exitTo("GameScene"),
    });
    buttons.push({
      label: "Home",
      sub: null,
      color: 0x2a2a3a, textColor: "#cfd2e6",
      action: () => this.exitTo("HubScene"),
    });

    const btnW = Math.min(280, width * 0.7);
    const btnH = 56;
    const gap = 12;
    let y = height * 0.50;
    for (const b of buttons) {
      this.makeButton(width / 2, y, btnW, btnH, b);
      y += btnH + gap;
    }
  }

  makeButton(x, y, w, h, { label, sub, color, textColor, action }) {
    const bg = this.add.rectangle(x, y, w, h, color, 1)
      .setStrokeStyle(2, 0xffffff, 0.25)
      .setInteractive({ useHandCursor: true });
    if (sub) {
      this.add.text(x, y - 9, label, {
        fontFamily: "system-ui, sans-serif", fontSize: "18px", color: textColor, fontStyle: "bold",
      }).setOrigin(0.5);
      this.add.text(x, y + 11, sub, {
        fontFamily: "system-ui, sans-serif", fontSize: "12px", color: textColor,
      }).setOrigin(0.5);
    } else {
      this.add.text(x, y, label, {
        fontFamily: "system-ui, sans-serif", fontSize: "20px", color: textColor, fontStyle: "bold",
      }).setOrigin(0.5);
    }
    bg.on("pointerover", () => bg.setFillStyle(Phaser.Display.Color.IntegerToColor(color).brighten(15).color));
    bg.on("pointerout",  () => bg.setFillStyle(color));
    bg.on("pointerdown", () => {
      bg.setFillStyle(Phaser.Display.Color.IntegerToColor(color).darken(15).color);
      this.time.delayedCall(60, action);
    });
    return bg;
  }

  exitTo(sceneKey) {
    this.scene.stop("GameScene");
    this.scene.stop();
    this.scene.start(sceneKey);
  }

  async requestReviveByAd() {
    const granted = await Ads.showRewarded("revive");
    if (granted && this.onRevive) {
      this.scene.stop();
      this.onRevive();
    }
  }

  acceptFreeRevive() {
    if (!this.onRevive) return;
    this.scene.stop();
    this.onRevive();
  }

  requestReviveByGems(cost) {
    if (!spendGems(cost)) {
      this.flashMsg("Not enough gems. Visit the Shop.");
      return;
    }
    if (this.onRevive) {
      this.scene.stop();
      this.onRevive();
    }
  }

  flashMsg(text) {
    const t = this.add.text(this.scale.width / 2, this.scale.height - 80, text, {
      fontFamily: "system-ui, sans-serif", fontSize: "13px", color: "#ff5266",
      backgroundColor: "rgba(0,0,0,0.6)", padding: { x: 10, y: 6 },
    }).setOrigin(0.5).setDepth(400).setAlpha(0);
    this.tweens.add({ targets: t, alpha: 1, duration: 200, hold: 1500, yoyo: true,
      onComplete: () => t.destroy() });
  }
}
