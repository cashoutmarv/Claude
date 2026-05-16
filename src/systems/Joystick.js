// Virtual touch joystick. Touch/drag anywhere on the left half of the screen;
// the base appears where the finger lands so the player never has to reach
// for a fixed UI spot. Keyboard movement is handled by the consumer scene.

export class Joystick {
  constructor(scene, { side = "left", radius = 70 } = {}) {
    this.scene = scene;
    this.side = side;
    this.radius = radius;
    this.active = false;
    this.pointerId = null;
    this.dx = 0;
    this.dy = 0;

    const depth = 1000;
    this.base = scene.add.circle(0, 0, radius, 0xffffff, 0.08)
      .setScrollFactor(0).setDepth(depth).setVisible(false);
    this.baseRing = scene.add.circle(0, 0, radius, 0xffffff, 0)
      .setStrokeStyle(2, 0xffffff, 0.35)
      .setScrollFactor(0).setDepth(depth).setVisible(false);
    this.thumb = scene.add.circle(0, 0, radius * 0.42, 0xffffff, 0.20)
      .setScrollFactor(0).setDepth(depth + 1).setVisible(false);

    scene.input.addPointer(2);
    scene.input.on("pointerdown", this.onDown, this);
    scene.input.on("pointermove", this.onMove, this);
    scene.input.on("pointerup", this.onUp, this);
    scene.input.on("pointerupoutside", this.onUp, this);

    scene.events.once("shutdown", () => this.destroy());
    scene.events.once("destroy", () => this.destroy());
  }

  isOnOurSide(p) {
    const halfW = this.scene.scale.width / 2;
    return this.side === "left" ? p.x < halfW : p.x >= halfW;
  }

  onDown(p) {
    if (this.active) return;
    if (!this.isOnOurSide(p)) return;
    this.active = true;
    this.pointerId = p.id;
    this.originX = p.x;
    this.originY = p.y;
    this.base.setPosition(p.x, p.y).setVisible(true);
    this.baseRing.setPosition(p.x, p.y).setVisible(true);
    this.thumb.setPosition(p.x, p.y).setVisible(true);
  }

  onMove(p) {
    if (!this.active || p.id !== this.pointerId) return;
    let dx = p.x - this.originX;
    let dy = p.y - this.originY;
    const len = Math.hypot(dx, dy);
    const max = this.radius;
    if (len > max) {
      dx = (dx / len) * max;
      dy = (dy / len) * max;
    }
    this.thumb.setPosition(this.originX + dx, this.originY + dy);
    this.dx = dx / max;
    this.dy = dy / max;
  }

  onUp(p) {
    if (p.id !== this.pointerId) return;
    this.active = false;
    this.pointerId = null;
    this.dx = 0;
    this.dy = 0;
    this.base.setVisible(false);
    this.baseRing.setVisible(false);
    this.thumb.setVisible(false);
  }

  getVector() {
    return { x: this.dx, y: this.dy };
  }

  destroy() {
    this.scene.input.off("pointerdown", this.onDown, this);
    this.scene.input.off("pointermove", this.onMove, this);
    this.scene.input.off("pointerup", this.onUp, this);
    this.scene.input.off("pointerupoutside", this.onUp, this);
  }
}
