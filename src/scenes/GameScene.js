import { ARENA, PLAYER, WEAPONS, XP } from "../config/balance.js";
import { ECONOMY } from "../config/economy.js";
import { Player } from "../entities/Player.js";
import { Enemy } from "../entities/Enemy.js";
import { Projectile } from "../entities/Projectile.js";
import { XPGem } from "../entities/XPGem.js";
import { WaveDirector } from "../systems/WaveDirector.js";
import { UpgradeSystem } from "../systems/UpgradeSystem.js";
import { Joystick } from "../systems/Joystick.js";
import { applyEquippedToStats, getEquipped } from "../services/inventory.js";
import { VIP } from "../services/vip.js";
import { Subscription } from "../services/subscription.js";
import { Achievements, onUnlock } from "../services/achievements.js";
import { addGold, addGems, addMaterials } from "../services/currency.js";
import { Storage } from "../services/storage.js";

export class GameScene extends Phaser.Scene {
  constructor() { super("GameScene"); }

  create() {
    this.physics.world.setBounds(0, 0, ARENA.width, ARENA.height);

    // Tiled arena background.
    this.add.tileSprite(0, 0, ARENA.width, ARENA.height, "arenaTile")
      .setOrigin(0).setDepth(-10);
    // Border.
    const border = this.add.rectangle(ARENA.width / 2, ARENA.height / 2, ARENA.width, ARENA.height)
      .setStrokeStyle(4, 0x49d6ff, 0.4).setFillStyle();
    border.setDepth(-9);

    // Containers.
    this.enemies = new Set();
    this.gems = new Set();
    this.projectiles = [];
    this.orbs = []; // visual + logic for orbiting shards

    // Build the player's starting stats from equipment + VIP + subscription.
    const stats = applyEquippedToStats(Player.defaultStats());
    VIP.applyToStats(stats);
    Subscription.applyToStats(stats);

    // Player.
    this.player = new Player(this, ARENA.width / 2, ARENA.height / 2, stats);

    // Camera.
    this.cameras.main.startFollow(this.player.sprite, true, 0.12, 0.12);
    this.cameras.main.setBounds(0, 0, ARENA.width, ARENA.height);
    this.cameras.main.setBackgroundColor("#0b0b14");

    // Run state.
    this.startTime = this.time.now;
    this.elapsedSec = 0;
    this.kills = 0;
    this.bossKills = 0;
    this.level = 1;
    this.xp = 0;
    this.xpToNext = UpgradeSystem.xpForLevel(2);
    this.pendingLevels = 0;
    this.upgradeSystem = new UpgradeSystem();
    this.runRevives = 0;        // how many times the player has revived this run
    this.goldEarnedThisRun = 0; // for run-end summary
    this.runAchievementsUnlocked = []; // for run-end summary
    this._lastSurviveTickSec = 0; // for periodic survive_seconds achievement firing

    // Listen for achievements unlocked during the run so we can surface them
    // in the game-over summary.
    this._achievementUnsub = onUnlock((a) => this.runAchievementsUnlocked.push(a));
    this.events.once("shutdown", () => this._achievementUnsub && this._achievementUnsub());

    // Weapons timing.
    this.lastShotAt = 0;
    this._orbAngle = 0;
    this._orbDamageBuffer = new Map(); // enemy ref -> next-allowed-tick time

    // Systems.
    this.waveDirector = new WaveDirector(this, (type, x, y, minutes) => this.spawnEnemy(type, x, y, minutes));

    // Input.
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys("W,A,S,D");
    this.dashKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.joystick = new Joystick(this, { side: "left" });

    // Right-half tap = dash. Joystick owns the left half.
    this.input.on("pointerdown", (p) => {
      if (p.x > this.scale.width / 2) this.player.startDash(this.time.now);
    });

    // Physics colliders / overlaps. Use groups for performance.
    this.enemyGroup = this.physics.add.group();
    this.projGroup = this.physics.add.group();
    this.gemGroup = this.physics.add.group();

    this.physics.add.overlap(this.projGroup, this.enemyGroup, (proj, enemy) => {
      this.onProjectileHit(proj.getData("ref"), enemy.getData("ref"));
    });
    this.physics.add.overlap(this.player.sprite, this.enemyGroup, (_p, enemy) => {
      this.onPlayerTouchEnemy(enemy.getData("ref"));
    });
    this.physics.add.overlap(this.player.sprite, this.gemGroup, (_p, gem) => {
      this.onCollectGem(gem.getData("ref"));
    });

    // HUD.
    this.scene.launch("HUDScene", { game: this });
  }

