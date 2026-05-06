import { ENEMIES, XP } from "../config/balance.js";
import { MOUNTS } from "../config/mounts.js";

// We don't have any external assets — generate the placeholder sprites
// procedurally. Replacing these with real art is a one-line change later.

export class BootScene extends Phaser.Scene {
  constructor() { super("BootScene"); }

  preload() {
    this.makePlayerTexture();
    for (const id of Object.keys(MOUNTS)) this.makeMountTexture(id);
    this.makeSkidTexture();
    this.makeBoltTexture();
    this.makeGemTexture();
    for (const [name, def] of Object.entries(ENEMIES)) {
      this.makeEnemyTexture(name, def);
    }
    this.makeArenaTile();
  }

  create() {
    this.scene.start("HomeScene");
  }

  // Fallback "player" texture, kept for any scene that still references it.
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

  // Per-mount sprite. Mounts are drawn pointing RIGHT (+X) so a rotation of
  // 0 = facing right, matching velocity. Player.update keeps the sprite's
  // rotation aligned with movement direction.
  makeMountTexture(id) {
    if (id === "stable_pony") return this.makeMountStablePony();
    // Fallback for mounts that haven't been illustrated yet.
    const g = this.add.graphics();
    g.fillStyle(0x49d6ff, 1);
    g.fillCircle(16, 16, 14);
    g.lineStyle(2, 0xffffff, 0.9);
    g.strokeCircle(16, 16, 14);
    g.generateTexture(`mount_${id}`, 32, 32);
    g.destroy();
  }

  makeMountStablePony() {
    const g = this.add.graphics();
    // Body — horizontal oval, brown.
    g.fillStyle(0x8b5a3c, 1);
    g.fillEllipse(16, 17, 26, 16);
    // Saddle — cyan accent so the player marker reads at small sizes.
    g.fillStyle(0x49d6ff, 1);
    g.fillEllipse(15, 14, 10, 6);
    g.lineStyle(1, 0x1f6a85, 1);
    g.strokeEllipse(15, 14, 10, 6);
    // Mane along the neck/back.
    g.fillStyle(0x3a2716, 1);
    g.fillRect(8, 12, 6, 6);
    // Tail — left tip.
    g.fillStyle(0x3a2716, 1);
    g.fillTriangle(2, 17, 8, 13, 8, 21);
    // Head — right side, slightly raised.
    g.fillStyle(0x8b5a3c, 1);
    g.fillEllipse(25, 14, 10, 9);
    // Snout.
    g.fillStyle(0x6e4429, 1);
    g.fillEllipse(29, 16, 4, 3);
    // Ears.
    g.fillStyle(0x8b5a3c, 1);
    g.fillTriangle(22, 7, 24, 11, 21, 11);
    g.fillTriangle(27, 7, 29, 11, 26, 11);
    // Eye.
    g.fillStyle(0xffffff, 1);
    g.fillCircle(26, 13, 1.4);
    g.fillStyle(0x000000, 1);
    g.fillCircle(26.4, 13, 0.7);
    // Outline pass for readability.
    g.lineStyle(1, 0x000000, 0.35);
    g.strokeEllipse(16, 17, 26, 16);
    g.generateTexture("mount_stable_pony", 32, 32);
    g.destroy();
  }

  // Skid-mark trail used while drifting.
  makeSkidTexture() {
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 12, 3);
    g.generateTexture("skid", 12, 3);
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
