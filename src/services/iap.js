// IAP boundary. Browser stub for now; swap to RevenueCat (Capacitor) at
// packaging.

export const PRODUCTS = {
  remove_ads: { id: "remove_ads", price: "$3.99", type: "non_consumable" },
  starter_pack: { id: "starter_pack", price: "$1.99", type: "non_consumable" },
};

export const IAP = {
  async purchase(productId) {
    console.info(`[iap] purchase request: ${productId}`);
    // Browser stub: instantly "succeed".
    return { success: true, productId };
  },
  async restore() {
    console.info("[iap] restore request");
    return { restored: [] };
  },
};
