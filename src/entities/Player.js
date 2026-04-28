import { PLAYER, WEAPONS, ARENA, XP, DRIFT } from "../config/balance.js";
import { MOUNTS } from "../config/mounts.js";

// Player entity. Owns:
//   - movement input → physics velocity
//   - active mount (drives texture + drift signature)
//   - drift state (sharp turns trigger a brief slide with a per-mount effect)
//   - HP / regen / i-frames
//
// Drift detection is universal; the *effect* of a drift is dispatched in
// GameScene.applyDriftSignature() based on the mount's drift.signature.

export class Player {
  // `initialStats` is the merged stat object after applying equipped
  // mount / relics / VIP / subscription. If omitted, defaults are used.
  // `mountDef` is the active mount's catalog entry (config/mounts.js).
  constructor(scene, x, y, initialStats = null, mountDef = null) {
    this.scene = scene;
    this.mountDef = mountDef || MOUNTS.stable_pony;
    this.sprite = scene.physics.add.image(x, y, `mount_${this.mountDef.id}`);
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

    // Drift state.
    this.drifting = false;
    this.driftEndAt = 0;
    this.driftCooldownUntil = 0;
    this.driftDir = { x: 1, y: 0 };
    this.recentDir = null;        // { x, y, ts } for sharp-turn detection
    this.lastSkidAt = 0;
    this.facing = 0;              // last rendered rotation (radians)
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

  update(dt, moveX, moveY, now) {
    if (!this.alive) return;
    const baseSpeed = PLAYER.speed * this.stats.speedMul;
    const inputLen = Math.hypot(moveX, moveY);

    // --- Drift detection (only when not already drifting and off cooldown).
    if (!this.drifting && now > this.driftCooldownUntil && inputLen > DRIFT.inputMagnitudeMin) {
      const r = this.recentDir;
      if (r && (now - r.ts) < DRIFT.inputHistoryMs) {
        const rLen = Math.hypot(r.x, r.y);
        if (rLen > DRIFT.inputMagnitudeMin) {
          const dot = (moveX * r.x + moveY * r.y) / (inputLen * rLen);
          if (dot < DRIFT.turnDotMax) {
            // Slide in the direction we WERE moving — that's the "drift".
            this.startDrift(now, r.x / rLen, r.y / rLen);
          }
        }
      }
    }
    // Sample input direction at most once per DRIFT.inputSampleMs so the
    // history reflects sustained movement, not single-frame spikes.
    if (inputLen > DRIFT.inputMagnitudeMin && (!this.recentDir || (now - this.recentDir.ts) >= DRIFT.inputSampleMs)) {
      this.recentDir = { x: moveX, y: moveY, ts: now };
    }

    // --- Movement.
    if (this.drifting) {
      if (now >= this.driftEndAt) {
        this.endDrift(now);
      } else {
        const ds = baseSpeed * (this.mountDef.drift.speedMul || 1.5);
        this.sprite.setVelocity(this.driftDir.x * ds, this.driftDir.y * ds);
        this.facing = Math.atan2(this.driftDir.y, this.driftDir.x);
        this.sprite.setRotation(this.facing);
        if (now - this.lastSkidAt > DRIFT.skidMs) {
          this.lastSkidAt = now;
          this.spawnSkid();
        }
      }
    }
    if (!this.drifting) {
      if (inputLen > 0) {
        const nx = moveX / inputLen;
        const ny = moveY / inputLen;
        this.sprite.setVelocity(nx * baseSpeed, ny * baseSpeed);
        this.facing = Math.atan2(ny, nx);
        this.sprite.setRotation(this.facing);
      } else {
        this.sprite.setVelocity(0, 0);
        // Keep last facing — the mount holds its pose.
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

  // Begin a drift in (dirX, dirY) — usually the *previous* movement
  // direction. The scene gets a chance to apply the mount's drift effect
  // (damage pulse, charge, fireball drop, etc.) right at trigger time.
  startDrift(now, dirX, dirY) {
    const cfg = this.mountDef.drift;
    this.drifting = true;
    this.driftEndAt = now + cfg.durationMs;
    this.driftDir.x = dirX;
    this.driftDir.y = dirY;
    if (cfg.iframes) {
      this.invulnUntil = Math.max(this.invulnUntil, this.driftEndAt + 80);
    }
    if (typeof this.scene.applyDriftSignature === "function") {
      this.scene.applyDriftSignature(cfg, this.x, this.y, this.driftDir);
    }
    // Visible "snap" — quick scale pulse so the player feels the drift.
    this.scene.tweens.add({
      targets: this.sprite, scale: 1.15, duration: 80, yoyo: true,
    });
  }

  endDrift(now) {
    this.drifting = false;
    this.driftCooldownUntil = now + (this.mountDef.drift.cooldownMs || 600);
  }

  spawnSkid() {
    const s = this.scene.add.image(this.x, this.y, "skid")
      .setTint(0x49d6ff).setAlpha(0.55).setDepth(2)
      .setRotation(Math.atan2(this.driftDir.y, this.driftDir.x));
    this.scene.tweens.add({
      targets: s, alpha: 0, duration: 380,
      onComplete: () => s.destroy(),
    });
  }

  // Hot-swap mounts mid-run. Texture and drift signature change immediately;
  // base stat layer rebuilding (when we wire mount boxes) will be done by
  // GameScene before calling this.
  swapMount(newMountDef) {
    this.mountDef = newMountDef;
    if (this.scene.textures.exists(`mount_${newMountDef.id}`)) {
      this.sprite.setTexture(`mount_${newMountDef.id}`);
    }
    // End any active drift cleanly so the new mount's effect doesn't fire
    // mid-slide.
    this.drifting = false;
    this.driftEndAt = 0;
    this.driftCooldownUntil = this.scene.time.now + 200;
  }

  reviveFull() {
    this.alive = true;
    this.hp = this.stats.maxHp;
    this.invulnUntil = this.scene.time.now + 2000;
  }
}
