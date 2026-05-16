// Trait-stack catalog. Replaces the old "1-of-6 archetypes" system.
//
// The world is no longer a bucket pick. Instead it is a set of independent
// DIALS (biome, architecture, palette, weather, ambient) each chosen from
// its own option list. Intro answers contribute weighted votes to every
// dial; whichever option has the highest score per dial wins. Two players
// who pick the same first answer can still end up in very different worlds
// because their seeking + family answers pull other dials.
//
// Adding a new dial option here = automatic eligibility — no scene code
// needs to change as long as the option supplies the visual fields used
// by HubScene (palette / sprite hint / etc).

// ---------- BIOME — what dominates the ground ----------
export const BIOMES = {
  meadow: {
    id: "meadow",
    name: "meadow",
    palette: { groundFar: 0x84c294, groundNear: 0x6fae7e, accent: 0xf6e3a2, tree: 0x3f7a4a },
    treeStyle: "broadleaf",
    densityTrees: 1.0,
  },
  forest: {
    id: "forest",
    name: "forest",
    palette: { groundFar: 0x5a8b6a, groundNear: 0x426d54, accent: 0xc9d670, tree: 0x2a5a3a },
    treeStyle: "conifer",
    densityTrees: 1.6,
  },
  ocean: {
    id: "ocean",
    name: "shore",
    palette: { groundFar: 0xd4c5a0, groundNear: 0xb89e6a, accent: 0xffe28a, tree: 0x6c8c5e, water: 0x4a8aa8 },
    treeStyle: "palm",
    densityTrees: 0.4,
  },
  desert: {
    id: "desert",
    name: "dunes",
    palette: { groundFar: 0xe6c089, groundNear: 0xd1a368, accent: 0xff9966, tree: 0x9c8a4a },
    treeStyle: "sparse",
    densityTrees: 0.2,
  },
  mountain: {
    id: "mountain",
    name: "highlands",
    palette: { groundFar: 0xa6b6a8, groundNear: 0x7f9482, accent: 0xffffff, tree: 0x4a6a5a },
    treeStyle: "conifer",
    densityTrees: 0.8,
  },
  volcanic: {
    id: "volcanic",
    name: "ashlands",
    palette: { groundFar: 0x6e3a2c, groundNear: 0x85432f, accent: 0xffb066, tree: 0x4a2620 },
    treeStyle: "deadwood",
    densityTrees: 0.5,
  },
  sky: {
    id: "sky",
    name: "skyborne",
    palette: { groundFar: 0xa2b6cc, groundNear: 0x90a8c2, accent: 0xffd4a8, tree: 0x4a7f78 },
    treeStyle: "broadleaf",
    densityTrees: 0.6,
  },
  cosmic: {
    id: "cosmic",
    name: "starlit grotto",
    palette: { groundFar: 0x2a2d52, groundNear: 0x3b3f6e, accent: 0xc7d6ff, tree: 0x5a3d8a },
    treeStyle: "crystal",
    densityTrees: 0.7,
  },
};

// ---------- ARCHITECTURE — building shapes ----------
export const ARCHITECTURES = {
  cottage: {
    id: "cottage", name: "cottage",
    bodyW: 132, bodyH: 84, roof: "gable", door: "rect",
  },
  pagoda: {
    id: "pagoda", name: "pagoda",
    bodyW: 120, bodyH: 92, roof: "tiered", door: "arch",
  },
  tent: {
    id: "tent", name: "tent",
    bodyW: 110, bodyH: 70, roof: "cone", door: "flap",
  },
  ruin: {
    id: "ruin", name: "ruin",
    bodyW: 130, bodyH: 64, roof: "broken", door: "open",
  },
  treehouse: {
    id: "treehouse", name: "treehouse",
    bodyW: 110, bodyH: 80, roof: "leaf", door: "round",
  },
  stilt: {
    id: "stilt", name: "stilt-house",
    bodyW: 116, bodyH: 78, roof: "thatch", door: "ladder",
  },
};

// ---------- PALETTE TONE — overall warmth/saturation ----------
export const TONES = {
  warm:    { id: "warm",    skyShift:  0.06, accentShift: 0x10 },
  cool:    { id: "cool",    skyShift: -0.06, accentShift: -0x10 },
  vivid:   { id: "vivid",   skyShift:  0.0,  accentShift:  0x20 },
  muted:   { id: "muted",   skyShift:  0.0,  accentShift: -0x20 },
  neutral: { id: "neutral", skyShift:  0.0,  accentShift:  0x00 },
};

