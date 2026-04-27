import { PLAYER, WEAPONS, ARENA, XP } from "../config/balance.js";

export class Player {
  // `initialStats` is the merged stat object after applying equipped
  // character / relics / VIP / subscription. If omitted, defaults are used.
  constructor(scene, x, y, initialStats = null) {
    this.scene = scene;
    this.sprite = scene.physics.add.image(x, y, "player");
    this.sprite.setCircle(14, 2, 2);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setDepth(10);
    this.sprite.setData("ref", this);

    // Stats are mutable — upgrades multiply/add into these.
    this.stats = initialStats || Player.defaultStats();
    this.hp = this.stats.maxHp;
    this.alive = true;
    this.invulnUntil = 0;

    this.regenAccum = 0;
    this.lastShotAt = 0;
  }

  static defaultStats() {
    return {
      maxHp: PLAYER.maxHp,
      speedMul: 1,
      damageMul: 1,
      fireRateMul: 1,
      projectiles: WEAPONS.bolt.projectiles,
      pierce: WEAPONS.bolt.pierce,
      pickupMul: 1,
      regenPerSec: 0,
      orbCount: 0,
      xpMul: 1,
      goldMul: 1,
    };
  }

  get x() { return this.sprite.x; }
  get y() { return this.sprite.y; }

  get pickupRadius() {
    return PLAYER.pickupRadius * this.stats.pickupMul;
  }

  takeDamage(amount, now) {
    if (!this.alive || now < this.invulnUntil) return;
    this.hp -= amount;
    this.invulnUntil = now + PLAYER.invulnMs;
    this.scene.cameras.main.shake(120, 0.005);
    this.flash();
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
    }
  }

  flash() {
    this.sprite.setTintFill(0xffffff);
    this.scene.time.delayedCall(80, () => {
      if (this.sprite.active) this.sprite.clearTint();
    });
  }

  update(dt, moveX, moveY) {
    if (!this.alive) return;
    const speed = PLAYER.speed * this.stats.speedMul;
    const len = Math.hypot(moveX, moveY);
    if (len > 0) {
      const nx = moveX / len;
      const ny = moveY / len;
      this.sprite.setVelocity(nx * speed, ny * speed);
    } else {
      this.sprite.setVelocity(0, 0);
    }

    if (this.stats.regenPerSec > 0 && this.hp < this.stats.maxHp) {
      this.regenAccum += this.stats.regenPerSec * dt;
      if (this.regenAccum >= 1) {
        const heal = Math.floor(this.regenAccum);
        this.regenAccum -= heal;
        this.hp = Math.min(this.stats.maxHp, this.hp + heal);
      }
    }

    // Clamp inside arena.
    if (this.sprite.x < 16) this.sprite.x = 16;
    if (this.sprite.y < 16) this.sprite.y = 16;
    if (this.sprite.x > ARENA.width - 16) this.sprite.x = ARENA.width - 16;
    if (this.sprite.y > ARENA.height - 16) this.sprite.y = ARENA.height - 16;
  }

  reviveFull() {
    this.alive = true;
    this.hp = this.stats.maxHp;
    this.invulnUntil = this.scene.time.now + 2000;
  }
}
