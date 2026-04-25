// Tiny localStorage wrapper. On native (Capacitor) this can be swapped for
// the Preferences plugin without changing callers.

const KEY = "dungeondrift.save.v1";

const defaults = {
  bestTimeSec: 0,
  bestKills: 0,
  totalRuns: 0,
  adFreeOwned: false,
};

export const Storage = {
  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return { ...defaults };
      return { ...defaults, ...JSON.parse(raw) };
    } catch {
      return { ...defaults };
    }
  },
  save(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      // ignore quota / private mode
    }
  },
  reset() {
    try { localStorage.removeItem(KEY); } catch {}
  },
};