// ---------- WEATHER — overlay effect ----------
export const WEATHERS = {
  clear:       { id: "clear",       cloudCount: 4,  particleKind: "none",   tintColor: null,     tintAlpha: 0 },
  goldenHour:  { id: "goldenHour",  cloudCount: 6,  particleKind: "motes",  tintColor: 0xffb066, tintAlpha: 0.10 },
  fog:         { id: "fog",         cloudCount: 10, particleKind: "fog",    tintColor: 0xc8d4d8, tintAlpha: 0.18 },
  drizzle:     { id: "drizzle",     cloudCount: 8,  particleKind: "rain",   tintColor: 0x4a5d72, tintAlpha: 0.10 },
  aurora:      { id: "aurora",      cloudCount: 3,  particleKind: "aurora", tintColor: 0x6aa0ff, tintAlpha: 0.08 },
};

// ---------- AMBIENT — time of day ----------
export const AMBIENTS = {
  dawn:   { id: "dawn",   skyTop: 0xf8c79a, skyBot: 0xb6dec3, vignette: 0.12, vignetteColor: 0xe0a070 },
  day:    { id: "day",    skyTop: 0xb6dec3, skyBot: 0xc8e2d2, vignette: 0.04, vignetteColor: 0x000000 },
  dusk:   { id: "dusk",   skyTop: 0xb888a8, skyBot: 0xf3a878, vignette: 0.18, vignetteColor: 0x6a3060 },
  night:  { id: "night",  skyTop: 0x141a30, skyBot: 0x2a3052, vignette: 0.32, vignetteColor: 0x05060f },
  liminal:{ id: "liminal",skyTop: 0x83a4b8, skyBot: 0xc0c8a8, vignette: 0.16, vignetteColor: 0x4a5560 },
};

// ---------- ANSWER → DIAL WEIGHTS ----------
//
// Each intro answer contributes weighted votes to one or more dials. The
// world synthesis function (worldgen.js) sums votes per dial and picks the
// highest-scoring option. Ties broken by the order keys appear here.
//
// Weights are integers (0..3). Higher = stronger pull.
export const ANSWER_WEIGHTS = {
  // PASSION
  adventure:  { biome: { sky: 2, ocean: 1 }, weather: { clear: 2 },        tone: { vivid: 1 } },
  creation:   { biome: { volcanic: 2, forest: 1 }, weather: { fog: 1 },    tone: { warm: 2 }, ambient: { dusk: 1 } },
  connection: { biome: { meadow: 2, forest: 1 }, weather: { goldenHour: 2 }, tone: { warm: 2 }, ambient: { dawn: 1 } },
  knowledge:  { biome: { cosmic: 2 }, weather: { aurora: 2 }, tone: { cool: 2 }, ambient: { night: 2 } },
  freedom:    { biome: { ocean: 2, sky: 1 }, weather: { clear: 1 }, tone: { cool: 1 } },
  courage:    { biome: { mountain: 2, volcanic: 1 }, weather: { fog: 1 }, tone: { neutral: 1 } },

  // SEEKING (answer ids that overlap with passion stay distinct because we
  // index by question key in the synthesizer; the duplicated keys here are
  // intentional and refer to the *seeking* answer specifically).
  belonging:  { architecture: { cottage: 2, treehouse: 1 }, tone: { warm: 1 }, ambient: { dawn: 1 } },
  // "freedom" already declared above; it works as a passion *or* seeking
  // answer, with weights merged. We add the seeking-flavoured dials below
  // by checking key existence in the synthesizer instead of duplicating.
  meaning:    { architecture: { ruin: 2, pagoda: 1 }, ambient: { dusk: 1 }, biome: { mountain: 1 } },
  mastery:    { architecture: { pagoda: 2, cottage: 1 }, tone: { neutral: 1 } },

  // FAMILY
  blood:      { ambient: { dawn: 2 }, tone: { warm: 1 } },
  chosen:     { weather: { goldenHour: 2 }, tone: { warm: 2 }, architecture: { cottage: 1 } },
  found:      { weather: { drizzle: 1, fog: 1 }, ambient: { dusk: 2 }, architecture: { ruin: 1 } },
  forged:     { tone: { muted: 1 }, ambient: { night: 1 }, architecture: { stilt: 1 } },
};

// Seeking-only extra weights (kept separate to avoid the freedom-name clash
// between passion-freedom and seeking-freedom).
export const SEEKING_EXTRA = {
  freedom:    { architecture: { tent: 2, stilt: 1 }, weather: { clear: 1 } },
};

export const DIALS = {
  biome:        { options: BIOMES,        defaultId: "meadow" },
  architecture: { options: ARCHITECTURES, defaultId: "cottage" },
  tone:         { options: TONES,         defaultId: "neutral" },
  weather:      { options: WEATHERS,      defaultId: "clear" },
  ambient:      { options: AMBIENTS,      defaultId: "day" },
};
