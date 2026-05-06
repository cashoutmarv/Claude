# Playtest Checklist

Run through this every iteration before calling a build done.
Check each item on your phone at `https://cashoutmarv.github.io/Claude/`

---

## 1. Boot & Home

- [ ] Game loads without console errors
- [ ] Currency bar shows correct Gold + Gems
- [ ] Daily login reward triggers (first visit of the day)
- [ ] All nav buttons respond: Play, Gacha, Shop, Inventory, VIP

---

## 2. Core Run Loop

- [ ] Tapping PLAY starts a run without freezing
- [ ] Player spawns and weapons auto-fire at the nearest enemy
- [ ] Joystick tracks thumb correctly (no offset, no dead zone issues)
- [ ] WASD / arrow keys work on desktop
- [ ] Enemies spawn in waves and advance toward player
- [ ] Killing enemies drops XP gems
- [ ] Walking over XP gems collects them; magnet range feels right
- [ ] XP bar fills; level-up modal appears at threshold
- [ ] Picking an upgrade applies it immediately (visible stat or new weapon)
- [ ] Boss spawns around the 2-minute mark; visually distinct from grunts
- [ ] Run ends on death; Game Over screen appears

---

## 3. Drift Mechanic

- [ ] Drift triggers on sharp joystick reversal while moving fast
- [ ] Slide lasts ~350ms in the original direction
- [ ] I-frames active during slide (enemies pass through without damage)
- [ ] Stable Pony effect fires: cyan ring expands, nearby enemies take damage
- [ ] Skid trail renders during drift
- [ ] HUD DRIFT text: cyan (ready) → yellow (active) → dim grey (cooldown)
- [ ] Cooldown expires and DRIFT returns to cyan
- [ ] Drift does NOT trigger on slow movement or small joystick nudges

---

## 4. Game Over & Revive

- [ ] Run summary shows time survived, kills, level reached
- [ ] "Watch ad to revive" button appears (stub — button present, no real ad)
- [ ] "Spend 50 gems" revive button appears and deducts gems if tapped
- [ ] Confirming revive respawns player at same position with partial HP
- [ ] "End Run" returns to Home correctly
- [ ] Gold earned in run is credited to wallet after game over

---

## 5. Meta — Gacha

- [ ] Banner screen loads with correct pull costs (gold + gems)
- [ ] Single pull animates and shows result card
- [ ] 10-pull shows all 10 results
- [ ] Pity counter increments (visible in banner or dev console)
- [ ] Duplicate item converts to shards (not a second copy)
- [ ] Selector token balance increments by 1 per pull

---

## 6. Meta — Inventory

- [ ] Owned characters / weapons / relics display correctly
- [ ] Equipping a relic fills one of the 3 slots
- [ ] Equipped relic stat bonus is reflected in run (check damage / HP numbers)
- [ ] Shard count shown on items that have dupes

---

## 7. Meta — Shop

- [ ] Gem pack buttons display correct prices
- [ ] Tapping a pack shows stub confirmation (no real charge)
- [ ] Adventurer's Pass button present and tappable

---

## 8. Feel & Polish

- [ ] Frame rate stays smooth during large enemy waves (no stutter)
- [ ] Touch input feels responsive — no perceptible lag on joystick
- [ ] Screen does not scroll or bounce on iOS Safari (overscroll locked)
- [ ] No UI elements clipped off screen on 9:16 and 19.5:9 aspect ratios
- [ ] Audio placeholder: no JS errors from missing sound files

---

## 9. Known Rough Edges (track here, fix when prioritized)

- Procedural shapes are placeholder — sprite atlases coming in task #3
- Remaining 29 mounts use generic `pulse` drift until individually designed
- Ad / IAP / subscription calls are all stubs — no real SDK wired yet
- No sound effects or music yet

---

## How to file feedback

After a playtest session, note which items failed and any "felt bad" moments
that aren't on the list. Drop them in the chat and we'll triage + fix before
the next push.
