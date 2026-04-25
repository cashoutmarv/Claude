import { Storage } from "../services/storage.js";
import { Ads } from "../services/ads.js";

export class GameOverScene extends Phaser.Scene {
  constructor() { super("GameOverScene"); }

  init(data) {
    this.kills = data.kills;
    this.timeSec = data.timeSec;
    this.level = data.level;
    this.usedRevive = data.usedRevive;
    this.onRevive = data.onRevive;
  }

  create() {
    const { width, height } = this.scale;

    // Save best stats and run count. Don't double-count revived runs.
    const save = Storage.load();
    save.totalRuns += 1;
    if (this.timeSec > save.bestTimeSec) save.bestTimeSec = this.timeSec;
    if (this.kills > save.bestKills) save.bestKills = this.kills;
    Storage.save(save);

    this.cameras.main.setBackgroundColor("#0b0b14");

    this.add.rectangle(0, 0, width, height, 0x000000, 0.4).setOrigin(0);

    this.add.text(width / 2, height * 0.18, "YOU DIED", {
      fontFamily: "system-ui, sans-serif",
      fontSize: Math.min(56, width * 0.10) + "px",
      color: "#ff5266",
      fontStyle: "bold",
    }).setOrigin(0.5);

    const m = Math.floor(this.timeSec / 60);
    const s = Math.floor(this.timeSec % 60).toString().padStart(2, "0");
    this.add.text(width / 2, height * 0.30,
      `Time ${m}:${s}    Level ${this.level}    Kills ${this.kills}`,
      { fontFamily: "system-ui, sans-serif", fontSize: "18px", color: "#cfd2e6" }
    ).setOrigin(0.5);

    const buttons = [];

    // Revive button (rewarded ad) — only once per run.
    if (!this.usedRevive && this.onRevive) {
      buttons.push({
        label: "Revive (Watch Ad)",
        color: 0xffe28a,
        textColor: "#0b0b14",
        action: () => this.requestRevive(),
      });
    }
    buttons.push({
      label: "Play Again",
      color: 0x49d6ff,
      textColor: "#0b0b14",
      action: () => {
        Ads.maybeShowInterstitial();
        this.scene.stop("GameScene");
        this.scene.stop();
        this.scene.start("GameScene");
      },
    });
    buttons.push({
      label: "Main Menu",
      color: 0x2a2a3a,
      textColor: "#cfd2e6",
      action: () => {
        Ads.maybeShowInterstitial();
        this.scene.stop("GameScene");
        this.scene.stop();
        this.scene.start("MenuScene");
      },
    });

    const btnW = Math.min(280, width * 0.7);
    const btnH = 56;
    const gap = 14;
    let y = height * 0.45;
    for (const b of buttons) {
      this.makeButton(width / 2, y, btnW, btnH, b);
      y += btnH + gap;
    }
  }

  makeButton(x, y, w, h, { label, color, textColor, action }) {
    const bg = this.add.rectangle(x, y, w, h, color, 1)
      .setStrokeStyle(2, 0xffffff, 0.25)
      .setInteractive({ useHandCursor: true });
    this.add.text(x, y, label, {
      fontFamily: "system-ui, sans-serif", fontSize: "20px", color: textColor, fontStyle: "bold",
    }).setOrigin(0.5);
    bg.on("pointerover", () => bg.setFillStyle(Phaser.Display.Color.IntegerToColor(color).brighten(15).color));
    bg.on("pointerout",  () => bg.setFillStyle(color));
    bg.on("pointerdown", () => {
      bg.setFillStyle(Phaser.Display.Color.IntegerToColor(color).darken(15).color);
      this.time.delayedCall(60, action);
    });
    return bg;
  }

  async requestRevive() {
    const granted = await Ads.showRewarded("revive");
    if (granted && this.onRevive) {
      // Resume the existing GameScene rather than starting fresh.
      this.scene.stop();
      this.onRevive();
    }
  }
}
