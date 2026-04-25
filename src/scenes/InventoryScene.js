// Inventory — minimal v1 stub. Shows owned characters and relics, lets the
// player equip a character + 3 relics. Item leveling UI is deferred.

import { CurrencyBar } from "../ui/CurrencyBar.js";
import { installAchievementToast } from "../ui/AchievementToast.js";
import { listOwned, getEquipped, equipCharacter, equipRelic } from "../services/inventory.js";
import { lookupItem, RELICS } from "../config/items.js";
import { TIERS } from "../config/economy.js";

export class InventoryScene extends Phaser.Scene {
  constructor() { super("InventoryScene"); }

  create() {
    this.cameras.main.setBackgroundColor("#0b0b14");
    new CurrencyBar(this);
    installAchievementToast(this);
    this.render();
  }

  // Equip changes restart the scene so we never leak stale game objects
  // across renders. State of truth lives in storage.
  refresh() { this.scene.restart(); }

  render() {
    const { width, height } = this.scale;
    this.makeButton(60, 64, 80, 32, "← Back", 0x2a2a3a, "#cfd2e6", () => this.scene.start("HomeScene"));
    this.add.text(width / 2, 64, "INVENTORY", {
      fontFamily: "system-ui, sans-serif", fontSize: "22px", color: "#ffffff", fontStyle: "bold",
    }).setOrigin(0.5);

    const eq = getEquipped();

    // Equipped panel.
    this.add.text(width / 2, 110, "EQUIPPED", {
      fontFamily: "system-ui, sans-serif", fontSize: "12px", color: "#7a8099", fontStyle: "bold",
    }).setOrigin(0.5);

    const charDef = lookupItem(eq.character)?.def;
    this.add.text(width / 2, 132, `Character: ${charDef?.name || "—"}`, {
      fontFamily: "system-ui, sans-serif", fontSize: "16px", color: "#49d6ff", fontStyle: "bold",
    }).setOrigin(0.5);

    const relicNames = eq.relics.map((id) => id ? (lookupItem(id)?.def?.name || "—") : "(empty)");
    this.add.text(width / 2, 154,
      `Relics: ${relicNames.join("  ·  ")}`,
      { fontFamily: "system-ui, sans-serif", fontSize: "13px", color: "#cfd2e6" }
    ).setOrigin(0.5);

    // Owned characters.
    let y = 190;
    this.add.text(20, y, "CHARACTERS", {
      fontFamily: "system-ui, sans-serif", fontSize: "12px", color: "#7a8099", fontStyle: "bold",
    });
    y += 22;
    const chars = listOwned("character");
    if (chars.length === 0) {
      this.add.text(20, y, "(none — pull on the Gacha banner)", {
        fontFamily: "system-ui, sans-serif", fontSize: "13px", color: "#7a8099",
      });
      y += 24;
    }
    for (const c of chars) {
      const def = lookupItem(c.id).def;
      const tier = TIERS[def.tier];
      const r = this.add.rectangle(width / 2, y, width - 32, 38, 0x1a1a2a)
        .setStrokeStyle(2, tier.color, eq.character === c.id ? 1 : 0.5)
        .setInteractive({ useHandCursor: true });
      this.add.text(20, y - 6, def.name, {
        fontFamily: "system-ui, sans-serif", fontSize: "14px", color: "#ffffff", fontStyle: "bold",
      });
      this.add.text(20, y + 8, def.desc, {
        fontFamily: "system-ui, sans-serif", fontSize: "11px", color: "#9aa0c0",
      });
      this.add.text(width - 32, y, eq.character === c.id ? "Equipped" : "Equip", {
        fontFamily: "system-ui, sans-serif", fontSize: "12px",
        color: eq.character === c.id ? "#4ade80" : "#ffd166", fontStyle: "bold",
      }).setOrigin(1, 0.5);
      r.on("pointerdown", () => {
        if (equipCharacter(c.id)) this.refresh();
      });
      y += 44;
    }

    // Owned relics.
    y += 12;
    this.add.text(20, y, "RELICS", {
      fontFamily: "system-ui, sans-serif", fontSize: "12px", color: "#7a8099", fontStyle: "bold",
    });
    y += 22;
    const relics = listOwned("relic");
    if (relics.length === 0) {
      this.add.text(20, y, "(none — pull on the Gacha banner)", {
        fontFamily: "system-ui, sans-serif", fontSize: "13px", color: "#7a8099",
      });
    }
    for (const rel of relics) {
      const def = RELICS[rel.id];
      if (!def) continue;
      const tier = TIERS[def.tier];
      const equippedSlot = eq.relics.indexOf(rel.id);
      const isEquipped = equippedSlot !== -1;
      const r = this.add.rectangle(width / 2, y, width - 32, 38, 0x1a1a2a)
        .setStrokeStyle(2, tier.color, isEquipped ? 1 : 0.5)
        .setInteractive({ useHandCursor: true });
      this.add.text(20, y - 6, def.name, {
        fontFamily: "system-ui, sans-serif", fontSize: "14px", color: "#ffffff", fontStyle: "bold",
      });
      this.add.text(20, y + 8, def.desc, {
        fontFamily: "system-ui, sans-serif", fontSize: "11px", color: "#9aa0c0",
      });
      this.add.text(width - 32, y, isEquipped ? `Slot ${equippedSlot + 1}` : "Equip", {
        fontFamily: "system-ui, sans-serif", fontSize: "12px",
        color: isEquipped ? "#4ade80" : "#ffd166", fontStyle: "bold",
      }).setOrigin(1, 0.5);
      r.on("pointerdown", () => this.handleRelicTap(rel.id));
      y += 44;
    }
  }

  handleRelicTap(relicId) {
    const eq = getEquipped();
    const idx = eq.relics.indexOf(relicId);
    if (idx !== -1) {
      // Unequip.
      equipRelic(idx, null);
    } else {
      // Equip in first empty slot, else slot 0.
      const empty = eq.relics.findIndex((s) => !s);
      const slot = empty === -1 ? 0 : empty;
      equipRelic(slot, relicId);
    }
    this.refresh();
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
}
