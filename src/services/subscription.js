// Adventurer's Pass subscription service. In v1 this is purely
// client-tracked — at packaging we hand entitlement queries off to
// RevenueCat.
//
// Daily gem grant: claimable once per UTC day while active.

import { Storage, utcDayIndex } from "./storage.js";
import { ADVENTURERS_PASS } from "../config/subscription.js";
import { addGems } from "./currency.js";

const listeners = new Set();
export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit() { for (const fn of listeners) try { fn(); } catch (e) { console.error(e); } }

export const Subscription = {
  isActive() { return !!Storage.load().subscription.active; },

  // Called by iap.js after a successful subscription purchase.
  activate() {
    Storage.mutate((s) => {
      s.subscription.active = true;
      s.subscription.sinceTs = Date.now();
    });
    emit();
  },

  // Cancellation is reflected by RevenueCat at packaging; for v1 we expose
  // a manual deactivator for testing.
  deactivate() {
    Storage.mutate((s) => { s.subscription.active = false; });
    emit();
  },

  // Claim today's gem grant if active and not yet claimed.
  // Returns the number of gems claimed (0 if nothing to claim).
  claimDaily() {
    if (!this.isActive()) return 0;
    const today = utcDayIndex();
    const s = Storage.load();
    if (s.subscription.lastClaimTs >= today) return 0;
    const grant = ADVENTURERS_PASS.benefits.gemsPerDay;
    Storage.mutate((st) => { st.subscription.lastClaimTs = today; });
    addGems(grant, "adv_pass daily");
    emit();
    return grant;
  },

  applyToStats(stats) {
    if (!this.isActive()) return stats;
    stats.xpMul *= ADVENTURERS_PASS.benefits.xpMul;
    return stats;
  },
};
