// Ad SDK boundary. In the browser these are no-op stubs that resolve as if a
// reward was granted, so the gameplay flow can be exercised end-to-end. At
// packaging time, swap the implementations to call AdMob / AppLovin via
// Capacitor plugins.

let interstitialCounter = 0;

export const Ads = {
  // Returns a promise that resolves true if the user watched the ad to
  // completion (and therefore earned the reward).
  showRewarded(placement = "generic") {
    console.info(`[ads] rewarded request: ${placement}`);
    // Browser stub: pretend we showed an ad.
    return new Promise((resolve) => {
      setTimeout(() => resolve(true), 250);
    });
  },

  // Interstitial — fire-and-forget. Call between runs, not mid-run.
  maybeShowInterstitial() {
    interstitialCounter += 1;
    if (interstitialCounter % 3 !== 0) return;
    console.info("[ads] interstitial shown (stub)");
  },
};
