# Monetization

## Game Passes (one-time purchases)

| Key | Use | Suggested R$ |
|---|---|---|
| `VIP` | Access the gold zone past W10S20 + future VIP perks | 499 |
| `SkipW1`..`SkipW10` | Skip stage 15 of that world (frustration gate) | 49–99 |

Configure each pass on create.roblox.com and paste its numeric ID into
`src/shared/Config/Monetization.lua`. `MonetizationService` ignores any pass
whose `id == 0`, so leaving them at 0 is safe — the in-game prompt is just a
no-op until configured.

## Developer Products (consumables)

Hard-currency packs map 1:1 to the Phaser repo's gem packs in
`/home/user/Claude/src/config/economy.js`:

| Key | Hard currency granted | Suggested R$ |
|---|---|---|
| `GemPackS` | 100 | 79 |
| `GemPackM` | 600 | 399 |
| `GemPackL` | 1,300 | 799 |
| `GemPackXL` | 7,500 | 3,999 |
| `GemPackXXL` | 16,000 | 7,999 |
| `GachaSingleHard` | (single roll) | 99 |
| `GachaTenHard` | (10-pull) | 899 |

## Region compliance

Belgium (`BE`) and Netherlands (`NL`) are flagged in `Gacha.RESTRICTED_REGIONS`.
`GachaService` rejects hard-currency rolls from those regions automatically.
Players' regions are stored in `profile.region` (default `"GLOBAL"`).

## Permanent ad-free policy

`Config/Monetization.lua` consumables and gamepasses are the only paid
surfaces. There are no banner ads, interstitials, or rewarded-video
placements anywhere in the project — this matches the Phaser sister project's
"player-initiated ads only" rule.