  spawnEnemy(type, x, y, minutes) {
    const e = new Enemy(this, x, y, type, minutes);
    this.enemies.add(e);
    this.enemyGroup.add(e.sprite);
    return e;
  }

  spawnGem(x, y, value) {
    const g = new XPGem(this, x, y, value);
    this.gems.add(g);
    this.gemGroup.add(g.sprite);
  }

  onCollectGem(gem) {
    if (gem.collected) return;
    gem.collected = true;
    const gained = Math.max(1, Math.round(gem.value * this.player.stats.xpMul));
    this.xp += gained;
    while (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.level += 1;
      this.pendingLevels += 1;
      this.xpToNext = UpgradeSystem.xpForLevel(this.level + 1);
      Achievements.fire("level_up", this.level);
    }
    this.gems.delete(gem);
    gem.destroy();
  }

  onProjectileHit(proj, enemy) {
    if (!proj || !enemy || !enemy.alive || !proj.sprite.active) return;
    const killed = enemy.takeDamage(proj.damage, this.time.now);
    const removed = proj.onHit(enemy);
    if (killed) this.killEnemy(enemy);
    if (removed) {
      // pool drains via deactivate; nothing else to do
    }
  }

  killEnemy(enemy) {
    if (!this.enemies.has(enemy)) return;
    this.kills += 1;

    // Gold drop scales with enemy XP value (bosses give a lot more).
    const baseGold = ECONOMY.goldPerKillBase + ECONOMY.goldPerKillXpMul * enemy.xp;
    const gold = Math.max(1, Math.round(baseGold * (this.player.stats.goldMul || 1)));
    addGold(gold);
    this.goldEarnedThisRun += gold;

    // Achievement triggers.
    Achievements.fire("kill", 1);
    if (enemy.type === "boss") {
      this.bossKills += 1;
      Achievements.fire("boss_kill", 1);
    }

    this.spawnGem(enemy.x, enemy.y, enemy.xp);
    this.enemies.delete(enemy);
    enemy.destroy();
  }

  onPlayerTouchEnemy(enemy) {
    if (!enemy || !enemy.alive) return;
    this.player.takeDamage(enemy.damage * 0.5, this.time.now);
    if (!this.player.alive) this.endRun();
  }

  // Auto-fire towards nearest enemy.
  tryFire(now) {
    const cdMs = WEAPONS.bolt.cooldownMs / this.player.stats.fireRateMul;
    if (now - this.lastShotAt < cdMs) return;
    const target = this.findNearestEnemy(this.player.x, this.player.y, 700);
    if (!target) return;
    this.lastShotAt = now;

    const baseAngle = Math.atan2(target.y - this.player.y, target.x - this.player.x);
    const count = this.player.stats.projectiles;
    const spread = Phaser.Math.DegToRad(count > 1 ? 12 : 0);
    const startAngle = baseAngle - ((count - 1) * spread) / 2;
    for (let i = 0; i < count; i++) {
      const angle = startAngle + i * spread;
      this.fireProjectile(angle);
    }
  }

