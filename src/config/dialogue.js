// Plot beats. Each beat is a sequence of dialogue lines triggered by a
// hub-state event (first arrival, after first run, friend found, etc.).
// Lines support {playerName} / {worldName} / {friendName} substitutions.
//
// Beats fire in order; once a beat is shown its id is recorded in
// save.plot.seenBeats so it never replays.

export const BEATS = [
  {
    id: "arrival",
    trigger: "hub_first_enter",
    speaker: null, // narrator
    lines: [
      "Soft light. Bird-call you don't recognize.",
      "You sit up in tall grass. The air smells like the inside of {worldName}.",
      "It's the world from the movie. The one you were watching when the rustling started.",
      "Your friends were just on the couch. Now you can't see them anywhere.",
      "Above you the sky has a faint seam — like a stitch in a sheet — already closing.",
    ],
  },
  {
    id: "first_friend",
    trigger: "first_friend_arrived",
    speaker: "{friendName}",
    lines: [
      "{friendName}: \"…ow. OW. Okay. Okay, I'm okay.\"",
      "{friendName}: \"Wait — is this — are you serious right now.\"",
      "{friendName}: \"This is the {worldName}. From the movie. We're in the movie.\"",
      "{friendName}: \"The other two are still up there. We need to find a way back, but… first, breathe.\"",
    ],
  },
  {
    id: "after_first_run",
    trigger: "post_first_run",
    speaker: null,
    lines: [
      "You come back from the cave with your hands full and your legs shaking.",
      "The seam in the sky hasn't reopened. Of course it hasn't.",
      "Whatever's keeping you here, it isn't going to give the door back for free.",
    ],
  },
  {
    id: "first_raid_warning",
    trigger: "first_raid_imminent",
    speaker: "{friendName}",
    lines: [
      "{friendName}: \"Something's coming. Off the treeline. Lots of somethings.\"",
      "{friendName}: \"This place doesn't want squatters. We hold the clearing or we lose it.\"",
    ],
  },
];

// Lookup beat by trigger id.
export function findBeat(triggerId) {
  return BEATS.find((b) => b.id === triggerId);
}

// Substitute {var} placeholders.
export function fillTemplate(text, vars) {
  return text.replace(/\{(\w+)\}/g, (_m, k) => (vars[k] != null ? vars[k] : `{${k}}`));
}
