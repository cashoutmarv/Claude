// Reusable header bar showing gold + gems + exchange tokens. Subscribes
// to currency changes so any earned/spent action animates instantly.

import { getBalances, onChange } from "../services/currency.js";

export class CurrencyBar {
  constructor(scene, { y = 8 } = {}) {
    this.scene = scene;
    this.y = y;
    const w = scene.scale.width;

    this.container = scene.add.container(0, 0).setDepth(200).setScrollFactor(0);

    const bg = scene.add.rectangle(0, 0, w, 40, 0x000000, 0.35).setOrigin(0);
    this.container.add(bg);
    this.bg = bg;

    this.goldText = scene.add.text(16, y, "", { fontFamily: "system-ui, sans-serif", fontSize: "16px", color: "#ffd166", fontStyle: "bold" });
    this.gemsText = scene.add.text(0, y, "", { fontFamily: "system-ui, sans-serif", fontSize: "16px", color: "#49d6ff", fontStyle: "bold" }).setOrigin(0.5, 0);
    this.tokensText = scene.add.text(0, y, "", { fontFamily: "system-ui, sans-serif", fontSize: "14px", color: "#c084fc" }).setOrigin(1, 0);

    this.container.add([this.goldText, this.gemsText, this.tokensText]);
    this.layout();
    this.refresh();

    this.unsubscribe = onChange(() => this.refresh());
    scene.scale.on("resize", this.layout, this);
    scene.events.once("shutdown", () => this.destroy());
  }

  layout() {
    const w = this.scene.scale.width;
    this.bg.setSize(w, 40);
    this.gemsText.setX(w / 2);
    this.tokensText.setX(w - 16);
  }

  refresh() {
    const { gold, gems, tokens } = getBalances();
    this.goldText.setText(`◆ ${gold.toLocaleString()}`);
    this.gemsText.setText(`◇ ${gems.toLocaleString()}`);
    this.tokensText.setText(tokens > 0 ? `★ ${tokens}` : "");
  }

  destroy() {
    if (this.unsubscribe) this.unsubscribe();
    this.scene.scale.off("resize", this.layout, this);
    this.container.destroy();
  }
}
