// Gacha screen. Two banner tabs (standard + featured), single-pull and
// 10-pull buttons, results shown above the pull buttons. Banner switches
// fully restart the scene so we never leak stale game objects.

import { CurrencyBar } from "../ui/CurrencyBar.js";
import { installAchievementToast } from "../ui/AchievementToast.js";
import { BANNERS, PITY } from "../config/banners.js";
import { TIERS } from "../config/economy.js";
import { pullOne, pullTen, pityState } from "../services/gacha.js";
import { spendGems, spendGold } from "../services/currency.js";
import { lookupItem } from "../config/items.js";

export class GachaScene extends Phaser.Scene {
  constructor() { super("GachaScene"); }

  init(data) {
    this.bannerIndex = data?.bannerIndex ?? 0;
  }

  create() {
    this.cameras.main.setBackgroundColor("#0b0b14");
    new CurrencyBar(this);
    installAchievementToast(this);
    this.resultsGroup = null;
    this.layout();
  }

  layout() {
    const { width, height } = this.scale;
    const banner = BANNERS[this.bannerIndex];

    // Back button.
    this.makeButton(60, 64, 80, 32, "← Back", 0x2a2a3a, "#cfd2e6", () => this.scene.start("HomeScene"));

    // Banner tabs.
    const tabsY = 110;
    const tabW = Math.min(220, (width - 40) / BANNERS.length - 8);
    let tx = width / 2 - (BANNERS.length * tabW + (BANNERS.length - 1) * 8) / 2 + tabW / 2;
    for (let i = 0; i < BANNERS.length; i++) {
      const active = i === this.bannerIndex;
      const r = this.add.rectangle(tx, tabsY, tabW, 36, active ? 0x49d6ff : 0x1a1a2a, 1)
        .setStrokeStyle(2, 0x49d6ff, 0.8).setInteractive({ useHandCursor: true });
      this.add.text(tx, tabsY, BANNERS[i].name, {
        fontFamily: "system-ui, sans-serif", fontSize: "14px",
        color: active ? "#0b0b14" : "#cfd2e6", fontStyle: "bold",
      }).setOrigin(0.5);
      const idx = i;
      r.on("pointerdown", () => {
        if (idx === this.bannerIndex) return;
        this.scene.restart({ bannerIndex: idx });
      });
      tx += tabW + 8;
    }

    // Pity readout.
    const p = pityState(banner.id);
    this.add.text(width / 2, 152,
      `Pity: ${p.sinceLegendary}/${PITY.hardPity} pulls until guaranteed Legendary  ·  Total pulls: ${p.totalPulls}`,
      { fontFamily: "system-ui, sans-serif", fontSize: "12px", color: "#7a8099" }
    ).setOrigin(0.5);

    // Featured pool preview.
    this.renderFeaturedPreview(banner, width / 2, height * 0.34);

    // Pull buttons at the bottom.
    const buttonsY = height - 110;
    this.makeButton(width / 2 - 120, buttonsY, 220, 56,
      `Pull x1\n${banner.costGems} ◇${banner.costGoldAlt ? `  /  ${banner.costGoldAlt} ◆` : ""}`,
      0xc084fc, "#0b0b14", () => this.tryPull(1));
    this.makeButton(width / 2 + 120, buttonsY, 220, 56,
      `Pull x10\n${banner.costGemsTen} ◇${banner.costGoldAltTen ? `  /  ${banner.costGoldAltTen} ◆` : ""}`,
      0xffd166, "#0b0b14", () => this.tryPull(10));
  }

  renderFeaturedPreview(banner, cx, cy) {
    const ids = banner.pool.legendary || [];
    if (ids.length === 0) return;
    const slotW = 96;
    const totalW = ids.length * slotW + (ids.length - 1) * 12;
    let x = cx - totalW / 2 + slotW / 2;
    this.add.text(cx, cy - 70, "Legendary lineup", {
      fontFamily: "system-ui, sans-serif", fontSize: "12px", color: "#7a8099",
    }).setOrigin(0.5);
    for (const id of ids) {
      const meta = lookupItem(id);
      if (!meta) continue;
      const tierColor = TIERS[meta.def.tier].color;
      this.add.rectangle(x, cy, slotW, 96, 0x1a1a2a, 1).setStrokeStyle(2, tierColor, 1);
      this.add.text(x, cy - 20, meta.def.name, {
        fontFamily: "system-ui, sans-serif", fontSize: "13px",
        color: "#ffffff", fontStyle: "bold",
        wordWrap: { width: slotW - 8 }, align: "center",
      }).setOrigin(0.5);
      this.add.text(x, cy + 14, TIERS[meta.def.tier].label, {
        fontFamily: "system-ui, sans-serif", fontSize: "11px",
        color: Phaser.Display.Color.IntegerToColor(tierColor).rgba,
      }).setOrigin(0.5);
      x += slotW + 12;
    }
  }

