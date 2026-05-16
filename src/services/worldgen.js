// World synthesizer. Takes the player's intro answers and produces a
// concrete trait stack (biome / architecture / tone / weather / ambient).
// Also generates a default world name; player can rename later.
//
// The synthesis process:
//   1. Sum weighted votes per dial across the three answers.
//   2. For each dial, pick the highest-scoring option.
//   3. Compose the final palette by starting from biome.palette, then
//      blending in tone shifts (warmth/saturation) and ambient sky colors.
//   4. Generate a procedural world name.

import {
  DIALS, BIOMES, ARCHITECTURES, TONES, WEATHERS, AMBIENTS,
  ANSWER_WEIGHTS, SEEKING_EXTRA,
} from "../config/traits.js";

// Sum votes per (dial, optionId).
function tallyVotes({ passion, seeking, family }) {
  const totals = {}; // { dial: { optionId: weight } }
  const apply = (table, key) => {
    if (!key) return;
    const weights = table[key];
    if (!weights) return;
    for (const dial of Object.keys(weights)) {
      totals[dial] = totals[dial] || {};
      for (const optId of Object.keys(weights[dial])) {
        totals[dial][optId] = (totals[dial][optId] || 0) + weights[dial][optId];
      }
    }
  };

  apply(ANSWER_WEIGHTS, passion);
  apply(ANSWER_WEIGHTS, seeking);
  apply(SEEKING_EXTRA,  seeking); // seeking-only extras
  apply(ANSWER_WEIGHTS, family);

  return totals;
}

// Pick the winning option for a given dial.
function winner(dial, totals) {
  const cfg = DIALS[dial];
  const buckets = totals[dial] || {};
  let bestId = cfg.defaultId;
  let bestScore = -1;
  // Iterate in option-defined order so ties resolve deterministically.
  for (const optId of Object.keys(cfg.options)) {
    const score = buckets[optId] || 0;
    if (score > bestScore) {
      bestScore = score;
      bestId = optId;
    }
  }
  return bestId;
}

// Hex color helpers. Tones can shift saturation/brightness slightly.
function shiftHue(color, deltaR, deltaG, deltaB) {
  const r = Math.max(0, Math.min(255, ((color >> 16) & 0xff) + deltaR));
  const g = Math.max(0, Math.min(255, ((color >>  8) & 0xff) + deltaG));
  const b = Math.max(0, Math.min(255, ( color        & 0xff) + deltaB));
  return (r << 16) | (g << 8) | b;
}

function applyTone(palette, toneId) {
  const tone = TONES[toneId];
  if (!tone) return palette;
  const out = { ...palette };
  // Shift accent + groundFar by accentShift (signed).
  if (tone.accentShift) {
    out.accent    = shiftHue(out.accent, tone.accentShift, Math.floor(tone.accentShift * 0.5), -tone.accentShift);
    out.groundFar = shiftHue(out.groundFar, Math.floor(tone.accentShift * 0.3), 0, -Math.floor(tone.accentShift * 0.3));
  }
  return out;
}

// Procedural world-name generator. Picks an adjective from biome/ambient
// and a noun from biome to produce e.g. "Dusklit Meadow", "Auroral Grotto".
const NAME_ADJ_BY_AMBIENT = {
  dawn:    ["Dawnlit", "Morrowed", "First-light"],
  day:     ["Sunlit", "Open", "Wide"],
  dusk:    ["Dusklit", "Embered", "Long-shadowed"],
  night:   ["Starlit", "Hushed", "Mantled"],
  liminal: ["Half-veiled", "Quiet", "Threshold"],
};
const NAME_ADJ_BY_WEATHER = {
  clear:      ["Bright", "Bare"],
  goldenHour: ["Goldwoven", "Honeyed"],
  fog:        ["Veiled", "Soft"],
  drizzle:    ["Rainsworn", "Glassed"],
  aurora:     ["Auroral", "Banded"],
};
const NAME_NOUN_BY_BIOME = {
  meadow:   ["Meadow", "Clearing", "Hollow"],
  forest:   ["Wood", "Thicket", "Glade"],
  ocean:    ["Shore", "Tide", "Cove"],
  desert:   ["Dunes", "Waste", "Reach"],
  mountain: ["Highlands", "Spire", "Crag"],
  volcanic: ["Ashlands", "Caldera", "Ember"],
  sky:      ["Skyborne", "Drift", "Aer"],
  cosmic:   ["Grotto", "Vault", "Astrum"],
};

