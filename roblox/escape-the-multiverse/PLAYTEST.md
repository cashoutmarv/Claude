# PLAYTEST.md — Escape The Multiverse manual playtest checklist

This is the human-driven verification pass that runs after the server boots
clean and the pure-logic specs are green. Pair it with **Test → Local Server
(2 players)** in Roblox Studio so you exercise both the single-player and the
race / multiplayer paths.

The runtime smoke checker (`src/server/Diagnostics.lua`) prints
`[ETM Diagnostics] OK: N/N` to the server output if every wiring invariant
holds. **Look for that line first.** Anything below it failing is your
regression.

## 0. Setup

- [ ] `cd roblox/escape-the-multiverse && aftman install` succeeded.
- [ ] `wally install` succeeded (Packages/ populated).
- [ ] Rojo plugin installed in Studio.
- [ ] `rojo serve default.project.json` running on `localhost:34872`.
- [ ] In Studio: Rojo plugin → Connect to localhost:34872 → connection green.
- [ ] Studio: File → Game Settings → Security → **Studio Access to API
      Services** is **enabled** (so DataStore + MarketplaceService + badges
      don't no-op silently).
- [ ] `lune run tests/runner.lua` (or CI from Track 1) passes locally.

## 1. Boot smoke

Start a Studio Play session.

- [ ] Server output shows `[ETM Diagnostics] OK: <N>/<N>` (no failures
      listed). If it logs warnings, fix the listed invariants before
      continuing — every later check assumes the world is wired up.
- [ ] Server output shows `[ETM] Server boot complete.`
- [ ] Server output shows `[ETM ChatCommands] ready (Studio only). ...`
- [ ] Player spawned on the social hub island, not in the void.

## 2. Chat command sanity (Studio only)

Type each in the chat. Each should print to the server output and chirp a
chat bubble above your head.

- [ ] `/diagnose` — replies with the same N/N count as the boot smoke line.
- [ ] `/where` — replies with current world + nearest stage. Walk a few
      stages, run again, value moves.
- [ ] `/give 500` — soft currency increases by 500 (visible on HUD if Track 2
      surfaces it; otherwise verify via `/give` repeated and reading server
      output).
- [ ] `/teleport 5 8` — drops you on **W5S8** (the Abyss secret-jump stage).
      Confirms the index math is `(world, stage)` not `(stage, world)`.
- [ ] `/setworld 10` — drops you on **W10S1** (entry of THE VOID).
- [ ] `/skiponce` — bumps `highestStage` by 1; subsequent `/where` reflects it.

## 3. Per-world transitions

Walk the path stage-to-stage (or `/teleport` to the milestone) and verify the
transition each time.

- [ ] **W1 (Glitch):** stage 1 spawn anchor visible, magenta/cyan palette.
      Reach W1S20 → portal cinematic plays (FOV punch + flash) → arrive on
      W2S1 cleanly.
- [ ] **W2 (Candy):** sticky / bouncy chains feel different from glitch.
      W2S20 → W3S1.
- [ ] **W3 (Temple):** rolling boulders; floor segments crumble after touch.
      W3S20 → W4S1.
- [ ] **W4 (Moon):** low-grav zone behaves (jump arc visibly higher).
      W4S20 → W5S1.
- [ ] **W5 (Abyss):** bubble currents push player perpendicular to path.
      W5S20 → W6S1.
- [ ] **W6 (Kitchen):** blender blades + rolling pins cycle. W6S20 → W7S1.
- [ ] **W7 (Cloud):** drifting clouds tween smoothly; wind gust shoves
      player. W7S20 → W8S1.
- [ ] **W8 (Backrooms):** lights flicker; some platforms only visible while
      lit. W8S20 → W9S1.
- [ ] **W9 (Cyber):** train platforms move; vertical laser fences kill on
      contact. W9S20 → W10S1.
- [ ] **W10 (Void):** parts invisible until `Touched`. W10S20 has the gold
      VIP barrier — see §6.

## 4. Skip gate (every world S15)

- [ ] Walk to `W1S15` → stand near the gold "SKIP →" door → prompt asks for
      gamepass purchase.
- [ ] Decline → nothing happens server-side; `/where` unchanged.
- [ ] Accept stub purchase → server credits stage 16; checkpoint advances.
- [ ] Touching a SKIP door at any other world's S15 shows the same prompt.
      (`/teleport 7 15` is the fastest way to spot-check.)

## 5. Race mode

Use **Test → Local Server (2 players)**.

- [ ] Player A walks to spawn `RacePortal` → server queues them.
- [ ] Player B walks to portal → queue pops; both teleport into the arena
      (offset away from main world).
- [ ] 60s race timer starts; each scoreboard update broadcasts.
- [ ] First to last platform OR most stages at timeout wins; winner gets
      currency + gacha award; both teleported back to spawn after 5s.

## 6. VIP gate (W10S20 finale)

- [ ] As a non-VIP test player: golden barrier blocks you; can't pass.
- [ ] As a VIP-gamepass-owning test player (use the gamepass stub or a
      developer account): barrier ignores collisions; you reach the
      `VIPReward` pad behind it.
- [ ] Diagnostics line confirms `W10S20 has VIPBarrier and VIPReward` is OK.

## 7. Secret room (W5S8)

- [ ] `/teleport 5 8` to the Abyss precision stage.
- [ ] Make the deliberate side-jump → land on the hidden
      `AbyssSecretPlatform` 28 studs to the right of the path.
- [ ] `SecretRoomFound` confetti + badge prompt fires.
- [ ] Diagnostics line confirms `W5S8 has AbyssSecretPlatform` is OK.

## 8. Trails kiosk

- [ ] Walk to TrailKiosk (visible at spawn). 4 colored buttons render with
      labels: Fire, Ice, Rainbow, Glitch.
- [ ] Touch Rainbow → trail attaches to your `HumanoidRootPart` and follows.
- [ ] Touch Glitch → trail color cycles every ~0.15s.
- [ ] Diagnostics line confirms `TrailKiosk with ≥4 TrailButton-tagged
      parts` is OK.

## 9. Death counter

- [ ] Kill yourself repeatedly (jump into a kill brick).
- [ ] BillboardGui above your head shows the session count incrementing.
- [ ] Player B sees Player A's count on Player A's head, and vice versa.

## 10. Gacha + monetization

- [ ] Open the gacha UI → see Standard banner (gold OR gems) and Featured
      (gems only). Published odds visible.
- [ ] Single pull at fixed seed produces an item from the catalog;
      duplicates increment shards.
- [ ] 10-pull always contains ≥1 Rare-or-better.
- [ ] Force pity by spamming pulls until pull 70 → guaranteed Legendary.
- [ ] Profile rejoin: pity counter and ownership persist.
- [ ] Belgium / Netherlands account → premium banner hidden / gold-only
      pulls available.

## 11. Hall of Fame + leaderboard

- [ ] Spawn island leaderboard SurfaceGui populates within 60s of boot
      (placeholder rows pre-completion are fine).
- [ ] Hall of Fame wall: 10 SurfaceGui slot frames render with avatar
      thumbnails after `WorldsCompleted_v1` has data.

---

When every box is checked the build is good for the next playtest pass.
File any failures as new GitHub issues against `claude/multiverse-obby-game-sinqB`.
