// World/plot helper. Reads/writes the intro choices, synthesizes the world
// trait stack from those choices, and tracks plot beat progression.
//
// The catalog of dials lives in config/traits.js. The synthesis function
// lives in services/worldgen.js. This module is the thin facade other
// scenes call into.

import { Storage } from "./storage.js";
import { synthesizeWorld, rebuildWorld } from "./worldgen.js";
import {
  COMPANIONS, getCompanion,
  SEEKING_TO_FIRST_FRIEND, FAMILY_TO_TONE,
} from "../config/companions.js";

export const World = {
  // Has the KH-style intro been completed?
  hasIntro() {
    return !!Storage.load().world.stack;
  },

  // Apply intro answers → synthesize trait stack, derive friend + tone.
  applyIntroAnswers({ passion, seeking, family, name, worldName }) {
    const synth = synthesizeWorld({ passion, seeking, family, name });
    const friendId = SEEKING_TO_FIRST_FRIEND[seeking] || "rin";
    const tone     = FAMILY_TO_TONE[family] || "warm";
    Storage.mutate((s) => {
      s.world.stack       = synth.stack;
      s.world.worldName   = (worldName && worldName.trim()) || synth.name;
      s.world.firstFriend = friendId;
      s.world.tone        = tone;
      s.world.answers     = { passion, seeking, family };
      s.world.chosenAt    = Date.now();
      // Clear legacy archetype so future reads only see the new stack.
      s.world.archetype   = null;
      if (name && name.trim().length > 0) {
        s.player.name = name.trim().slice(0, 16);
      }
    });
  },

  // Active world view — fully composed palette + stack + flavor fields.
  current() {
    const s = Storage.load();
    return rebuildWorld(s.world.stack, s.world.worldName);
  },

  // Active starting companion.
  firstFriend() {
    return getCompanion(Storage.load().world.firstFriend);
  },

  // Player display name.
  playerName() {
    return Storage.load().player.name || "Traveler";
  },

  // Rename the active world (bonfire affordance).
  renameWorld(newName) {
    const trimmed = (newName || "").trim().slice(0, 32);
    if (!trimmed) return;
    Storage.mutate((s) => { s.world.worldName = trimmed; });
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
