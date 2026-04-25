import { ENEMIES, XP } from "../config/balance.js";

// We don't have any external assets — generate the placeholder sprites
// procedurally. Replacing these with real art is a one-line change later.

export class BootScene extends Phaser.Scene {
  constructor() { super("BootScene"); }

  preload() {
    this.makePlayerTexture();
    this.makeBoltTexture();
    this.makeGemTexture();
    for (const [name, def] of Object.entries(ENEMIES)) {
      this.makeEnemyTexture(name, def);
    }
    this.makeArenaTile();
  }

  create() {
    this.scene.start("MenuScene");
  }

  makePlayerTexture() {
    const g = this.add.graphics();
    g.fillStyle(0x49d6ff, 1);
    g.fillCircle(16, 16, 14);
    g.lineStyle(2, 0xffffff, 0.9);
    g.strokeCircle(16, 16, 14);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(20, 12, 3);
    g.generateTexture("player", 32, 32);
    g.destroy();
  }

  makeBoltTexture() {
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 3, 14, 4);
    g.fillStyle(0xffe28a, 1);
    g.fillRect(2, 4, 10, 2);
    g.generateTexture("bolt", 14, 10);
    g.destroy();
  }

  makeGemTexture() {
    const g = this.add.graphics();
    g.fillStyle(XP.gemColor, 1);
    g.fillTriangle(6, 0, 12, 6, 6, 12);
    g.fillTriangle(0, 6, 6, 0, 6, 12);
    g.lineStyle(1, 0xffffff, 0.7);
    g.strokeTriangle(6, 0, 12, 6, 6, 12);
    g.strokeTriangle(0, 6, 6, 0, 6, 12);
    g.generateTexture("gem", 12, 12);
    g.destroy();
  }

  makeEnemyTexture(name, def) {
    const r = def.radius;
    const size = r * 2 + 4;
    const g = this.add.graphics();
    g.fillStyle(def.color, 1);
    g.fillCircle(size / 2, size / 2, r);
    g.lineStyle(2, 0x000000, 0.4);
    g.strokeCircle(size / 2, size / 2, r);
    // Eye to give it a face.
    g.fillStyle(0xffffff, 1);
    g.fillCircle(size / 2 + r * 0.3, size / 2 - r * 0.2, Math.max(2, r * 0.2));
    g.fillStyle(0x000000, 1);
    g.fillCircle(size / 2 + r * 0.35, size / 2 - r * 0.2, Math.max(1, r * 0.1));
    g.generateTexture(`enemy_${name}`, size, size);
    g.destroy();
  }

  makeArenaTile() {
    const g = this.add.graphics();
    g.fillStyle(0x14141f, 1);
    g.fillRect(0, 0, 64, 64);
    g.lineStyle(1, 0x1f1f30, 1);
    g.strokeRect(0, 0, 64, 64);
    // Subtle grid dot.
    g.fillStyle(0x1f1f30, 1);
    g.fillCircle(32, 32, 1.2);
    g.generateTexture("arenaTile", 64, 64);
    g.destroy();
  }
}
