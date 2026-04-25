import { ENEMIES, WAVES } from "../config/balance.js";

export class Enemy {
  constructor(scene, x, y, type, minutesElapsed) {
    this.scene = scene;
    this.type = type;
    const def = ENEMIES[type];

    const hpScale = 1 + WAVES.hpScalePerMinute * minutesElapsed;
    const dmgScale = 1 + WAVES.damageScalePerMinute * minutesElapsed;

    this.maxHp = def.hp * hpScale;
    this.hp = this.maxHp;
    this.damage = def.damage * dmgScale;
    this.speed = def.speed;
    this.xp = def.xp;
    this.radius = def.radius;
    this.alive = true;

    const textureKey = `enemy_${type}`;
    this.sprite = scene.physics.add.image(x, y, textureKey);
    // Texture has 2px padding around the circle on each side.
    this.sprite.setCircle(def.radius, 2, 2);
    this.sprite.setData("ref", this);
    this.sprite.setDepth(8);

    // Hit-flash state.
    this._flashUntil = 0;
  }

  get x() { return this.sprite.x; }
  get y() { return this.sprite.y; }

  update(playerX, playerY, now) {
    if (!this.alive) return;
    const dx = playerX - this.sprite.x;
    const dy = playerY - this.sprite.y;
    const len = Math.hypot(dx, dy) || 1;
    this.sprite.setVelocity((dx / len) * this.speed, (dy / len) * this.speed);

    if (this._flashUntil && now > this._flashUntil) {
      this.sprite.clearTint();
      this._flashUntil = 0;
    }
  }

  takeDamage(amount, now) {
    if (!this.alive) return false;
    this.hp -= amount;
    this.sprite.setTintFill(0xffffff);
    this._flashUntil = now + 60;
    if (this.hp <= 0) {
      this.alive = false;
      return true;
    }
    return false;
  }

  destroy() {
    this.sprite.destroy();
  }
}
