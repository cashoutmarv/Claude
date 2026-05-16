// VIP screen — current level, points, progression to next, perks listing.

import { CurrencyBar } from "../ui/CurrencyBar.js";
import { installAchievementToast } from "../ui/AchievementToast.js";
import { VIP } from "../services/vip.js";
import { VIP_LEVELS } from "../config/vip.js";

export class VIPScene extends Phaser.Scene {
  constructor() { super("VIPScene"); }

  create() {
    this.cameras.main.setBackgroundColor("#0b0b14");
    new CurrencyBar(this);
    installAchievementToast(this);

    const { width, height } = this.scale;

    this.makeButton(60, 64, 80, 32, "← Back", 0x2a2a3a, "#cfd2e6", () => this.scene.start("HubScene"));
    this.add.text(width / 2, 64, "VIP", {
      fontFamily: "system-ui, sans-serif", fontSize: "22px", color: "#ffffff", fontStyle: "bold",
    }).setOrigin(0.5);

    const v = VIP.state();
    this.add.text(width / 2, 110, v.label, {
      fontFamily: "system-ui, sans-serif", fontSize: "32px", color: "#ffd166", fontStyle: "bold",
    }).setOrigin(0.5);
    this.add.text(width / 2, 144, `${v.points} VIP points`, {
      fontFamily: "system-ui, sans-serif", fontSize: "14px", color: "#cfd2e6",
    }).setOrigin(0.5);
    if (v.nextLabel) {
      this.add.text(width / 2, 162, `${v.pointsToNext} points to ${v.nextLabel}`, {
        fontFamily: "system-ui, sans-serif", fontSize: "12px", color: "#9aa0c0",
      }).setOrigin(0.5);
    }
    this.add.text(width / 2, 184, "Earn 1 VIP point per $1 spent in Shop", {
      fontFamily: "system-ui, sans-serif", fontSize: "11px", color: "#7a8099",
    }).setOrigin(0.5);

    let y = 220;
    this.add.text(width / 2, y, "LEVELS", {
      fontFamily: "system-ui, sans-serif", fontSize: "12px", color: "#7a8099", fontStyle: "bold",
    }).setOrigin(0.5);
    y += 18;

    const cardW = Math.min(560, width - 32);
    const cardH = 44;
    for (const level of VIP_LEVELS) {
      const reached = v.points >= level.cumulativePoints;
      this.add.rectangle(width / 2, y + cardH / 2, cardW, cardH, 0x1a1a2a, 1)
        .setStrokeStyle(2, reached ? 0xffd166 : 0x2a2a3a, reached ? 1 : 0.6);
      this.add.text(width / 2 - cardW / 2 + 14, y + 6, level.label, {
        fontFamily: "system-ui, sans-serif", fontSize: "14px",
        color: reached ? "#ffd166" : "#7a8099", fontStyle: "bold",
      });
      this.add.text(width / 2 - cardW / 2 + 14, y + 24, level.desc, {
        fontFamily: "system-ui, sans-serif", fontSize: "11px", color: "#9aa0c0",
      });
      this.add.text(width / 2 + cardW / 2 - 14, y + cardH / 2,
        `${level.cumulativePoints} pts`,
        { fontFamily: "system-ui, sans-serif", fontSize: "12px",
          color: reached ? "#4ade80" : "#7a8099" }
      ).setOrigin(1, 0.5);
      y += cardH + 4;
      if (y > height - 40) break;
    }
  }

  makeButton(x, y, w, h, label, color, textColor, onClick) {
    const r = this.add.rectangle(x, y, w, h, color, 1)
      .setStrokeStyle(2, 0xffffff, 0.25)
      .setInteractive({ useHandCursor: true });
    this.add.text(x, y, label, {
      fontFamily: "system-ui, sans-serif", fontSize: "14px", color: textColor, fontStyle: "bold",
    }).setOrigin(0.5);
    r.on("pointerdown", () => { r.setFillStyle(Phaser.Display.Color.IntegerToColor(color).darken(15).color); this.time.delayedCall(50, onClick); });
    return r;
  }
}