function generateName(stack, seed) {
  const rand = mulberry(seed);
  const adjPool = [
    ...(NAME_ADJ_BY_AMBIENT[stack.ambient] || []),
    ...(NAME_ADJ_BY_WEATHER[stack.weather] || []),
  ];
  const nounPool = NAME_NOUN_BY_BIOME[stack.biome] || ["World"];
  const adj  = adjPool[Math.floor(rand() * adjPool.length)] || "Quiet";
  const noun = nounPool[Math.floor(rand() * nounPool.length)] || "World";
  return `The ${adj} ${noun}`;
}

// Tiny seeded RNG so name generation is deterministic per (answers + name).
function mulberry(seed) {
  let a = seed >>> 0 || 1;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Compose a world view from an already-resolved stack. Shared by
// synthesizeWorld (which picks the stack first) and rebuildWorld (which
// receives the stack from storage).
function composeView(stack, name) {
  const biome = BIOMES[stack.biome] || BIOMES.meadow;
  const ambient = AMBIENTS[stack.ambient] || AMBIENTS.day;
  const weather = WEATHERS[stack.weather] || WEATHERS.clear;
  const architecture = ARCHITECTURES[stack.architecture] || ARCHITECTURES.cottage;

  let palette = {
    sky:        ambient.skyTop,
    skyBot:     ambient.skyBot,
    groundFar:  biome.palette.groundFar,
    groundNear: biome.palette.groundNear,
    accent:     biome.palette.accent,
    tree:       biome.palette.tree,
    water:      biome.palette.water || 0x4a8aa8,
    path:       0xc6b88a,
    stone:      0x9ea995,
    buildingA:  0xe9d8a6,
    buildingB:  0xb1825a,
    roof:       0x7a4e2b,
    vignette:      ambient.vignette,
    vignetteColor: ambient.vignetteColor,
  };
  palette = applyTone(palette, stack.tone);

  return {
    stack,
    palette,
    name: name || "",
    treeStyle: biome.treeStyle,
    densityTrees: biome.densityTrees,
    architecture,
    weather,
    ambient,
  };
}

// Public: synthesize a full world from intro answers.
export function synthesizeWorld({ passion, seeking, family, name = "" }) {
  const totals = tallyVotes({ passion, seeking, family });
  const stack = {
    biome:        winner("biome", totals),
    architecture: winner("architecture", totals),
    tone:         winner("tone", totals),
    weather:      winner("weather", totals),
    ambient:      winner("ambient", totals),
  };
  const seed = hashString(`${passion}|${seeking}|${family}|${name}`);
  const worldName = generateName(stack, seed);
  return composeView(stack, worldName);
}

// Public: rebuild a world view from a stored stack + persisted name.
export function rebuildWorld(stack, name = "") {
  if (!stack) {
    return composeView({
      biome: "meadow", architecture: "cottage", tone: "neutral",
      weather: "clear", ambient: "day",
    }, name || "The Meadow");
  }
  // If the stored name is empty, regenerate a procedural one from the stack.
  let resolvedName = name;
  if (!resolvedName) {
    const seed = hashString(`${stack.biome}|${stack.architecture}|${stack.weather}|${stack.ambient}`);
    resolvedName = generateName(stack, seed);
  }
  return composeView(stack, resolvedName);
}

// Public: a "human description" of a stack for the intro reveal.
export function describeStack(stack) {
  const w = WEATHERS[stack.weather];
  const a = AMBIENTS[stack.ambient];
  const b = BIOMES[stack.biome];
  const ar = ARCHITECTURES[stack.architecture];
  return `a ${a.id} over ${b.name}, ${w.id === "clear" ? "open sky" : w.id}, ${ar.name} dwellings`;
}
