import { Storage } from "../services/storage.js";

export class MenuScene extends Phaser.Scene {
  constructor() { super("MenuScene"); }

  create() {
    const { width, height } = this.scale;
    const cx = width / 2;

    this.cameras.main.setBackgroundColor("#0b0b14");

    // Title.
    this.add.text(cx, height * 0.22, "DUNGEON DRIFT", {
      fontFamily: "system-ui, sans-serif",
      fontSize: Math.min(64, width * 0.10) + "px",
      color: "#49d6ff",
      fontStyle: "bold",
    }).setOrigin(0.5).setShadow(0, 0, "#49d6ff", 16, true, true);

    this.add.text(cx, height * 0.30, "a roguelike survivor", {
      fontFamily: "system-ui, sans-serif",
      fontSize: Math.min(20, width * 0.04) + "px",
      color: "#9aa0c0",
    }).setOrigin(0.5);

    // Best stats.
    const save = Storage.load();
    const min = Math.floor(save.bestTimeSec / 60);
    const sec = Math.floor(save.bestTimeSec % 60).toString().padStart(2, "0");
    this.add.text(cx, height * 0.42,
      `Best: ${min}:${sec}    Kills: ${save.bestKills}    Runs: ${save.totalRuns}`,
      { fontFamily: "system-ui, sans-serif", fontSize: "16px", color: "#7a8099" }
    ).setOrigin(0.5);

    // Play button.
    const btnW = Math.min(280, width * 0.7);
    const btnH = 64;
    const btn = this.add.rectangle(cx, height * 0.58, btnW, btnH, 0x49d6ff, 1)
      .setStrokeStyle(2, 0xffffff, 0.4)
      .setInteractive({ useHandCursor: true });
    const btnText = this.add.text(cx, height * 0.58, "PLAY", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "28px",
      color: "#0b0b14",
      fontStyle: "bold",
    }).setOrigin(0.5);

    btn.on("pointerover", () => btn.setFillStyle(0x6cdfff));
    btn.on("pointerout",  () => btn.setFillStyle(0x49d6ff));
    btn.on("pointerdown", () => {
      btn.setFillStyle(0x2faedf);
      this.time.delayedCall(80, () => this.scene.start("GameScene"));
    });

    this.add.text(cx, height * 0.72,
      "Move: WASD / arrows / drag\nWeapons fire automatically",
      { fontFamily: "system-ui, sans-serif", fontSize: "16px", color: "#7a8099", align: "center" }
    ).setOrigin(0.5);

    // Allow keyboard to start.
    this.input.keyboard.once("keydown", () => this.scene.start("GameScene"));
  }
}
