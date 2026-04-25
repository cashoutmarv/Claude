// IAP boundary. Browser stub for now; swap to RevenueCat (Capacitor) at
// packaging time.
//
// Successful purchases:
//   - credit gems for consumable gem packs
//   - flip entitlements for non-consumables (remove_ads, starter_pack)
//   - call subscription.activate() for the subscription
//   - award VIP points (1 per USD of price)

import { Storage } from "./storage.js";
import { addGems } from "./currency.js";
import { grant } from "./inventory.js";
import { VIP } from "./vip.js";
import { Subscription } from "./subscription.js";
import { IAP_CATALOG } from "../config/economy.js";

// Convert "$4.99" / "$4.99/mo" to a number for VIP point calculation.
function priceUsd(priceStr) {
  const m = String(priceStr).match(/\$([\d.]+)/);
  return m ? parseFloat(m[1]) : 0;
}

export const IAP = {
  catalog() { return IAP_CATALOG; },

  async purchase(productId) {
    console.info(`[iap] purchase request: ${productId}`);
    const product = IAP_CATALOG[productId] || Object.values(IAP_CATALOG).find((p) => p.id === productId);
    if (!product) return { success: false, reason: "unknown_product" };

    // Browser stub: instantly succeed.
    await new Promise((r) => setTimeout(r, 200));

    // Award VIP points based on real money spent (subscriptions = each
    // billing cycle adds points; v1 awards once on activation).
    const usd = priceUsd(product.price);
    if (usd > 0) VIP.addPoints(Math.round(usd));

    // Apply effects.
    if (product.id === "remove_ads") {
      Storage.mutate((s) => { s.iap.adFreeOwned = true; });
    } else if (product.id === "starter_pack") {
      Storage.mutate((s) => { s.iap.starterPackBought = true; });
      addGems(product.gems, "starter_pack");
      // Grant a Rare relic — pick the first Rare in the catalog.
      grant("hardy_amulet");
    } else if (product.id === "adv_pass") {
      Subscription.activate();
    } else if (product.gems) {
      addGems(product.gems, product.id);
    }

    return { success: true, productId: product.id };
  },

  async restore() {
    console.info("[iap] restore request (stub)");
    return { restored: [] };
  },
};
