// Shop screen. Lists IAP products grouped: subscription, starter pack,
// gem packs, ad-removal. Tapping a product invokes the IAP stub.

import { CurrencyBar } from "../ui/CurrencyBar.js";
import { installAchievementToast } from "../ui/AchievementToast.js";
import { IAP } from "../services/iap.js";
import { Storage } from "../services/storage.js";
import { Subscription } from "../services/subscription.js";
import { IAP_CATALOG } from "../config/economy.js";

export class ShopScene extends Phaser.Scene {
  constructor() { super("ShopScene"); }

  create() {
    this.cameras.main.setBackgroundColor("#0b0b14");
    new CurrencyBar(this);
    installAchievementToast(this);
    this.layout();
  }

  // After a purchase we restart the scene so we never leak stale game
  // objects across re-renders.
  refresh() { this.scene.restart(); }

  layout() {
    const { width, height } = this.scale;

    this.makeButton(60, 64, 80, 32, "← Back", 0x2a2a3a, "#cfd2e6", () => this.scene.start("HomeScene"));
    this.add.text(width / 2, 64, "SHOP", {
      fontFamily: "system-ui, sans-serif", fontSize: "22px", color: "#ffffff", fontStyle: "bold",
    }).setOrigin(0.5);

    const s = Storage.load();

    const items = [
      { def: IAP_CATALOG.pass, group: "subscription", subtitle: "+50 gems/day, +50% XP, exclusive frame" },
      { def: IAP_CATALOG.starter, group: "starter", subtitle: "1,000 ◇ + Rare relic + Epic relic + frame", oneTime: true, owned: s.iap.starterPackBought },
      { def: IAP_CATALOG.gem_s, group: "gems", subtitle: "100 ◇" },
      { def: IAP_CATALOG.gem_m, group: "gems", subtitle: "600 ◇  (best value)" },
      { def: IAP_CATALOG.gem_l, group: "gems", subtitle: "1,300 ◇" },
      { def: IAP_CATALOG.gem_xl, group: "gems", subtitle: "7,500 ◇" },
      { def: IAP_CATALOG.gem_xxl, group: "gems", subtitle: "16,000 ◇" },
    ];

    // Policy banner — every purchase removes ads.
    this.add.text(width / 2, 90,
      s.iap.adFreeOwned
        ? "✓ Ad-free unlocked. Thanks for your support."
        : "Every purchase grants permanent ad-free.",
      { fontFamily: "system-ui, sans-serif", fontSize: "12px",
        color: s.iap.adFreeOwned ? "#4ade80" : "#9aa0c0", fontStyle: "italic" }
    ).setOrigin(0.5);

    let y = 116;
    const cardH = 64;
    const cardW = Math.min(560, width - 32);
    for (const item of items) {
      this.makeProductCard(width / 2, y + cardH / 2, cardW, cardH, item);
      y += cardH + 8;
    }

    if (Subscription.isActive()) {
      this.add.text(width / 2, height - 40, "Adventurer's Pass: ACTIVE", {
        fontFamily: "system-ui, sans-serif", fontSize: "13px", color: "#4ade80",
      }).setOrigin(0.5);
    }
  }

  makeProductCard(x, y, w, h, item) {
    const owned = item.oneTime && item.owned;
    const bg = this.add.rectangle(x, y, w, h, 0x1a1a2a, 1)
      .setStrokeStyle(2, owned ? 0x4ade80 : 0x49d6ff, owned ? 1 : 0.6)
      .setInteractive({ useHandCursor: !owned });

    const name = item.def.id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    this.add.text(x - w / 2 + 14, y - 14, name, {
      fontFamily: "system-ui, sans-serif", fontSize: "16px", color: "#ffffff", fontStyle: "bold",
    });
    this.add.text(x - w / 2 + 14, y + 6, item.subtitle, {
      fontFamily: "system-ui, sans-serif", fontSize: "12px", color: "#9aa0c0",
    });

    const priceText = owned ? "OWNED" : item.def.price;
    this.add.text(x + w / 2 - 14, y, priceText, {
      fontFamily: "system-ui, sans-serif", fontSize: "16px",
      color: owned ? "#4ade80" : "#ffd166", fontStyle: "bold",
    }).setOrigin(1, 0.5);

    if (!owned) {
      bg.on("pointerdown", async () => {
        bg.setStrokeStyle(2, 0xffffff, 1);
        const result = await IAP.purchase(item.def.id);
        if (result.success) {
          this.refresh();
        } else {
          this.toast("Purchase failed");
        }
      });
    }
  }

  makeButton(x, y, w, h, label, color, textColor, onClick) {
    const r = this.add.rectangle(x, y, w, h, color, 1)
      .setStrokeStyle(2, 0xffffff, 0.25)
      .setInteractive({ useHandCursor: true });
    this.add.text(x, y, label, {
      fontFamily: "system-ui, sans-serif", fontSize: "14px", color: textColor, fontStyle: "bold",
    }).setOrigin(0.5);
    r.on("pointerdown", () => { r.setFillStyle(Phaser.Display.Color.IntegerToColor(color).darken(15).color); this.time.delayedCall(50, onClick); });
    return r;
  }

  toast(msg) {
    const t = this.add.text(this.scale.width / 2, this.scale.height - 80, msg, {
      fontFamily: "system-ui, sans-serif", fontSize: "14px", color: "#cfd2e6",
      backgroundColor: "rgba(0,0,0,0.6)", padding: { x: 10, y: 6 },
    }).setOrigin(0.5).setAlpha(0).setDepth(400);
    this.tweens.add({ targets: t, alpha: 1, duration: 200, hold: 1300, yoyo: true,
      onComplete: () => t.destroy() });
  }
}
