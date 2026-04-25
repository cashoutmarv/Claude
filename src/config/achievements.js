// First-time milestone rewards. Each fires exactly once per save and grants
// gems on the first time a condition is hit. Tuned so a brand-new player
// accumulates ~1500-2000 gems over their first ~10-20 runs (enough for two
// 10-pulls), then natural drip slows and IAP becomes the next progression
// step.
//
// Triggers are matched against named events emitted by gameplay code:
//   "kill", "level_up", "boss_kill", "death", "run_end",
//   "gacha_pull", "gacha_rare", "gacha_epic", "gacha_legendary",
//   "login_streak", "revive_used"
//
// Each achievement has:
//   id, name, desc, gems (reward), trigger { event, threshold }

export const ACHIEVEMENTS = [
  // First-action onboarding burst.
  { id: "first_kill",         name: "First Blood",       desc: "Kill an enemy",                          gems: 5,   trigger: { event: "kill", threshold: 1 } },
  { id: "kills_100",          name: "Hundred Slain",     desc: "Defeat 100 enemies (lifetime)",          gems: 25,  trigger: { event: "kill", threshold: 100 } },
  { id: "kills_1000",         name: "Thousand Slain",    desc: "Defeat 1,000 enemies (lifetime)",        gems: 100, trigger: { event: "kill", threshold: 1000 } },

  // Run survival ladder.
  { id: "survive_60",         name: "First Minute",      desc: "Survive 1 minute in a run",              gems: 25,  trigger: { event: "survive_seconds", threshold: 60 } },
  { id: "survive_180",        name: "Steady Hand",       desc: "Survive 3 minutes in a run",             gems: 50,  trigger: { event: "survive_seconds", threshold: 180 } },
  { id: "survive_300",        name: "Endurance",         desc: "Survive 5 minutes in a run",             gems: 100, trigger: { event: "survive_seconds", threshold: 300 } },
  { id: "survive_600",        name: "Iron Will",         desc: "Survive 10 minutes in a run",            gems: 200, trigger: { event: "survive_seconds", threshold: 600 } },

  // Leveling.
  { id: "level_5",            name: "Apprentice",        desc: "Reach level 5 in a run",                 gems: 25,  trigger: { event: "level_up", threshold: 5 } },
  { id: "level_10",           name: "Adept",             desc: "Reach level 10 in a run",                gems: 50,  trigger: { event: "level_up", threshold: 10 } },
  { id: "level_20",           name: "Master",            desc: "Reach level 20 in a run",                gems: 150, trigger: { event: "level_up", threshold: 20 } },

  // Bosses.
  { id: "first_boss",         name: "Giant Slayer",      desc: "Defeat a boss",                          gems: 100, trigger: { event: "boss_kill", threshold: 1 } },
  { id: "bosses_5",           name: "Boss Hunter",       desc: "Defeat 5 bosses (lifetime)",             gems: 100, trigger: { event: "boss_kill", threshold: 5 } },

  // Run lifecycle / consolation.
  { id: "first_death",        name: "Welcome to the Drift", desc: "Die for the first time",             gems: 25,  trigger: { event: "death", threshold: 1 } },
  { id: "first_revive",       name: "Second Chance",     desc: "Use a revive",                           gems: 25,  trigger: { event: "revive_used", threshold: 1 } },
  { id: "runs_5",             name: "Getting the Hang",  desc: "Complete 5 runs",                        gems: 50,  trigger: { event: "run_end", threshold: 5 } },
  { id: "runs_25",            name: "Drifter",           desc: "Complete 25 runs",                       gems: 100, trigger: { event: "run_end", threshold: 25 } },
  { id: "runs_100",           name: "Dungeon Veteran",   desc: "Complete 100 runs",                      gems: 250, trigger: { event: "run_end", threshold: 100 } },

  // Gacha.
  { id: "first_pull",         name: "Roll the Dice",     desc: "Make your first gacha pull",             gems: 50,  trigger: { event: "gacha_pull", threshold: 1 } },
  { id: "first_rare",         name: "Lucky Find",        desc: "Pull a Rare item",                       gems: 25,  trigger: { event: "gacha_rare", threshold: 1 } },
  { id: "first_epic",         name: "Treasure",          desc: "Pull an Epic item",                      gems: 50,  trigger: { event: "gacha_epic", threshold: 1 } },
  { id: "first_legendary",    name: "Mythic Pull",       desc: "Pull a Legendary item",                  gems: 200, trigger: { event: "gacha_legendary", threshold: 1 } },
];
