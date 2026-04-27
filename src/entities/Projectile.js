export class Projectile {
  // Pooled lightweight projectile. Owner = Player.
  constructor(scene) {
    this.scene = scene;
    this.sprite = scene.physics.add.image(0, 0, "bolt");
    this.sprite.setActive(false).setVisible(false);
    this.sprite.body.enable = false;
    this.sprite.setDepth(9);
    this.sprite.setData("ref", this);

    this.damage = 0;
    this.pierce = 0;
    this.lifeRemaining = 0;
    this.hitSet = new Set(); // enemies this projectile already damaged
  }

  fire(x, y, angle, speed, damage, lifeMs, pierce) {
    this.sprite.setActive(true).setVisible(true);
    this.sprite.body.enable = true;
    this.sprite.setPosition(x, y);
    this.sprite.setRotation(angle);
    this.sprite.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    this.damage = damage;
    this.pierce = pierce;
    this.lifeRemaining = lifeMs;
    this.hitSet.clear();
  }

  update(dtMs) {
    if (!this.sprite.active) return;
    this.lifeRemaining -= dtMs;
    if (this.lifeRemaining <= 0) this.deactivate();
  }

  deactivate() {
    this.sprite.setActive(false).setVisible(false);
    this.sprite.body.enable = false;
    this.sprite.setVelocity(0, 0);
  }

  // Returns true if the projectile should be removed after this hit.
  onHit(enemyRef) {
    if (this.hitSet.has(enemyRef)) return false;
    this.hitSet.add(enemyRef);
    if (this.pierce <= 0) {
      this.deactivate();
      return true;
    }
    this.pierce -= 1;
    return false;
  }
}
