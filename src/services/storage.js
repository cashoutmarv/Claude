// Versioned save state. Single source of truth — every service reads/writes
// through this. localStorage now; Capacitor Preferences at wrap-time.
//
// Schema philosophy: only what the current phase needs. Adding a field is
// trivial (DEFAULTS gains a key, deepMerge fills it in on load). Removing
// a field needs a migrate() step.

const KEY = "rift.save.v1";
const VERSION = 1;

const DEFAULTS = () => ({
  version: VERSION,
  player: {
    name: "",
  },
  friends: [
    { slot: 1, name: "", arrived: false },
    { slot: 2, name: "", arrived: false },
    { slot: 3, name: "", arrived: false },
  ],
  world: {
    answers: { passion: null, seeking: null, family: null },
    genre: null,
    chosenAt: 0,
  },
});

function deepMerge(into, from) {
  if (!from || typeof from !== "object") return into;
  for (const k of Object.keys(from)) {
    if (from[k] && typeof from[k] === "object" && !Array.isArray(from[k])) {
      into[k] = deepMerge(
        into[k] && typeof into[k] === "object" ? into[k] : {},
        from[k],
      );
    } else if (into[k] === undefined) {
      into[k] = from[k];
    } else {
      into[k] = from[k];
    }
  }
  return into;
}

function migrate(saved) {
  // No prior versions yet. Future migrations branch on saved.version here.
  return saved;
}

let cache = null;

export const Storage = {
  load() {
    if (cache) return cache;
    let raw;
    try { raw = localStorage.getItem(KEY); } catch { raw = null; }
    let saved = null;
    if (raw) {
      try { saved = JSON.parse(raw); } catch { saved = null; }
    }
    const data = DEFAULTS();
    if (saved) {
      migrate(saved);
      deepMerge(data, saved);
    }
    data.version = VERSION;
    cache = data;
    return cache;
  },

  save() {
    if (!cache) return;
    try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch {}
  },

  reset() {
    cache = null;
    try { localStorage.removeItem(KEY); } catch {}
  },

  mutate(mutator) {
    const data = this.load();
    mutator(data);
    this.save();
    return data;
  },

  // Has the intro been completed? (genre is the last thing the intro writes.)
  hasIntro() {
    return !!this.load().world.genre;
  },
};
