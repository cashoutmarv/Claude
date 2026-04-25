import { UpgradeSystem } from "../systems/UpgradeSystem.js";

// Overlay scene: HP/XP bars, run timer, level, kills.
// Reads state directly from GameScene each frame.

export class HUDScene extends Phaser.Scene {
  constructor() { super("HUDScene"); }

  init(data) {
    this.game_ = data.game; // GameScene reference
  }

  create() {
    const { width } = this.scale;
    const pad = 12;

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

    this.levelText = this.add.text(width - pad, pad + 32, "", {
      fontFamily: "system-ui, sans-serif", fontSize: "14px", color: "#ffe28a", fontStyle: "bold",
    }).setOrigin(1, 0).setDepth(100);

    // Track resize.
    this.scale.on("resize", this.onResize, this);
    this.events.once("shutdown", () => this.scale.off("resize", this.onResize, this));
  }

  onResize(size) {
    const pad = 12;
    this.hpBg.setSize(size.width - pad * 2, 14);
    this.xpBg.setSize(size.width - pad * 2, 8);
    this.hpText.setX(size.width / 2);
    this.levelText.setX(size.width - pad);
  }

  update() {
    const g = this.game_;
    if (!g || !g.scene.isActive()) return;
    const pad = 12;
    const innerW = this.scale.width - pad * 2 - 4;

    // HP.
    const p = g.player;
    const hpPct = p.stats.maxHp > 0 ? Math.max(0, p.hp / p.stats.maxHp) : 0;
    this.hpFill.width = innerW * hpPct;
    this.hpText.setText(`${Math.ceil(p.hp)} / ${p.stats.maxHp}`);

    // XP.
    const xpPct = g.xpToNext > 0 ? g.xp / g.xpToNext : 0;
    this.xpFill.width = innerW * xpPct;

    // Time / kills.
    const m = Math.floor(g.elapsedSec / 60);
    const s = Math.floor(g.elapsedSec % 60).toString().padStart(2, "0");
    this.statsText.setText(`${m}:${s}    Kills ${g.kills}`);
    this.levelText.setText(`LVL ${g.level}`);
  }
}
