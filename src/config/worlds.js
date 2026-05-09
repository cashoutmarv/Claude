// World archetypes — the "favorite movie world" the player falls into.
// The KH-style intro picks one based on the player's passion answer.
// Each archetype defines a BotW-minimalist palette + flavor text. The
// HubScene reads the active palette to tint ground/sky/buildings.

export const WORLDS = {
  whispering_woods: {
    id: "whispering_woods",
    name: "The Whispering Woods",
    movie: "an old fairy-tale forest you watched on rainy afternoons",
    palette: {
      sky:        0xb6dec3,  // soft sage
      groundFar:  0x84c294,
      groundNear: 0x6fae7e,
      path:       0xc6b88a,
      stone:      0x9ea995,
      water:      0x6fb1c4,
      accent:     0xf6e3a2,  // golden light
      tree:       0x3f7a4a,
      buildingA:  0xe9d8a6,
      buildingB:  0xb1825a,
      roof:       0x7a4e2b,
    },
    intro: "Sunlight fingers through tall canopy. Moss covers a path inward.",
  },

  sunscar_dunes: {
    id: "sunscar_dunes",
    name: "The Sunscar Dunes",
    movie: "a sun-bleached desert epic",
    palette: {
      sky:        0xf3d6a7,
      groundFar:  0xe6c089,
      groundNear: 0xd1a368,
      path:       0xb8864c,
      stone:      0xc7a574,
      water:      0x88c3c0,
      accent:     0xff9966,
      tree:       0x9c8a4a,
      buildingA:  0xe8caa2,
      buildingB:  0xa97640,
      roof:       0x6b3f1f,
    },
    intro: "Heat shimmers off pale dunes. Distant ruins watch the horizon.",
  },

  drowning_tide: {
    id: "drowning_tide",
    name: "The Drowning Tide",
    movie: "a coastal adventure with ships and storms",
    palette: {
      sky:        0xa6d3e3,
      groundFar:  0x7fb7a8,
      groundNear: 0x68a293,
      path:       0xd9cda0,
      stone:      0x8aa2a8,
      water:      0x4a8aa8,
      accent:     0xffe28a,
      tree:       0x346f5f,
      buildingA:  0xd8cfb0,
      buildingB:  0x6f8b94,
      roof:       0x36556b,
    },
    intro: "Salt wind, the cry of gulls, the slow breathing of the sea.",
  },

  skyborne_isles: {
    id: "skyborne_isles",
    name: "The Skyborne Isles",
    movie: "a flying-island fantasy you rewatch every year",
    palette: {
      sky:        0xc9d8f2,
      groundFar:  0xa2b6cc,
      groundNear: 0x90a8c2,
      path:       0xd8cfa6,
      stone:      0xa0a6b4,
      water:      0x7fb9d6,
      accent:     0xffd4a8,
      tree:       0x4a7f78,
      buildingA:  0xeae0c2,
      buildingB:  0x8f7e5e,
      roof:       0xb04a4a,
    },
    intro: "Cloud ribbons drift below. The horizon is a sea of sky.",
  },

  emberveil: {
    id: "emberveil",
    name: "The Emberveil",
    movie: "a smouldering volcanic saga",
    palette: {
      sky:        0xc99a7a,
      groundFar:  0x6e3a2c,
      groundNear: 0x85432f,
      path:       0x3a221a,
      stone:      0x4a3528,
      water:      0xff6644,
      accent:     0xffb066,
      tree:       0x4a2620,
      buildingA:  0x7a4a36,
      buildingB:  0x4f2a20,
      roof:       0x2a1610,
    },
    intro: "Ash falls like soft snow. Veins of fire pulse beneath the ground.",
  },

  starlit_grotto: {
    id: "starlit_grotto",
    name: "The Starlit Grotto",
    movie: "a quiet, haunting tale of caves and cosmos",
    palette: {
      sky:        0x1c1e3d,
      groundFar:  0x2a2d52,
      groundNear: 0x3b3f6e,
      path:       0x6a6dab,
      stone:      0x4a4d7a,
      water:      0x9aa6ff,
      accent:     0xc7d6ff,
      tree:       0x5a3d8a,
      buildingA:  0x4a4f80,
      buildingB:  0x2c2e55,
      roof:       0x8a7adf,
    },
    intro: "Crystals glow blue along the walls. Above, a sky of underground stars.",
  },
};

// Map "passion" intro answer → world archetype.
export const PASSION_TO_WORLD = {
  adventure:  "skyborne_isles",
  creation:   "emberveil",
  connection: "whispering_woods",
  knowledge:  "starlit_grotto",
  freedom:    "drowning_tide",
  courage:    "sunscar_dunes",
};

export function getWorld(id) {
  return WORLDS[id] || WORLDS.whispering_woods;
}
