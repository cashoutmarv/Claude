# Dungeon Drift

A browser + mobile roguelike survivor (auto-shooter / "bullet heaven") built
with Phaser 3. First title in a planned portfolio of small mobile games
designed for passive App Store / Google Play income.

> See [CLAUDE.md](./CLAUDE.md) for the full studio strategy, genre research,
> and monetization plan.

## Run it locally

No build step. Just serve the folder:

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

Or any static file server. Works on desktop (WASD / arrows) and mobile
(virtual joystick).

## Gameplay

- Move with WASD / arrows / on-screen joystick. Weapons fire automatically.
- Kill enemies, pick up XP gems, level up.
- On level up, choose 1 of 3 random upgrades.
- Survive as long as you can. Bosses appear over time.
- Permadeath. Run again.

## Status

Early playable prototype. Core loop, leveling, and upgrades work. Art is
placeholder. Native packaging (Capacitor) and real ad / IAP SDKs not yet
integrated — see `src/services/` for stubs.

## Tech

Phaser 3 · vanilla JS ES modules · Capacitor (planned) · AdMob + RevenueCat
(planned, stubbed).
