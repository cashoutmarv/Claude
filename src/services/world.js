// World/plot helper. Reads/writes the intro choices, looks up the active
// archetype palette, and tracks plot beat progression.

import { Storage } from "./storage.js";
import {
  WORLDS, getWorld, PASSION_TO_WORLD,
} from "../config/worlds.js";
import {
  COMPANIONS, getCompanion,
  SEEKING_TO_FIRST_FRIEND, FAMILY_TO_TONE,
} from "../config/companions.js";

export const World = {
  // Has the KH-style intro been completed?
  hasIntro() {
    return !!Storage.load().world.archetype;
  },

  // Apply intro answers → derive world archetype + first friend + tone.
  applyIntroAnswers({ passion, seeking, family, name }) {
    const archetypeId = PASSION_TO_WORLD[passion] || "whispering_woods";
    const friendId    = SEEKING_TO_FIRST_FRIEND[seeking] || "rin";
    const tone        = FAMILY_TO_TONE[family] || "warm";
    Storage.mutate((s) => {
      s.world.archetype   = archetypeId;
      s.world.firstFriend = friendId;
      s.world.tone        = tone;
      s.world.answers     = { passion, seeking, family };
      s.world.chosenAt    = Date.now();
      if (name && name.trim().length > 0) {
        s.player.name = name.trim().slice(0, 16);
      }
    });
  },

  // Active world definition (palette + name).
  current() {
    return getWorld(Storage.load().world.archetype);
  },

  // Active starting companion.
  firstFriend() {
    return getCompanion(Storage.load().world.firstFriend);
  },

  // Player display name.
  playerName() {
    return Storage.load().player.name || "Traveler";
  },

  // Plot beats.
  hasSeenBeat(beatId) {
    return Storage.load().plot.seenBeats.includes(beatId);
  },
  markBeatSeen(beatId) {
    Storage.mutate((s) => {
      if (!s.plot.seenBeats.includes(beatId)) s.plot.seenBeats.push(beatId);
    });
  },

  // Has the player at least one friend present in the hub?
  hasFriend(id) {
    return Storage.load().plot.friendsFound.includes(id);
  },
  addFriend(id) {
    Storage.mutate((s) => {
      if (!s.plot.friendsFound.includes(id)) s.plot.friendsFound.push(id);
    });
  },

  // Substitution variables for dialogue templates.
  templateVars() {
    const friend = this.firstFriend();
    const world  = this.current();
    return {
      playerName: this.playerName(),
      worldName:  world.name,
      friendName: friend.name,
    };
  },
};
