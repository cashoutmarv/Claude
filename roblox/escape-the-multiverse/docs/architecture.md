# Architecture

## Boot order

`src/server/init.server.lua` requires every service in this order:

1. `AntiExploitService`
2. `DataService`
3. `CurrencyService`
4. `CheckpointService`
5. `PlayerService`
6. `MonetizationService`
7. `ProgressionService`
8. `LeaderboardService`
9. `BadgeService`
10. `SkipGateService`
11. `PortalService`
12. `VIPService`
13. `TrailService`
14. `DeathTrackerService`
15. `GachaService`
16. `RaceService`
17. `SpawnHubService`
18. `WorldBuilder` (loads all 200 stages)

Each service exposes `:Init(deps)` then `:Start()`. The deps table is passed to
every service so cross-service calls go through stable references rather than
re-requiring at use sites.

## Cross-boundary traffic

All client↔server traffic flows through `ReplicatedStorage.Shared.Net`, which
lazy-creates RemoteEvents from `Config/RemoteNames`. Server pre-creates them
during boot via `Net.bootstrapServer()` so clients never race.

## Stage layout

200 stages live under `Workspace.Worlds.W{N}.S{stage}` after WorldBuilder runs.
Each stage has:

- `StartAnchor` — green pad at the stage entrance
- a row of `Platform` parts (length, width, gap from `Difficulty.lua`)
- optional kill bricks beside platforms
- per-world gimmick decorations (DisappearingPlatform, BubbleCurrent, etc.)
- `EndAnchor` — gold pad at the exit
- `EndPart` — invisible sensor tagged `StageReached` with `World` + `Stage`
  attributes; ProgressionService listens for Touched
- `SkipDoor` (only on stage 15) tagged `SkipDoor` for the world's gamepass

World-transition portals are spawned by `PortalService` between W{N}_S20 and
W{N+1}_S01 after `WorldCompleted` fires.

## Spawn island

Procedural at boot via `SpawnHubService`:

- `Workspace.Spawn.MainSpawn` — the SpawnLocation
- `Workspace.Spawn.LeaderboardSign` — SurfaceGui top-10
- `Workspace.HallOfFame.Wall` — SurfaceGui with 10 avatar headshot slots
- `Workspace.TrailKiosk` — 4 trail buttons tagged `TrailButton`
- `Workspace.Spawn.RacePortal` — tagged `RacePortal`

## Anti-exploit

- All progression credit is server-authoritative: HRP-distance + monotonicity
  + per-player rate limit before a stage credit is granted.
- All purchases route through `MonetizationService` which is the sole owner
  of `MarketplaceService.ProcessReceipt` and gamepass prompt callbacks.
- Stage-15 skips only credit on a confirmed `PromptGamePassPurchaseFinished`
  with `purchased == true`; client cannot self-grant.
- VIP is enforced via PhysicsService CollisionGroups, not client trust.
- All Net handlers funnel through `Modules/Validate` (type checks +
  per-player rate limits).

## Reused Phaser references

The Roblox gacha mirrors `/home/user/Claude/src/config/banners.js` exactly
(rates 65/21/10/3.5/0.5, soft pity 50, hard pity 70, selector tokens
30/80/150). Tests in `tests/PityCalculator.spec.lua` and `tests/Gacha.spec.lua`
pin those numbers.

`Config/Monetization.lua` Robux dev product hard-currency amounts mirror
`/home/user/Claude/src/config/economy.js` gem pack sizes (100/600/1300/7500/16000).