  tryPull(count) {
    const banner = BANNERS[this.bannerIndex];
    const cost = count === 1 ? banner.costGems : banner.costGemsTen;
    const goldCost = count === 1 ? banner.costGoldAlt : banner.costGoldAltTen;

    if (spendGems(cost)) {
      this.doPull(count, banner);
    } else if (goldCost && spendGold(goldCost)) {
      this.doPull(count, banner);
    } else {
      this.toast(`Not enough gems${goldCost ? " or gold" : ""}. Visit the Shop.`);
    }
  }

  doPull(count, banner) {
    const results = count === 1 ? [pullOne(banner)] : pullTen(banner);
    this.renderResults(results);
  }

  renderResults(results) {
    if (this.resultsGroup) this.resultsGroup.destroy(true);
    this.resultsGroup = this.add.container(0, 0);

    const { width, height } = this.scale;
    const cy = height * 0.55;

    const highest = results.reduce((a, b) =>
      TIERS[b.tier].rank > TIERS[a.tier].rank ? b : a, results[0]);

    const meta = lookupItem(highest.id);
    if (meta) {
      const tierColor = TIERS[meta.def.tier].color;
      const card = this.add.rectangle(width / 2, cy, 240, 120, 0x1a1a2a)
        .setStrokeStyle(3, tierColor, 1);
      const name = this.add.text(width / 2, cy - 28, meta.def.name, {
        fontFamily: "system-ui, sans-serif", fontSize: "20px", color: "#ffffff", fontStyle: "bold",
      }).setOrigin(0.5);
      const tierLabel = this.add.text(width / 2, cy - 6, TIERS[meta.def.tier].label, {
        fontFamily: "system-ui, sans-serif", fontSize: "13px",
        color: Phaser.Display.Color.IntegerToColor(tierColor).rgba, fontStyle: "bold",
      }).setOrigin(0.5);
      const desc = this.add.text(width / 2, cy + 22, meta.def.desc, {
        fontFamily: "system-ui, sans-serif", fontSize: "12px", color: "#cfd2e6",
        wordWrap: { width: 220 }, align: "center",
      }).setOrigin(0.5);
      this.resultsGroup.add([card, name, tierLabel, desc]);
      this.tweens.add({ targets: card, scaleX: { from: 0.7, to: 1 }, scaleY: { from: 0.7, to: 1 }, ease: "Back.easeOut", duration: 350 });
    }

    if (results.length > 1) {
      const slotW = Math.min(48, (width - 40) / results.length - 4);
      const totalW = results.length * slotW + (results.length - 1) * 4;
      let x = width / 2 - totalW / 2 + slotW / 2;
      const stripY = cy - 100;
      for (const r of results) {
        const tier = TIERS[r.tier];
        const m = lookupItem(r.id);
        const slot = this.add.rectangle(x, stripY, slotW, slotW, 0x1a1a2a)
          .setStrokeStyle(2, tier.color, 1);
        const lbl = this.add.text(x, stripY, tier.label[0], {
          fontFamily: "system-ui, sans-serif", fontSize: "14px", color: "#ffffff", fontStyle: "bold",
        }).setOrigin(0.5);
        this.resultsGroup.add([slot, lbl]);
        if (m) {
          this.resultsGroup.add(this.add.text(x, stripY + slotW / 2 + 6, m.def.name, {
            fontFamily: "system-ui, sans-serif", fontSize: "9px", color: "#7a8099",
            wordWrap: { width: slotW + 8 }, align: "center",
          }).setOrigin(0.5, 0));
        }
        x += slotW + 4;
      }
    }
  }

  makeButton(x, y, w, h, label, color, textColor, onClick) {
    const r = this.add.rectangle(x, y, w, h, color, 1)
      .setStrokeStyle(2, 0xffffff, 0.25)
      .setInteractive({ useHandCursor: true });
    this.add.text(x, y, label, {
      fontFamily: "system-ui, sans-serif", fontSize: "14px", color: textColor,
      fontStyle: "bold", align: "center",
    }).setOrigin(0.5);
    r.on("pointerdown", () => { r.setFillStyle(Phaser.Display.Color.IntegerToColor(color).darken(15).color); this.time.delayedCall(50, onClick); });
    return r;
  }

  toast(msg) {
    const t = this.add.text(this.scale.width / 2, this.scale.height - 180, msg, {
      fontFamily: "system-ui, sans-serif", fontSize: "14px", color: "#ff5266",
      backgroundColor: "rgba(0,0,0,0.6)", padding: { x: 10, y: 6 },
    }).setOrigin(0.5).setAlpha(0).setDepth(400);
    this.tweens.add({ targets: t, alpha: 1, duration: 200, hold: 1500, yoyo: true,
      onComplete: () => t.destroy() });
  }
}