  fireProjectile(angle) {
    const w = WEAPONS.bolt;
    const p = this.getProjectileFromPool();
    p.fire(
      this.player.x,
      this.player.y,
      angle,
      w.speed,
      w.damage * this.player.stats.damageMul,
      w.lifeMs,
      this.player.stats.pierce
    );
  }

  getProjectileFromPool() {
    for (let i = 0; i < this.projectiles.length; i++) {
      if (!this.projectiles[i].sprite.active) return this.projectiles[i];
    }
    const p = new Projectile(this);
    // Add to physics group exactly once; reuse via active flag thereafter.
    this.projGroup.add(p.sprite);
    this.projectiles.push(p);
    return p;
  }

  findNearestEnemy(x, y, maxDist) {
    let best = null;
    let bestSq = maxDist * maxDist;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const dx = e.x - x;
      const dy = e.y - y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestSq) {
        bestSq = d2;
        best = e;
      }
    }
    return best;
  }

  // Orbiting shards: cheap circular sweep that ticks damage on overlap.
  updateOrbs(dt, now) {
    const count = this.player.stats.orbCount;
    while (this.orbs.length < count) {
      const shard = this.add.image(0, 0, "bolt").setDepth(9).setTint(0xc7a8ff).setScale(1.4);
      this.orbs.push(shard);
    }
    while (this.orbs.length > count) {
      const s = this.orbs.pop();
      s.destroy();
    }
    if (count === 0) return;

    this._orbAngle += WEAPONS.orb.orbitSpeed * dt;
    const r = WEAPONS.orb.orbitRadius;
    const dmg = WEAPONS.orb.damage * this.player.stats.damageMul;
    for (let i = 0; i < count; i++) {
      const a = this._orbAngle + (i * (Math.PI * 2)) / count;
      const ox = this.player.x + Math.cos(a) * r;
      const oy = this.player.y + Math.sin(a) * r;
      this.orbs[i].setPosition(ox, oy);
      this.orbs[i].setRotation(a);
      // Damage any enemy within ~16px of orb.
      for (const e of this.enemies) {
        if (!e.alive) continue;
        const dx = e.x - ox;
        const dy = e.y - oy;
        if (dx * dx + dy * dy < 18 * 18) {
          const allowAt = this._orbDamageBuffer.get(e) || 0;
          if (now >= allowAt) {
            const killed = e.takeDamage(dmg, now);
            this._orbDamageBuffer.set(e, now + WEAPONS.orb.tickMs);
            if (killed) this.killEnemy(e);
          }
        }
      }
    }
  }

  endRun() {
    if (this._ending) return;
    this._ending = true;

    // Save run records and lifetime counters.
    Storage.mutate((s) => {
      s.totalRuns += 1;
      if (this.elapsedSec > s.bestTimeSec) s.bestTimeSec = this.elapsedSec;
      if (this.kills > s.bestKills) s.bestKills = this.kills;
    });

    // Fire achievements: death + run_end.
    Achievements.fire("death", 1);
    Achievements.fire("run_end", 1);

    // New-player bonus on first 5 runs.
    const totalRuns = Storage.load().totalRuns;
    if (totalRuns <= ECONOMY.newPlayerRunBonusRuns) {
      addGold(ECONOMY.newPlayerRunBonusGold, "new_player_bonus");
      this.goldEarnedThisRun += ECONOMY.newPlayerRunBonusGold;
    }
    addGold(ECONOMY.goldRunCompletionFlat, "run_completion");
    this.goldEarnedThisRun += ECONOMY.goldRunCompletionFlat;

    // Materials drop: tiny per-kill drip + run completion + raid bonus.
    const carry = Storage.load().__hubCarry || {};
    const isRaidRun = !!carry.isRaid;
    const matsFromKills = Math.floor((this.kills || 0) * ECONOMY.materialsPerKill);
    const matsFromRun   = ECONOMY.materialsRunCompletion;
    const matsRaidBonus = isRaidRun ? ECONOMY.materialsRaidReward : 0;
    const matsTotal = matsFromKills + matsFromRun + matsRaidBonus;
    if (matsTotal > 0) addMaterials(matsTotal, isRaidRun ? "raid_run" : "cave_run");
    this.materialsEarnedThisRun = matsTotal;

    // Pass raid completion back to the hub. HubScene reads + clears
    // __hubCarry on re-entry. We only WRITE on raid runs; a non-raid
    // "Play Again" must leave any pending raid-complete flag alone so
    // the hub still reads it when the player eventually returns.
    if (isRaidRun) {
      Storage.mutate((s) => {
        s.__hubCarry = { raidCompleted: true, materials: matsTotal };
      });
    }

    this.scene.stop("HUDScene");
    // Pause (not stop) so we can resume on revive without losing run state.
    this.scene.pause();
    this.scene.launch("GameOverScene", {
      kills: this.kills,
      bossKills: this.bossKills,
      timeSec: this.elapsedSec,
      level: this.level,
      runRevives: this.runRevives,
      goldEarned: this.goldEarnedThisRun,
      achievementsThisRun: this.runAchievementsUnlocked.slice(),
      onRevive: () => this.handleRevive(),
    });
  }

  // Called from GameOverScene when the player chooses to revive (ad or gems).
  handleRevive() {
    this._ending = false;
    this.runRevives += 1;
    Achievements.fire("revive_used", 1);
    Storage.mutate((s) => { s.lifetime.revives += 1; });
    this.player.reviveFull();
    // Clear nearby enemies to give a breather.
    for (const e of [...this.enemies]) {
      const dx = e.x - this.player.x;
      const dy = e.y - this.player.y;
      if (dx * dx + dy * dy < 220 * 220) {
        this.killEnemy(e);
      }
    }
    this.scene.launch("HUDScene", { game: this });
    this.scene.resume();
  }

  update(_t, dtMs) {
    const now = this.time.now;
    const dt = dtMs / 1000;
    if (!this.player.alive) return;
    this.elapsedSec = (now - this.startTime) / 1000;

    // Pause for level-up.
    if (this.pendingLevels > 0 && !this.scene.isActive("UpgradeScene")) {
      this.physics.pause();
      this.scene.launch("UpgradeScene", {
        gameScene: this,
        choices: this.upgradeSystem.rollChoices(3),
      });
      return;
    }

    // Movement input.
    let mx = 0, my = 0;
    if (this.cursors.left.isDown || this.keys.A.isDown)  mx -= 1;
    if (this.cursors.right.isDown || this.keys.D.isDown) mx += 1;
    if (this.cursors.up.isDown    || this.keys.W.isDown) my -= 1;
    if (this.cursors.down.isDown  || this.keys.S.isDown) my += 1;
    const j = this.joystick.getVector();
    if (j.x !== 0 || j.y !== 0) { mx = j.x; my = j.y; }

    if (Phaser.Input.Keyboard.JustDown(this.dashKey)) this.player.startDash(now);
    this.player.update(dt, mx, my, now);
    this.tryFire(now);
    this.updateOrbs(dt, now);
    this.waveDirector.update(dt);

    // Update enemies / gems.
    for (const e of this.enemies) e.update(this.player.x, this.player.y, now);
    for (const g of this.gems) g.update(this.player.x, this.player.y, this.player.pickupRadius);
    for (const p of this.projectiles) p.update(dtMs);

    // Survive-seconds achievement firing — once per second is plenty.
    const surviveSec = Math.floor(this.elapsedSec);
    if (surviveSec > this._lastSurviveTickSec) {
      this._lastSurviveTickSec = surviveSec;
      Achievements.fire("survive_seconds", surviveSec);
    }

    if (!this.player.alive) this.endRun();
  }

  resumeFromUpgrade() {
    this.pendingLevels = Math.max(0, this.pendingLevels - 1);
    if (this.pendingLevels === 0) this.physics.resume();
  }

}
