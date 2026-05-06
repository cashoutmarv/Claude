import { PLAYER, WEAPONS, ARENA, DASH } from "../config/balance.js";

// Player entity. Owns:
//   - movement input → physics velocity
//   - dash ability: tap right half of screen (or SPACE) while moving
//   - HP / regen / i-frames
//
// Dash is triggered externally by GameScene.onDashInput().
// swapMount() is reserved for when mount pickups are added mid-run.

export class Player {
  constructor(scene, x, y, initialStats = null) {
    this.scene = scene;
    this.sprite = scene.physics.add.image(x, y, "player");
    this.sprite.setCircle(14, 10, 10);  // physics circle centered on 48x48 sprite
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setDepth(10);
    this.sprite.setData("ref", this);

    this.stats = initialStats || Player.defaultStats();
    this.hp = this.stats.maxHp;
    this.alive = true;
    this.invulnUntil = 0;

    this.regenAccum = 0;
    this.lastShotAt = 0;

    // Dash state.
    this.dashing = false;
    this.dashEndAt = 0;
    this.dashCooldownUntil = 0;
    this.dashDir = { x: 1, y: 0 };
    this.facing = 0;  // radians — last movement direction, persists at rest
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

  // Called by GameScene when the player triggers a dash (right-half tap or SPACE).
  startDash(now) {
    if (this.dashing || now < this.dashCooldownUntil) return false;
    this.dashing = true;
    this.dashEndAt = now + DASH.durationMs;
    this.dashDir.x = Math.cos(this.facing);
    this.dashDir.y = Math.sin(this.facing);
    // Full i-frames for the dash duration + brief window after.
    this.invulnUntil = Math.max(this.invulnUntil, this.dashEndAt + 80);
    this.scene.tweens.add({
      targets: this.sprite, scale: 1.2, duration: 80, yoyo: true,
    });
    this._spawnDashTrail();
    return true;
  }

  _spawnDashTrail() {
    const s = this.scene.add.image(this.x, this.y, "skid")
      .setTint(0x49d6ff).setAlpha(0.65).setDepth(2)
      .setRotation(this.facing).setScale(2.5, 1.2);
    this.scene.tweens.add({
      targets: s, alpha: 0, scaleX: 3.5, duration: 320,
      onComplete: () => s.destroy(),
    });
  }

  update(dt, moveX, moveY, now) {
    if (!this.alive) return;
    const baseSpeed = PLAYER.speed * this.stats.speedMul;
    const inputLen = Math.hypot(moveX, moveY);

    // --- Dash movement.
    if (this.dashing) {
      if (now >= this.dashEndAt) {
        this.dashing = false;
        this.dashCooldownUntil = now + DASH.cooldownMs;
      } else {
        const ds = baseSpeed * DASH.speedMul;
        this.sprite.setVelocity(this.dashDir.x * ds, this.dashDir.y * ds);
        this.sprite.setRotation(this.facing);
      }
    }

    // --- Normal movement (when not dashing).
    if (!this.dashing) {
      if (inputLen > 0) {
        const nx = moveX / inputLen;
        const ny = moveY / inputLen;
        this.sprite.setVelocity(nx * baseSpeed, ny * baseSpeed);
        this.facing = Math.atan2(ny, nx);
        this.sprite.setRotation(this.facing);
      } else {
        this.sprite.setVelocity(0, 0);
      }
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

  // Reserved for mount pickup items (future feature).
  swapMount(mountDef) {
    this.mountDef = mountDef;
    this.dashing = false;
    this.dashEndAt = 0;
    this.dashCooldownUntil = this.scene.time.now + 200;
  }

  reviveFull() {
    this.alive = true;
    this.hp = this.stats.maxHp;
    this.invulnUntil = this.scene.time.now + 2000;
  }
}
