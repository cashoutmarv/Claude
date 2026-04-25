import { ARENA, WAVES } from "../config/balance.js";

// Picks enemy types and spawn locations based on elapsed time. Spawns are
// placed just outside the camera's view so they appear from off-screen.

export class WaveDirector {
  constructor(scene, spawnFn) {
    this.scene = scene;
    this.spawnFn = spawnFn; // (type, x, y) => Enemy
    this.spawnAccum = 0;
    this.elapsed = 0;
    this.lastBossAt = 0;
  }

  update(dtSec) {
    this.elapsed += dtSec;

    // Spawn cadence: lerp from initial -> min over rampSeconds.
    const t = Math.min(1, this.elapsed / WAVES.rampSeconds);
    const spawnMs = WAVES.initialSpawnMs - (WAVES.initialSpawnMs - WAVES.minSpawnMs) * t;
    this.spawnAccum += dtSec * 1000;
    while (this.spawnAccum >= spawnMs) {
      this.spawnAccum -= spawnMs;
      this.spawnOne();
    }

    // Bosses every N seconds.
    if (this.elapsed - this.lastBossAt >= WAVES.bossEverySeconds && this.elapsed > 30) {
      this.lastBossAt = this.elapsed;
      this.spawnBoss();
    }
  }

  pickType() {
    const minutes = this.elapsed / 60;
    const r = Math.random();
    if (minutes < 1) return r < 0.85 ? "grunt" : "runner";
    if (minutes < 3) {
      if (r < 0.55) return "grunt";
      if (r < 0.90) return "runner";
      return "tank";
    }
    if (r < 0.40) return "grunt";
    if (r < 0.75) return "runner";
    return "tank";
  }

  randomEdgePosition() {
    const cam = this.scene.cameras.main;
    const margin = 80;
    const left = cam.scrollX - margin;
    const right = cam.scrollX + cam.width + margin;
    const top = cam.scrollY - margin;
    const bottom = cam.scrollY + cam.height + margin;
    const side = Math.floor(Math.random() * 4);
    let x, y;
    if (side === 0) { x = left;  y = top + Math.random() * (bottom - top); }
    else if (side === 1) { x = right; y = top + Math.random() * (bottom - top); }
    else if (side === 2) { x = left + Math.random() * (right - left); y = top; }
    else { x = left + Math.random() * (right - left); y = bottom; }
    // Clamp into arena bounds.
    x = Math.max(20, Math.min(ARENA.width  - 20, x));
    y = Math.max(20, Math.min(ARENA.height - 20, y));
    return { x, y };
  }

  spawnOne() {
    const { x, y } = this.randomEdgePosition();
    this.spawnFn(this.pickType(), x, y, this.elapsed / 60);
  }

  spawnBoss() {
    const { x, y } = this.randomEdgePosition();
    this.spawnFn("boss", x, y, this.elapsed / 60);
  }
}
