# Dungeon Drift — Pre-launch Hype Calendar

Working assumption: 8 weeks from "we have something to show" to public launch.
Slide the dates; the *shape* of the campaign is what matters.

## Week-by-week

### T-8 weeks — Existence post
Goal: claim handles, plant a flag, start the audience at zero.
- Reserve identical handles on **X**, **TikTok**, **YouTube**, **Reddit**, **Discord**, **Bluesky**, and the .com if available. Same avatar, same banner.
- Push template `teaser_announce` (X) + `teaser_announce_tiktok` (TikTok). Pin both.
- Stand up Discord with one channel: `#announcements`. Don't open the rest until you have ~20 members.
- Press kit goes live at `/marketing/presskit/`. Email it to 5 mobile-gaming press contacts (just to seed the URL into their inboxes — no ask yet).

### T-7 to T-5 — Devlog rhythm
Goal: prove there is a real game and a real human behind it.
- One short devlog per week. Use template `devlog_weekly_x`.
- Format: 1 GIF, 2 sentences of "what I changed and why," one question to the reader.
- TikTok cadence: 2× per week, 15–30s clips. Use the `feature_spotlight_*` templates.

### T-4 — Monetization-promise post
Goal: differentiate. Most mobile-gaming Reddit threads are "what game has no ads?" — be the answer.
- Push template `monetization_promise` (X) and `reddit_devlog_long` (r/IndieDev).
- Cross-post the Reddit thread to r/gamedev once it has traction.

### T-3 — Influencer outreach
Goal: line up day-one coverage.
- Build a list of 30 mobile-gaming creators (TikTok 10k–500k, YouTube 5k–100k). Avoid the very large channels — they don't reply, and they don't move the needle for indies.
- Send the press-kit URL + one 30s gameplay clip + a one-paragraph pitch. No attachments.
- Offer: early TestFlight build + custom in-game frame named after them.

### T-2 — Pre-registration push
Goal: convert audience into wishlists.
- Set up Google Play pre-registration (free, takes ~24h to approve).
- iOS doesn't have native pre-reg — use TestFlight for super-fans + an email list.
- Push template `preregistration_cta` (X).
- Daily TikTok: countdown clips with `countdown_daily`.

### T-1 — Daily countdown
Goal: stay top-of-feed in the final week.
- One TikTok per day for 7 days, each highlighting a different feature.
- One X post per day, 200–250 chars, with a clip or GIF.
- Day-before AMA on r/iosgaming announced.

### Launch day
- 9am local: `launch_day_x` thread on X (3–5 posts, one per feature pillar).
- 10am: `launch_day_reddit_iosgaming` posts on r/iosgaming and r/AndroidGaming.
- 11am: TikTok with the launch trailer.
- All day: respond to every reply. This is the day where 30 minutes of replies = 1,000 downloads.

### Week 1 post-launch
- Reply to every App Store / Play Store review for the first 7 days.
- Player-highlight TikTok daily (`post_launch_player_highlight`).
- Patch within 72 hours, even if it's just 2 numbers — visible momentum signals investment.

### Ongoing (week 2+)
- Weekly devlog → biweekly featured-banner reveals → monthly content updates.
- `milestone_thanks` post at 1k / 10k / 100k downloads.

## What you should do this week (T-8)

1. **Pick a final game name.** "Dungeon Drift" is the working name — confirm or change it before reserving handles. (App Store will reject duplicates; check first.)
2. **Reserve handles** on the platforms above. ~30 minutes total.
3. **Capture a clean 15s gameplay clip:**
   - On Windows, run the game from `marketing/capture.html?border` (loads the game in a 9:16 frame).
   - Use OBS or Windows Game Bar (Win+G) to record.
   - Trim in CapCut or DaVinci Resolve (free).
4. **Create a Buffer free account** (or Hypefury / Typefully — pick one). Connect X + TikTok + LinkedIn.
   - **Don't connect "auto-engagement" tools.** They get accounts shadowbanned.
5. **Edit `marketing/templates/posts.json`** — replace the `variables` block with your real handle, site, and store URLs. Every template references those variables.
6. **Edit `marketing/presskit/index.html`** — fill in:
   - Real studio location and founding date.
   - Real press contact email.
   - Real social links.
7. **Drop 6 screenshots** into `marketing/assets/screenshots/` as `01.png`–`06.png` (9:16, ~1170×2080 ideal).
8. **Schedule the T-8 teaser** in Buffer for tomorrow morning, 9am your local time. Pin it.

## Hosting

The whole `marketing/` folder is static. The simplest path:

- Enable **GitHub Pages** on this repo (Settings → Pages → branch `claude/roguelike-game-development-vN5yL` → folder `/`).
- Once green, you have:
  - Game: `https://cashoutmarv.github.io/claude/`
  - Press kit: `https://cashoutmarv.github.io/claude/marketing/presskit/`
  - Capture frame: `https://cashoutmarv.github.io/claude/marketing/capture.html`
- You can put the press-kit URL into the bio of every social handle on day one.

## What we are deliberately NOT doing

- **No auto-replies / auto-DMs / auto-follows.** Every major platform throttles or bans these. The growth they buy is fake and doesn't convert.
- **No bot-driven engagement pods.** Same reason.
- **No paid UA before organic baselines exist.** You can't measure ad effectiveness if you don't know your organic floor.
- **No interstitial ads in the game** — see `CLAUDE.md`. The "no ads if you tap no ads" promise is the marketing.
