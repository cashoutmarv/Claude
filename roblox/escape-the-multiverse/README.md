# Escape The Multiverse

A 200-stage Roblox obby across 10 themed worlds. Sister project to the Phaser
roguelike at the repo root; this folder is fully self-contained.

## Build

```sh
aftman install            # rojo, selene, stylua, wally
wally install             # Promise, Signal, Maid into Packages/
rojo build place.project.json -o build/EscapeTheMultiverse.rbxlx
```

Open `build/EscapeTheMultiverse.rbxlx` in Roblox Studio.

## Live edit

```sh
rojo serve default.project.json
```

In Studio: install the Rojo plugin, Connect → `localhost:34872`.

## Lint / format

```sh
selene src/
stylua --check src/
```

## Tests

Pure-logic specs in `tests/` run via TestEZ in Studio or
[lune](https://github.com/lune-org/lune) headless:

```sh
lune run tests/run.lua
```

## Layout

See `docs/architecture.md` for the system map, or the plan file at
`/root/.claude/plans/create-a-200-stage-obby-iterative-otter.md`.
