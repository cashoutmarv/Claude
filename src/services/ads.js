// Ad SDK boundary. Hard rule for this game: every ad call is initiated by
// a player tap. No interstitials, no pop-ups, no auto-launch ads.
//
// In the browser these are no-op stubs that resolve as if a reward was
// granted, so the gameplay flow can be exercised end-to-end. At packaging
// time, swap the stubs to call AdMob / AppLovin via Capacitor plugins.
//
// Daily ad-gem cap: see ECONOMY.dailyAdGemCap. Service callers should
// check Ads.canEarnGemsToday() before showing a "watch ad for gems" button.

import { Storage, utcDayIndex } from "./storage.js";
import { ECONOMY } from "../config/economy.js";

function rolloverIfNeeded(state) {
  const today = utcDayIndex();
  if (state.ads.dailyAdResetDay !== today) {
    state.ads.dailyAdResetDay = today;
    state.ads.dailyAdGemEarnings = 0;
  }
}

export const Ads = {
  // Returns true if showing an ad is currently allowed (e.g. ad-removal IAP
  // hides ad surfaces, but not the rewarded ones — those still grant the
  // reward instantly without playing an ad). This is a UX choice, not a
  // commercial one.
  isAdFreeOwned() { return !!Storage.load().iap.adFreeOwned; },

  // True if the player still has gem-earnings headroom today. Used to
  // gate the "double daily reward" button on the home screen.
  canEarnGemsToday() {
    const s = Storage.load();
    rolloverIfNeeded(s);
    Storage.save();
    return s.ads.dailyAdGemEarnings < ECONOMY.dailyAdGemCap;
  },

  remainingGemsToday() {
    const s = Storage.load();
    rolloverIfNeeded(s);
    Storage.save();
    return Math.max(0, ECONOMY.dailyAdGemCap - s.ads.dailyAdGemEarnings);
  },

  recordGemEarnedFromAd(amount) {
    Storage.mutate((s) => {
      rolloverIfNeeded(s);
      s.ads.dailyAdGemEarnings += amount;
    });
  },

  // Player-initiated rewarded ad. `placement` is just a label for analytics.
  // Returns a promise resolving to true if the user watched to completion.
  // If ad-free is owned, we skip the ad and grant the reward instantly so
  // the surface still functions for paying players.
  showRewarded(placement = "generic") {
    console.info(`[ads] rewarded request: ${placement}`);
    if (this.isAdFreeOwned()) {
      console.info("[ads] ad-free owned, granting reward instantly");
      return Promise.resolve(true);
    }
    return new Promise((resolve) => setTimeout(() => resolve(true), 250));
  },
};
