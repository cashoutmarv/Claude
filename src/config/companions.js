// Your three best friends from the night of the movie. They fall into the
// world after you do. Which friend is closest (the first to find you in the
// hub) is determined by the player's "seeking" intro answer.

export const COMPANIONS = {
  rin: {
    id: "rin",
    name: "Rin",
    short: "the steady one",
    color: 0x4ade80,  // green
    trait: "Always packs snacks. Reads the situation before reacting.",
    voice: "warm",
  },
  cass: {
    id: "cass",
    name: "Cass",
    short: "the spark",
    color: 0xffd166,  // gold
    trait: "First to laugh, first to leap. Has the worst-best ideas.",
    voice: "bright",
  },
  jules: {
    id: "jules",
    name: "Jules",
    short: "the watcher",
    color: 0xc084fc,  // violet
    trait: "Quiet. Notices everything. Calls things by their real name.",
    voice: "soft",
  },
};

// Map "seeking" intro answer → which friend lands closest to you.
export const SEEKING_TO_FIRST_FRIEND = {
  belonging: "rin",
  freedom:   "cass",
  meaning:   "jules",
  mastery:   "cass",
};

// Map "family" intro answer → emotional tone of the world's plot dialogue.
export const FAMILY_TO_TONE = {
  blood:   "earnest",   // grounded, sincere
  chosen:  "warm",      // bright, found-family vibe
  found:   "wistful",   // melancholy but hopeful
  forged:  "stoic",     // quiet resolve
};

export function getCompanion(id) {
  return COMPANIONS[id] || COMPANIONS.rin;
}
