// Small animated banner that appears at the top-center when an achievement
// unlocks. Multiple toasts queue; they slide in, hold for ~2.4s, slide out.

import { Achievements, onUnlock } from "../services/achievements.js";

export class AchievementToast {
  constructor(scene) {
    this.scene = scene;
    this.queue = [];
    this.showing = false;
    this.unsub = onUnlock((a) => this.enqueue(a));
    scene.events.once("shutdown", () => this.destroy());
  }

  enqueue(achievement) {
    this.queue.push(achievement);
    this.pump();
  }

  pump() {
    if (this.showing) return;
    const next = this.queue.shift();
    if (!next) return;
    this.showing = true;
    this.show(next, () => { this.showing = false; this.pump(); });
  }

  show(a, onDone) {
    const w = this.scene.scale.width;
    const cx = w / 2;
    const startY = -80;
    const targetY = 60;

    const cardW = Math.min(380, w * 0.9);
    const cardH = 64;

    const c = this.scene.add.container(cx, startY).setDepth(500).setScrollFactor(0);
    const bg = this.scene.add.rectangle(0, 0, cardW, cardH, 0x1a1a2a, 0.95)
      .setStrokeStyle(2, 0xffd166, 1);
    const title = this.scene.add.text(-cardW / 2 + 14, -cardH / 2 + 8, "ACHIEVEMENT UNLOCKED", {
      fontFamily: "system-ui, sans-serif", fontSize: "11px", color: "#ffd166", fontStyle: "bold",
    });
    const name = this.scene.add.text(-cardW / 2 + 14, -cardH / 2 + 22, a.name, {
      fontFamily: "system-ui, sans-serif", fontSize: "16px", color: "#ffffff", fontStyle: "bold",
    });
    const reward = this.scene.add.text(cardW / 2 - 14, 0, `+${a.gems} ◇`, {
      fontFamily: "system-ui, sans-serif", fontSize: "18px", color: "#49d6ff", fontStyle: "bold",
    }).setOrigin(1, 0.5);
    const desc = this.scene.add.text(-cardW / 2 + 14, cardH / 2 - 16, a.desc, {
      fontFamily: "system-ui, sans-serif", fontSize: "11px", color: "#9aa0c0",
    });
    c.add([bg, title, name, desc, reward]);

    this.scene.tweens.add({
      targets: c, y: targetY, ease: "Cubic.easeOut", duration: 350,
      onComplete: () => {
        this.scene.time.delayedCall(2200, () => {
          this.scene.tweens.add({
            targets: c, y: startY, alpha: 0, ease: "Cubic.easeIn", duration: 280,
            onComplete: () => { c.destroy(); onDone(); },
          });
        });
      },
    });
  }

  destroy() {
    if (this.unsub) this.unsub();
  }
}

// Convenience: install a toast once into a scene if not already.
export function installAchievementToast(scene) {
  if (scene._achievementToast) return scene._achievementToast;
  scene._achievementToast = new AchievementToast(scene);
  return scene._achievementToast;
}
