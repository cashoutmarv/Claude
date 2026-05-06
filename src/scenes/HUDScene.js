import { UpgradeSystem } from "../systems/UpgradeSystem.js";
import { installAchievementToast } from "../ui/AchievementToast.js";

// Overlay scene: HP/XP bars, run timer, level, kills, run gold, dash button.

export class HUDScene extends Phaser.Scene {
  constructor() { super("HUDScene"); }

  init(data) {
    this.game_ = data.game;
  }

  create() {
    const { width, height } = this.scale;
    const pad = 12;
    installAchievementToast(this);

    // HP bar.
    this.hpBg   = this.add.rectangle(pad, pad, width - pad * 2, 14, 0x1a1a2a, 0.8).setOrigin(0).setDepth(100);
    this.hpFill = this.add.rectangle(pad + 2, pad + 2, 0, 10, 0xff5266, 1).setOrigin(0).setDepth(101);
    this.hpText = this.add.text(width / 2, pad + 7, "", {
      fontFamily: "system-ui, sans-serif", fontSize: "11px", color: "#ffffff", fontStyle: "bold",
    }).setOrigin(0.5).setDepth(102);

    // XP bar.
    this.xpBg   = this.add.rectangle(pad, pad + 18, width - pad * 2, 8, 0x1a1a2a, 0.8).setOrigin(0).setDepth(100);
    this.xpFill = this.add.rectangle(pad + 2, pad + 20, 0, 4, 0x49d6ff, 1).setOrigin(0).setDepth(101);

    // Stats line.
    this.statsText = this.add.text(pad, pad + 32, "", {
      fontFamily: "system-ui, sans-serif", fontSize: "14px", color: "#cfd2e6",
    }).setDepth(100);

    this.goldText = this.add.text(width / 2, pad + 32, "", {
      fontFamily: "system-ui, sans-serif", fontSize: "14px", color: "#ffd166", fontStyle: "bold",
    }).setOrigin(0.5, 0).setDepth(100);

    this.levelText = this.add.text(width - pad, pad + 32, "", {
      fontFamily: "system-ui, sans-serif", fontSize: "14px", color: "#ffe28a", fontStyle: "bold",
    }).setOrigin(1, 0).setDepth(100);

    // Dash button — bottom-right corner. Visual only; touch handled by GameScene.
    const dashR = 38;
    const dashX = width - dashR - 20;
    const dashY = height - dashR - 24;
    this._dashR = dashR;
    this.dashBg   = this.add.circle(dashX, dashY, dashR, 0x49d6ff, 0.12).setDepth(200);
    this.dashRing = this.add.circle(dashX, dashY, dashR).setStrokeStyle(2.5, 0x49d6ff, 0.5).setDepth(201);
    this.dashLabel = this.add.text(dashX, dashY, "DASH", {
      fontFamily: "system-ui, sans-serif", fontSize: "13px", color: "#49d6ff", fontStyle: "bold",
    }).setOrigin(0.5).setDepth(202);

    this.scale.on("resize", this.onResize, this);
    this.events.once("shutdown", () => this.scale.off("resize", this.onResize, this));
  }

  onResize(size) {
    const pad = 12;
    this.hpBg.setSize(size.width - pad * 2, 14);
    this.xpBg.setSize(size.width - pad * 2, 8);
    this.hpText.setX(size.width / 2);
    this.goldText.setX(size.width / 2);
    this.levelText.setX(size.width - pad);

    const dashR = this._dashR;
    const dashX = size.width - dashR - 20;
    const dashY = size.height - dashR - 24;
    this.dashBg.setPosition(dashX, dashY);
    this.dashRing.setPosition(dashX, dashY);
    this.dashLabel.setPosition(dashX, dashY);
  }

  update() {
    const g = this.game_;
    if (!g || !g.scene.isActive()) return;
    const pad = 12;
    const innerW = this.scale.width - pad * 2 - 4;

    const p = g.player;
    const hpPct = p.stats.maxHp > 0 ? Math.max(0, p.hp / p.stats.maxHp) : 0;
    this.hpFill.width = innerW * hpPct;
    this.hpText.setText(`${Math.ceil(p.hp)} / ${p.stats.maxHp}`);

    const xpPct = g.xpToNext > 0 ? g.xp / g.xpToNext : 0;
    this.xpFill.width = innerW * xpPct;

    const m = Math.floor(g.elapsedSec / 60);
    const s = Math.floor(g.elapsedSec % 60).toString().padStart(2, "0");
    this.statsText.setText(`${m}:${s}    Kills ${g.kills}`);
    this.goldText.setText(`+${(g.goldEarnedThisRun || 0).toLocaleString()} ◆`);
    this.levelText.setText(`LVL ${g.level}`);

    // Dash button state: cyan = ready, gold flash = dashing, dim = cooldown.
    const now = g.time.now;
    if (p.dashing) {
      this.dashBg.setFillStyle(0xffd166, 0.30);
      this.dashRing.setStrokeStyle(2.5, 0xffd166, 0.9);
      this.dashLabel.setText("DASH!").setColor("#ffd166");
    } else if (now < p.dashCooldownUntil) {
      this.dashBg.setFillStyle(0x49d6ff, 0.04);
      this.dashRing.setStrokeStyle(2.5, 0x49d6ff, 0.2);
      this.dashLabel.setText("DASH").setColor("#5a5e7a");
    } else {
      this.dashBg.setFillStyle(0x49d6ff, 0.12);
      this.dashRing.setStrokeStyle(2.5, 0x49d6ff, 0.5);
      this.dashLabel.setText("DASH").setColor("#49d6ff");
    }
  }
}
