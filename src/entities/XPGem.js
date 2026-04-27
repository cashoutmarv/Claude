import { XP } from "../config/balance.js";

export class XPGem {
  constructor(scene, x, y, value) {
    this.scene = scene;
    this.sprite = scene.physics.add.image(x, y, "gem");
    this.sprite.setCircle(6, 0, 0);
    this.sprite.setDepth(7);
    this.sprite.setData("ref", this);
    this.value = value;
    this.collected = false;
    this.magnetized = false;
  }

  get x() { return this.sprite.x; }
  get y() { return this.sprite.y; }

  update(playerX, playerY, pickupRadius) {
    if (this.collected) return;
    const dx = playerX - this.sprite.x;
    const dy = playerY - this.sprite.y;
    const dist = Math.hypot(dx, dy);
    if (this.magnetized || dist < pickupRadius) {
      this.magnetized = true;
      const len = dist || 1;
      this.sprite.setVelocity((dx / len) * XP.magnetSpeed, (dy / len) * XP.magnetSpeed);
    }
  }

  destroy() {
    this.sprite.destroy();
  }
}
