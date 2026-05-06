import { ENEMIES, XP } from "../config/balance.js";

// Procedural placeholder sprites. Replace with atlas swap at polish time.

export class BootScene extends Phaser.Scene {
  constructor() { super("BootScene"); }

  preload() {
    this.makePlayerTexture();
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

  // Top-down warrior. Sprite faces RIGHT at rotation=0; GameScene rotates it
  // to match movement direction each frame.
  makePlayerTexture() {
    const g = this.add.graphics();
    const W = 48, H = 48;
    const cx = 22, cy = 24;  // armor body center (slightly left to leave room for sword)

    // Drop shadow.
    g.fillStyle(0x000000, 0.35);
    g.fillEllipse(25, 38, 42, 14);

    // Outer armor ring — dark navy.
    g.fillStyle(0x111830, 1);
    g.fillCircle(cx, cy, 18);

    // Main armor — steel blue.
    g.fillStyle(0x254d8c, 1);
    g.fillCircle(cx, cy, 15);

    // Chest plate highlight.
    g.fillStyle(0x3a78cc, 1);
    g.fillCircle(cx - 2, cy - 2, 9);

    // Pauldrons (shoulders).
    g.fillStyle(0x2a60a8, 1);
    g.fillCircle(cx - 11, cy - 5, 5);
    g.fillCircle(cx + 6, cy - 11, 5);

    // Cyan core gem.
    g.fillStyle(0x49d6ff, 1);
    g.fillCircle(cx, cy, 5);
    g.fillStyle(0xb8efff, 1);
    g.fillCircle(cx - 1, cy - 1, 2);

    // Head — positioned upper-right to read as facing right.
    g.fillStyle(0xe8c49a, 1);
    g.fillCircle(33, 15, 7);

    // Helmet cap.
    g.fillStyle(0x254d8c, 1);
    g.fillRect(27, 8, 13, 9);
    g.fillCircle(33, 8, 6);

    // Visor slit — cyan glow.
    g.fillStyle(0x49d6ff, 1);
    g.fillRect(28, 14, 9, 3);

    // Sword — handle → guard → blade → tip, all pointing right.
    g.fillStyle(0x6b3820, 1);      // handle
    g.fillRect(38, 21, 4, 4);
    g.fillStyle(0xdaa520, 1);      // pommel
    g.fillCircle(38, 25, 2);
    g.fillStyle(0xdaa520, 1);      // guard
    g.fillRect(36, 18, 3, 10);
    g.fillStyle(0xd0dce8, 1);      // blade
    g.fillRect(39, 21, 8, 3);
    g.fillStyle(0xffffff, 0.9);    // tip gleam
    g.fillTriangle(47, 21, 47, 24, 48, 22);

    // Body outline.
    g.lineStyle(1.5, 0x050f1f, 0.6);
    g.strokeCircle(cx, cy, 18);

    g.generateTexture("player", W, H);
    g.destroy();
  }

  // Skid-mark trail used during dash.
  makeSkidTexture() {
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 14, 4);
    g.generateTexture("skid", 14, 4);
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
    const pad = 2;
    const size = r * 2 + pad * 2;
    const cx = size / 2, cy = size / 2;
    const g = this.add.graphics();

    if (name === "grunt") {
      // Red goblin — round, angry, fanged.
      g.fillStyle(0x7a1010, 1);
      g.fillCircle(cx, cy, r);
      g.fillStyle(0xc94a4a, 1);
      g.fillCircle(cx, cy, r - 1);
      // Horns.
      g.fillStyle(0x8a2020, 1);
      g.fillTriangle(cx - r * 0.35, cy - r * 0.7,
                     cx - r * 0.18, cy - r * 1.0,
                     cx - r * 0.05, cy - r * 0.7);
      g.fillTriangle(cx + r * 0.05, cy - r * 0.7,
                     cx + r * 0.18, cy - r * 1.0,
                     cx + r * 0.35, cy - r * 0.7);
      // Angry slanted eyes.
      g.fillStyle(0xffffff, 1);
      g.fillTriangle(cx - r * 0.52, cy - r * 0.18,
                     cx - r * 0.08, cy - r * 0.18,
                     cx - r * 0.30, cy - r * 0.55);
      g.fillTriangle(cx + r * 0.08, cy - r * 0.18,
                     cx + r * 0.52, cy - r * 0.18,
                     cx + r * 0.30, cy - r * 0.55);
      g.fillStyle(0x000000, 1);
      g.fillCircle(cx - r * 0.30, cy - r * 0.28, r * 0.13);
      g.fillCircle(cx + r * 0.30, cy - r * 0.28, r * 0.13);
      // Open mouth with fangs.
      g.fillStyle(0x3a0808, 1);
      g.fillRect(cx - r * 0.32, cy + r * 0.15, r * 0.64, r * 0.32);
      g.fillStyle(0xffffff, 1);
      g.fillTriangle(cx - r * 0.22, cy + r * 0.15,
                     cx - r * 0.06, cy + r * 0.15,
                     cx - r * 0.14, cy + r * 0.42);
      g.fillTriangle(cx + r * 0.06, cy + r * 0.15,
                     cx + r * 0.22, cy + r * 0.15,
                     cx + r * 0.14, cy + r * 0.42);
      g.lineStyle(1.5, 0x000000, 0.5);
      g.strokeCircle(cx, cy, r);

    } else if (name === "runner") {
      // Orange specter — sleek, single huge eye, predator smile.
      g.fillStyle(0xb84c14, 1);
      g.fillCircle(cx, cy, r);
      g.fillStyle(0xe07a3c, 1);
      g.fillCircle(cx, cy, r - 1);
      // Speed streaks.
      g.fillStyle(0xb84c14, 1);
      g.fillRect(cx - r * 0.55, cy - r * 0.08, r * 0.45, r * 0.16);
      g.fillRect(cx - r * 0.45, cy - r * 0.35, r * 0.35, r * 0.14);
      g.fillRect(cx - r * 0.45, cy + r * 0.20, r * 0.35, r * 0.14);
      // Single large eye (cyclops).
      g.fillStyle(0xffffff, 1);
      g.fillCircle(cx + r * 0.05, cy - r * 0.08, r * 0.38);
      g.fillStyle(0xff3800, 1);
      g.fillCircle(cx + r * 0.08, cy - r * 0.06, r * 0.24);
      g.fillStyle(0x000000, 1);
      g.fillCircle(cx + r * 0.10, cy - r * 0.04, r * 0.13);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(cx + r * 0.06, cy - r * 0.14, r * 0.06);
      // Thin predator grin.
      g.lineStyle(2, 0x000000, 0.9);
      g.beginPath();
      g.arc(cx, cy + r * 0.32, r * 0.28, 0.08 * Math.PI, 0.92 * Math.PI, false);
      g.strokePath();
      g.lineStyle(1.5, 0x000000, 0.5);
      g.strokeCircle(cx, cy, r);

    } else if (name === "tank") {
      // Purple brute — armored, heavy, intimidating.
      g.fillStyle(0x280a50, 1);
      g.fillCircle(cx, cy, r);
      g.fillStyle(0x6a2cbc, 1);
      g.fillCircle(cx, cy, r - 2);
      // Armor ring plates.
      g.lineStyle(3, 0x9040e8, 0.7);
      g.strokeCircle(cx, cy, r - 5);
      g.lineStyle(2, 0xb060ff, 0.45);
      g.strokeCircle(cx, cy, r - 9);
      // Flat brow ridge.
      g.fillStyle(0x3a1080, 1);
      g.fillRect(cx - r * 0.5, cy - r * 0.38, r * 1.0, r * 0.18);
      // Small glowing eyes.
      g.fillStyle(0xff00ff, 1);
      g.fillCircle(cx - r * 0.26, cy - r * 0.16, r * 0.1);
      g.fillCircle(cx + r * 0.26, cy - r * 0.16, r * 0.1);
      g.fillStyle(0xffffff, 0.6);
      g.fillCircle(cx - r * 0.28, cy - r * 0.20, r * 0.04);
      g.fillCircle(cx + r * 0.24, cy - r * 0.20, r * 0.04);
      // Heavy frown.
      g.lineStyle(2.5, 0x1a0030, 0.9);
      g.beginPath();
      g.arc(cx, cy + r * 0.35, r * 0.30, Math.PI * 0.15, Math.PI * 0.85, false);
      g.strokePath();
      g.lineStyle(2, 0x000000, 0.5);
      g.strokeCircle(cx, cy, r);

    } else if (name === "boss") {
      // Gold crowned terror — big, ornate, scary.
      g.fillStyle(0xffd700, 0.18);
      g.fillCircle(cx, cy, r + 1);
      g.fillStyle(0x8a6000, 1);
      g.fillCircle(cx, cy, r);
      g.fillStyle(0xf2c14e, 1);
      g.fillCircle(cx, cy, r - 2);
      g.fillStyle(0xffd966, 1);
      g.fillCircle(cx - r * 0.22, cy - r * 0.18, r * 0.52);
      // Crown base.
      g.fillStyle(0xffd700, 1);
      g.fillRect(cx - r * 0.48, cy - r * 0.98, r * 0.96, r * 0.28);
      // Crown spikes (three).
      g.fillTriangle(cx - r * 0.38, cy - r * 0.70,
                     cx - r * 0.22, cy - r * 0.70,
                     cx - r * 0.30, cy - r * 1.05);
      g.fillTriangle(cx - r * 0.07, cy - r * 0.70,
                     cx + r * 0.07, cy - r * 0.70,
                     cx,            cy - r * 1.10);
      g.fillTriangle(cx + r * 0.22, cy - r * 0.70,
                     cx + r * 0.38, cy - r * 0.70,
                     cx + r * 0.30, cy - r * 1.05);
      // Crown jewels.
      g.fillStyle(0xff2222, 1); g.fillCircle(cx - r * 0.30, cy - r * 0.84, r * 0.07);
      g.fillStyle(0x22ffee, 1); g.fillCircle(cx,            cy - r * 0.87, r * 0.08);
      g.fillStyle(0x22ff44, 1); g.fillCircle(cx + r * 0.30, cy - r * 0.84, r * 0.07);
      // Large angry eyes.
      g.fillStyle(0xffffff, 1);
      g.fillCircle(cx - r * 0.28, cy - r * 0.10, r * 0.20);
      g.fillCircle(cx + r * 0.28, cy - r * 0.10, r * 0.20);
      g.fillStyle(0xff2200, 1);
      g.fillCircle(cx - r * 0.28, cy - r * 0.08, r * 0.13);
      g.fillCircle(cx + r * 0.28, cy - r * 0.08, r * 0.13);
      g.fillStyle(0x000000, 1);
      g.fillCircle(cx - r * 0.26, cy - r * 0.06, r * 0.07);
      g.fillCircle(cx + r * 0.30, cy - r * 0.06, r * 0.07);
      // Angry brow lines.
      g.lineStyle(2.5, 0x8b0000, 1);
      g.lineBetween(cx - r * 0.44, cy - r * 0.32, cx - r * 0.12, cy - r * 0.26);
      g.lineBetween(cx + r * 0.12, cy - r * 0.26, cx + r * 0.44, cy - r * 0.32);
      // Wide menacing mouth.
      g.fillStyle(0x3a1000, 1);
      g.fillRect(cx - r * 0.35, cy + r * 0.20, r * 0.70, r * 0.28);
      g.fillStyle(0xffffff, 1);
      for (let t = 0; t < 5; t++) {
        const tx = cx - r * 0.32 + t * r * 0.16;
        g.fillTriangle(tx, cy + r * 0.20,
                       tx + r * 0.10, cy + r * 0.20,
                       tx + r * 0.05, cy + r * 0.42);
      }
      g.lineStyle(2, 0x8b6914, 0.5);
      g.strokeCircle(cx, cy, r);

    } else {
      g.fillStyle(def.color, 1);
      g.fillCircle(cx, cy, r);
      g.lineStyle(2, 0x000000, 0.4);
      g.strokeCircle(cx, cy, r);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(cx + r * 0.3, cy - r * 0.2, Math.max(2, r * 0.2));
    }

    g.generateTexture(`enemy_${name}`, size, size);
    g.destroy();
  }

  makeArenaTile() {
    const g = this.add.graphics();
    // Base floor — very dark slate.
    g.fillStyle(0x0d0d1a, 1);
    g.fillRect(0, 0, 64, 64);
    // Subtle stone crack lines.
    g.lineStyle(1, 0x181828, 1);
    g.lineBetween(0, 32, 64, 32);
    g.lineBetween(32, 0, 32, 64);
    // Corner dots for texture.
    g.fillStyle(0x1a1a2e, 1);
    g.fillCircle(16, 16, 1.5);
    g.fillCircle(48, 16, 1.5);
    g.fillCircle(16, 48, 1.5);
    g.fillCircle(48, 48, 1.5);
    g.generateTexture("arenaTile", 64, 64);
    g.destroy();
  }
}
