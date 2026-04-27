// Modal level-up overlay. Pauses the run while the player picks one of three
// upgrades. Layout adapts to portrait/landscape automatically.

export class UpgradeScene extends Phaser.Scene {
  constructor() { super("UpgradeScene"); }

  init(data) {
    this.gameScene = data.gameScene;
    this.choices = data.choices;
  }

  create() {
    const { width, height } = this.scale;

    // Dim backdrop.
    this.add.rectangle(0, 0, width, height, 0x000000, 0.55).setOrigin(0).setDepth(0);

    this.add.text(width / 2, height * 0.10, "LEVEL UP", {
      fontFamily: "system-ui, sans-serif",
      fontSize: Math.min(48, width * 0.08) + "px",
      color: "#ffe28a",
      fontStyle: "bold",
    }).setOrigin(0.5).setDepth(1);

    this.add.text(width / 2, height * 0.18, "Choose an upgrade", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "16px",
      color: "#cfd2e6",
    }).setOrigin(0.5).setDepth(1);

    const portrait = height > width;
    const cardW = portrait ? Math.min(360, width * 0.85) : Math.min(260, width * 0.28);
    const cardH = portrait ? 110 : 220;
    const gap = 16;
    const total = portrait
      ? this.choices.length * cardH + (this.choices.length - 1) * gap
      : this.choices.length * cardW + (this.choices.length - 1) * gap;

    if (portrait) {
      let y = height * 0.30 + cardH / 2;
      for (const u of this.choices) {
        this.makeCard(width / 2, y, cardW, cardH, u);
        y += cardH + gap;
      }
    } else {
      let x = width / 2 - total / 2 + cardW / 2;
      const y = height * 0.55;
      for (const u of this.choices) {
        this.makeCard(x, y, cardW, cardH, u);
        x += cardW + gap;
      }
    }

    if (this.choices.length === 0) {
      this.add.text(width / 2, height * 0.5,
        "No new upgrades available — good luck!",
        { fontFamily: "system-ui, sans-serif", fontSize: "18px", color: "#cfd2e6" }
      ).setOrigin(0.5).setDepth(1);
      this.time.delayedCall(800, () => this.close(null));
    }
  }

  makeCard(x, y, w, h, upgrade) {
    const bg = this.add.rectangle(x, y, w, h, 0x1a1a2a, 1)
      .setStrokeStyle(2, 0x49d6ff, 0.8)
      .setInteractive({ useHandCursor: true })
      .setDepth(1);
    const name = this.add.text(x, y - h * 0.22, upgrade.name, {
      fontFamily: "system-ui, sans-serif",
      fontSize: "20px",
      color: "#ffffff",
      fontStyle: "bold",
    }).setOrigin(0.5).setDepth(2);
    const desc = this.add.text(x, y + h * 0.10, upgrade.desc, {
      fontFamily: "system-ui, sans-serif",
      fontSize: "15px",
      color: "#9aa0c0",
      wordWrap: { width: w - 24 },
      align: "center",
    }).setOrigin(0.5).setDepth(2);

    bg.on("pointerover", () => bg.setStrokeStyle(2, 0xffe28a, 1));
    bg.on("pointerout",  () => bg.setStrokeStyle(2, 0x49d6ff, 0.8));
    bg.on("pointerdown", () => this.close(upgrade));
    return { bg, name, desc };
  }

  close(upgrade) {
    if (upgrade) {
      this.gameScene.upgradeSystem.apply(upgrade, this.gameScene.player);
    }
    this.gameScene.resumeFromUpgrade();
    this.scene.stop();
  }
}
