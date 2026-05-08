# Stage authoring

## Procedural stages (160 of 200)

The 160 non-milestone stages are emitted from `src/shared/Config/StageTable.lua`
at config-load time. Their gameplay parameters come from
`src/shared/Config/Difficulty.lua` (jump distance, platform width, kill-brick
density, etc.) — they're tuned by editing those formulas, not the table.

To re-tune the global difficulty curve:

1. Edit `Difficulty.lua`. All formulas are pure functions of `(world, stage)`.
2. Run `tests/Difficulty.spec.lua` to verify monotonicity, min platform
   width, and the W1S1 / W10S20 sentinels.
3. Playtest world-by-world.

## Hand-crafted milestone stages (40 of 200)

Stages 1, 10, 15, 20 of each world are flagged `handcrafted = true`. The
builder calls `BaseBuilder.tryHandcrafted` which looks for an `.rbxmx` model
named `W{N}_S{NN}` under `Workspace.MilestoneStages` (placed there by Studio).
If the asset is missing, the builder falls back to procedural — so the game
keeps working while you build them out.

To add a milestone:

1. In Studio, build the stage as a Model with `StartAnchor` and `EndAnchor`
   parts at the entry/exit.
2. Tag the EndPart with `StageReached` and set its `World` + `Stage`
   attributes.
3. Save it as `W{world}_S{stage}.rbxmx` in `src/workspace/MilestoneStages/`.
4. Restart Rojo; the row in `StageTable` will pick it up automatically.

## Adding a new gimmick

1. Create `src/server/World/Gimmicks/<Name>.lua` exporting an `apply` function.
2. Use it from a `WorldBuilder` (see how `BlenderBlade` is used in
   `KitchenWorldBuilder`).
3. If the gimmick is reusable across worlds, list it in the world's
   `signature` table in `Config/Worlds.lua` so it auto-flows into procedural
   stages.
