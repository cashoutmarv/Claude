# Rift *(working title)*

You and your closest friends were watching your favorite movie when a portal
opened in the backyard. You fell in. Now you're in the world of that movie,
your friends are tumbling out of a rift in the sky one by one, and the
night isn't friendly.

Build a camp. Survive the raids. Take expeditions into the caves. Find a
way home — or change the world enough that it becomes home.

> See [DESIGN.md](./DESIGN.md) for the full design doc.
> See [CLAUDE.md](./CLAUDE.md) for engineering conventions.

## Run it locally

No build step.

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

For mobile testing, use Chrome DevTools mobile emulation (Cmd/Ctrl+Shift+M)
and pick an iPhone or Pixel viewport. The virtual joystick activates anywhere
on the left half of the screen.

## Tech

Phaser 3 · vanilla JS ES modules · Capacitor wrap deferred · AdMob /
RevenueCat stubbed until packaging.

## Status

**Phase 0 — Skeleton.** Boot → intro → empty hub with one campfire. No
gacha, no caves, no raids yet. See `CLAUDE.md` for the phase roadmap.
