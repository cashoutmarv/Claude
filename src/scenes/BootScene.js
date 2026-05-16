// Boot scene: load nothing real (placeholders only), then route based on
// whether the player has completed the intro. Save check happens here so
// IntroScene and HubScene don't have to know about each other.

import { Storage } from "../services/storage.js";

export class BootScene extends Phaser.Scene {
  constructor() { super("BootScene"); }

  preload() {
    this.makePlayerTexture();
  }

  create() {
    if (Storage.hasIntro()) {
      this.scene.start("HubScene");
    } else {
      this.scene.start("IntroScene");
    }
  }

  // Placeholder player sprite. A soft pastel circle with a small head — read
  // as a person from a distance, not a Dungeon-Drift mech.
  makePlayerTexture() {
    const g = this.add.graphics();
    const cx = 16, cy = 18;
    // Drop shadow
    g.fillStyle(0x000000, 0.25);
    g.fillEllipse(cx, cy + 10, 22, 6);
    // Body
    g.fillStyle(0xe8d6b3, 1);
    g.fillCircle(cx, cy, 11);
    g.lineStyle(1.5, 0x3a2a1a, 0.55);
    g.strokeCircle(cx, cy, 11);
    // Head
    g.fillStyle(0xf3d4a8, 1);
    g.fillCircle(cx, cy - 9, 6);
    g.lineStyle(1.2, 0x3a2a1a, 0.55);
    g.strokeCircle(cx, cy - 9, 6);
    // Eyes
    g.fillStyle(0x1a1208, 1);
    g.fillCircle(cx - 2, cy - 9, 1);
    g.fillCircle(cx + 2, cy - 9, 1);
    g.generateTexture("player", 32, 36);
    g.destroy();
  }
}
