// HubScene — Day 1, bare. Per DESIGN.md §5: one campfire, one bedroll, one
// rift-marker in the sky, nothing else. The player can walk. That's it.
//
// Later phases add: world-synthesis-driven palette, scenery, buildings, NPCs,
// raid timer. Resist adding any of that here.

import { Storage } from "../services/storage.js";
import { Joystick } from "../systems/Joystick.js";

const HUB_W = 1600;
const HUB_H = 1200;

// BOTW-minimalist defaults. World synthesis will override these in Phase 1.
const PALETTE = {
  sky:        0xb6dec3,
  groundFar:  0x84c294,
  groundNear: 0x6fae7e,
  accent:     0xf6e3a2,
  fireGlow:   0xffb066,
  fireCore:   0xffe28a,
  stone:      0x9ea995,
  bedroll:    0xc9aa6b,
  riftLight:  0xc7d6ff,
};

export class HubScene extends Phaser.Scene {
  constructor() { super("HubScene"); }

  create() {
    this.physics.world.setBounds(0, 0, HUB_W, HUB_H);
    this.cameras.main.setBackgroundColor(
      "#" + PALETTE.sky.toString(16).padStart(6, "0"),
    );
    this.cameras.main.setBounds(0, 0, HUB_W, HUB_H);
    this.cameras.main.fadeIn(900, 0, 0, 0);

    this._buildGround();
    this._buildCampfire();
    this._buildBedroll();
    this._buildRiftMarker();
    this._buildPlayer();
    this._buildHUD();
    this._setupInput();

    this.scale.on("resize", this._onResize, this);
    this.events.once("shutdown", () => this.scale.off("resize", this._onResize, this));
  }

  _buildGround() {
    this.add.rectangle(0, 0, HUB_W, HUB_H, PALETTE.groundFar, 1)
      .setOrigin(0).setDepth(-90);
    this.add.ellipse(HUB_W / 2, HUB_H * 0.62, HUB_W * 1.2, HUB_H * 0.95,
                    PALETTE.groundNear, 1).setDepth(-89);
    // Soft horizon stripe.
    this.add.rectangle(0, HUB_H * 0.18, HUB_W, 4, PALETTE.accent, 0.45)
      .setOrigin(0).setDepth(-88);
  }

  _buildCampfire() {
    const cx = HUB_W / 2;
    const cy = HUB_H * 0.55;
    const g = this.add.container(cx, cy).setDepth(cy);
    // Stone ring.
    const stones = this.add.ellipse(0, 4, 64, 26, PALETTE.stone, 1)
      .setStrokeStyle(1.5, 0x000000, 0.25);
    const inside = this.add.ellipse(0, 2, 46, 16, 0x1a1208, 1);
    // Flame.
    const flame1 = this.add.ellipse(0, -10, 22, 30, PALETTE.fireGlow, 0.85);
    const flame2 = this.add.ellipse(0, -14, 12, 22, PALETTE.fireCore, 0.95);
    g.add([stones, inside, flame1, flame2]);
    this.tweens.add({
      targets: flame1, scaleY: 1.18, scaleX: 0.92,
      duration: 320, yoyo: true, repeat: -1,
    });
    this.tweens.add({
      targets: flame2, scaleY: 1.10, scaleX: 0.88,
      duration: 220, yoyo: true, repeat: -1,
    });
    this.campfire = { x: cx, y: cy, container: g };
  }

  _buildBedroll() {
    const cx = HUB_W / 2 - 110;
    const cy = HUB_H * 0.55 + 30;
    const g = this.add.container(cx, cy).setDepth(cy);
    const shadow = this.add.ellipse(0, 14, 70, 10, 0x000000, 0.3);
    const mat    = this.add.rectangle(0, 0, 64, 26, PALETTE.bedroll, 1)
      .setStrokeStyle(1.5, 0x6b4a20, 0.6);
    const pillow = this.add.rectangle(-22, -2, 18, 14, 0xf3e2b8, 1)
      .setStrokeStyle(1, 0x6b4a20, 0.4);
    g.add([shadow, mat, pillow]);
    this.bedroll = { x: cx, y: cy, container: g };
  }

  // The rift in the sky — a faint vertical seam of light that persists. It's
  // closed in Phase 0; it pulses for friend arrivals in later phases.
  _buildRiftMarker() {
    const cx = HUB_W / 2;
    const cy = HUB_H * 0.06;
    const seam = this.add.rectangle(cx, cy, 4, 80, PALETTE.riftLight, 0.55)
      .setDepth(-50);
    const halo = this.add.ellipse(cx, cy, 70, 26, PALETTE.riftLight, 0.18)
      .setDepth(-51);
    this.tweens.add({
      targets: [seam, halo], alpha: { from: 0.55, to: 0.30 },
      duration: 2400, yoyo: true, repeat: -1, ease: "Sine.easeInOut",
    });
  }

  _buildPlayer() {
    const cx = HUB_W / 2;
    const cy = HUB_H * 0.70;
    this.player = this.physics.add.image(cx, cy, "player");
    this.player.setCircle(11, 5, 7);
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(cy);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
  }

  _setupInput() {
    this.cursors  = this.input.keyboard.createCursorKeys();
    this.keys     = this.input.keyboard.addKeys("W,A,S,D");
    this.joystick = new Joystick(this, { side: "left" });
  }

  _buildHUD() {
    const { width } = this.scale;
    const name = Storage.load().player.name || "Traveler";
    this.add.text(width / 2, 36, name, {
      fontFamily: '"Iowan Old Style", Georgia, serif',
      fontSize: "16px", color: "#ffffff", fontStyle: "italic",
    }).setOrigin(0.5).setDepth(200).setScrollFactor(0)
      .setShadow(0, 0, "#000000", 6, true, true);
  }

  _onResize(_size) {
    // HUD is reflowed automatically by Phaser's RESIZE mode for centered
    // origins; nothing to do for the skeleton.
  }

  update() {
    let mx = 0, my = 0;
    if (this.cursors.left.isDown  || this.keys.A.isDown) mx -= 1;
    if (this.cursors.right.isDown || this.keys.D.isDown) mx += 1;
    if (this.cursors.up.isDown    || this.keys.W.isDown) my -= 1;
    if (this.cursors.down.isDown  || this.keys.S.isDown) my += 1;
    const j = this.joystick.getVector();
    if (j.x !== 0 || j.y !== 0) { mx = j.x; my = j.y; }
    const len = Math.hypot(mx, my);
    const speed = 200;
    if (len > 0) {
      this.player.setVelocity((mx / len) * speed, (my / len) * speed);
    } else {
      this.player.setVelocity(0, 0);
    }
    // Y-sort the player with the world objects (campfire/bedroll).
    this.player.setDepth(this.player.y);
  }
}
