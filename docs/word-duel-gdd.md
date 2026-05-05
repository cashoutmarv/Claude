# Word Duel — Game Design Document

**Version:** 1.0  
**Date:** 2026-05-05  
**Status:** Draft  

---

## Table of Contents

1. [Overview](#1-overview)
2. [Core Game Mechanics](#2-core-game-mechanics)
3. [Scoring System](#3-scoring-system)
4. [Round & Match Structure](#4-round--match-structure)
5. [UI Flow](#5-ui-flow)
6. [Matchmaking Flow](#6-matchmaking-flow)
7. [Revenue Model](#7-revenue-model)
8. [Fairness Measures](#8-fairness-measures)
9. [Anti-Cheat & Security](#9-anti-cheat--security)
10. [Legal & Regulatory Compliance](#10-legal--regulatory-compliance)
11. [Technical Architecture Notes](#11-technical-architecture-notes)
12. [Open Questions & Post-Launch Roadmap](#12-open-questions--post-launch-roadmap)

---

## 1. Overview

**Word Duel** is a synchronous 1v1 skill-based word game played for real money. Both players receive the **exact same 4×4 letter grid** simultaneously. Within two 30-second rounds (with a fresh grid each round), each player races to find as many valid words as possible. The player who accumulates the most total points across both rounds wins. No hidden information, no random power-ups, no luck — the better vocabulary and faster pattern recognition wins every time.

### 1.1 Design Pillars

| Pillar | Description |
|---|---|
| **Pure skill** | Both players share the same board; no element of chance differentiates them. |
| **Fast sessions** | A full match takes under 2 minutes. Playable during any micro-break. |
| **Transparent rake** | A flat 10% fee is shown at entry. No hidden spreads or variable odds. |
| **Ethical monetization** | Cosmetics and convenience only; nothing that improves word-finding ability. |
| **Legal defensibility** | The game is structured as a skill contest, not gambling, under prevailing US skill-game statutes. |

---

## 2. Core Game Mechanics

### 2.1 Letter Grid

The game uses a **4×4 grid of 16 letter tiles** (Boggle-style). Letter selection follows **weighted frequency distribution** rather than uniform random draw, ensuring every generated board contains a rich vocabulary of valid words.

**Letter frequency weights (approximate):**

| Group | Letters | Relative Weight |
|---|---|---|
| High-frequency | E, T, A, O, I, N, S, R | 3× |
| Mid-frequency | H, L, D, C, U, M, F, P, G, W, Y, B | 1.5× |
| Low-frequency | V, K, J, X, Q, Z | 0.5× |
| Q/U pairing | Q is always placed adjacent to a U tile | Special rule |

**Grid validation:** Every generated grid is validated against the game lexicon before being sent to clients. A grid is accepted only if it contains ≥ 30 distinct valid words of length ≥ 3. Grids that fail this threshold are regenerated server-side before the round begins. This validation happens during the pre-round countdown, invisible to players.

### 2.2 Word Formation Rules

Word formation follows **path-adjacency rules** (identical to Boggle):

1. A word is formed by tracing a connected path across the grid.
2. Each tile may be used **at most once per word**.
3. Two tiles are adjacent if they share an edge or a corner (8-directional neighbors).
4. The path may curve and reverse direction, but cannot revisit a tile.
5. Words must be ≥ 3 letters long.
6. All words are validated against the **TWL06 (Tournament Word List)** lexicon — the same dictionary used in competitive North American Scrabble, chosen for legal defensibility and familiarity.

**Input method (mobile-first):**
- Players swipe across tiles to trace a word path; the tile highlights as the finger passes over it.
- Lifting the finger submits the word.
- A quick "shake" gesture or a clearly labeled ✕ button cancels the current trace without submitting.
- Keyboard input is supported on desktop (type letters, press Enter).

### 2.3 Duplicate Words

- Each valid word may be scored **once per round** per player (submitting the same word twice earns 0 on the second submission).
- Both players independently scoring the same word is allowed and **expected** — there is no "word stealing" mechanic. If both players find "STONE", both score it. This keeps the game fully symmetric.

### 2.4 Invalid Word Feedback

- Invalid submissions flash red and play a short error pulse; no score change.
- A counter in the corner tracks invalid attempts (visible only to the player themselves).
- Excessive invalid attempts do not penalize the player but feed into anti-bot detection signals.

---

## 3. Scoring System

### 3.1 Base Score Formula

```
word_score = word_length²
```

| Word Length | Points |
|---|---|
| 3 | 9 |
| 4 | 16 |
| 5 | 25 |
| 6 | 36 |
| 7 | 49 |
| 8 | 64 |
| 9+ | length² |

This formula strongly rewards longer words: finding a single 7-letter word (49 pts) is worth more than finding five 3-letter words (45 pts). This creates genuine strategic depth — players must weigh the risk of hunting a long word against the guaranteed yield of shorter ones.

### 3.2 Match Total

```
match_score = round_1_score + round_2_score
```

The player with the higher `match_score` after two rounds wins. There are no bonus multipliers, no power-ups, and no hidden scoring — both players can calculate the real-time score gap exactly.

### 3.3 Tie Resolution

If both players finish with identical `match_score`:

- The match is declared a **draw**.
- Both players receive a **full refund** of their entry fee.
- The rake (10%) is **not collected** on draws.
- Each player's ELO rating shifts by a small draw-delta (defined in §6.2) rather than a win/loss delta.

**Rationale:** Full refund on draw is the player-friendliest outcome and eliminates any incentive to intentionally tie.

---

## 4. Round & Match Structure

### 4.1 Timeline

```
T-0:00   Match found; both players confirmed
T-0:05   Grid #1 generated and validated server-side
T+0:00   Pre-round countdown (3-2-1-GO) shown simultaneously to both players
T+0:03   Round 1 begins — 30-second timer starts
T+0:33   Round 1 ends; input locked; "Round 1 Summary" overlay shown (5 sec)
T+0:38   Grid #2 generated and validated server-side
T+0:43   Pre-round countdown (3-2-1-GO)
T+0:46   Round 2 begins — 30-second timer starts
T+1:16   Round 2 ends; input locked
T+1:16   Post-match results screen
```

**Total match window:** ~76 seconds of active play, ~2 minutes wall-clock.

### 4.2 Clock Synchronization

Both players run off the **server-authoritative clock**, not their device clock.

- The server broadcasts a signed `round_start` event with a Unix millisecond timestamp.
- Clients display a countdown derived from `(round_end_ts - server_now_ts)`.
- Words submitted after `round_end_ts` are rejected server-side regardless of what the client shows.
- The server accounts for measured round-trip latency (RTT) at session start; if a player's RTT is > 200 ms, the server adjusts their effective submission window by `RTT/2` ms to equalize reaction time.

### 4.3 Round Summary (5-second overlay)

Between rounds, a brief overlay shows:

- Player's own round score (e.g., "You: 187 pts")
- Opponent's round score (hidden until the overlay fades, then revealed simultaneously)
- Running total match score
- "Best word" found by each player in that round (length only; spelling revealed at match end to prevent copying)

**Why hide opponent words mid-match:** Showing opponent words during the 5-second gap would let players copy-type them at round start, rewarding reaction speed over genuine vocabulary. Words are fully revealed at match end for review.

### 4.4 Disconnection Handling

- If a player disconnects mid-round, they have **30 seconds** to reconnect.
- During reconnect window, their already-submitted words are preserved.
- If they do not reconnect within 30 seconds, the opponent wins by **default** and receives the full prize minus rake.
- If the disconnecting player is ahead on points at the time of disconnect, no partial prize is awarded — the opponent wins. This eliminates a "rage quit while winning" exploit.
- Repeated disconnect-forfeits (≥ 3 in 30 days) trigger a review flag.

---

## 5. UI Flow

### 5.1 Home / Lobby Screen

```
┌──────────────────────────────────────┐
│  [PRO badge if subscribed]  WORD DUEL│
│                                      │
│  Wallet: $12.50   Play Money: 450 🪙 │
│                                      │
│  ┌────────────────────────────────┐  │
│  │   PLAY FOR REAL MONEY          │  │
│  │   Choose your entry fee  ▼     │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │   PRACTICE (play money only)   │  │
│  └────────────────────────────────┘  │
│                                      │
│  Leaderboard  |  History  |  Profile │
└──────────────────────────────────────┘
```

**Wallet display:** Real-money balance and play-money balance (🪙 tokens) are always visible so players know their standing before entering a match.

### 5.2 Match Entry Screen

Reached by tapping "PLAY FOR REAL MONEY":

```
┌──────────────────────────────────────┐
│  SELECT ENTRY FEE                    │
│                                      │
│  [ $0.50 ] [ $1.00 ] [ $2.50 ]      │
│  [ $5.00 ] [ $10.00] [ $25.00]      │
│                                      │
│  Entry: $5.00                        │
│  Prize pool: $9.00  (rake: $1.00)    │
│  ──────────────────────────────────  │
│  Your balance: $12.50  ✓             │
│                                      │
│  [        FIND MATCH        ]        │
│                                      │
│  ⓘ  10% fee on wins. Ties = refund. │
└──────────────────────────────────────┘
```

**Key UX principles:**
- The rake is shown as a dollar amount on the same screen, not buried in a ToS link.
- Prize pool (net of rake) is shown before confirming.
- "Ties = refund" is stated explicitly.
- Players cannot enter if their balance is insufficient — the button disables and shows "Add funds."

### 5.3 Matchmaking / Queue Screen

```
┌──────────────────────────────────────┐
│                                      │
│         Finding opponent...          │
│                                      │
│         Entry: $5.00                 │
│         Skill range: ±150 ELO        │
│         Queue time: 0:12             │
│                                      │
│         [       CANCEL       ]       │
│                                      │
└──────────────────────────────────────┘
```

- Entry fee is escrowed immediately on entering the queue (held in trust, not debited until match confirmation).
- Cancel returns the escrowed amount instantly.
- Queue time and expanding skill range are displayed openly.

### 5.4 Pre-Game Countdown

```
┌──────────────────────────────────────┐
│  vs.  [Opponent Name]  |  ELO: 1340  │
│                                      │
│         Round 1 of 2                 │
│                                      │
│               3...                   │
│                                      │
│  (Grid loads behind countdown)       │
└──────────────────────────────────────┘
```

Grid tiles are visible but blurred/covered during countdown to prevent any start-reaction advantage from pre-scanning.

### 5.5 In-Game Screen

```
┌──────────────────────────────────────┐
│  YOU: 0 pts          OPP: ▓▓▓ (hidden)│
│  Round 1                    ⏱ 0:28   │
│                                      │
│  ┌──┬──┬──┬──┐                       │
│  │ S│ T│ O│ N│                       │
│  ├──┼──┼──┼──┤                       │
│  │ A│ R│ E│ L│                       │
│  ├──┼──┼──┼──┤                       │
│  │ I│ N│ G│ D│                       │
│  ├──┼──┼──┼──┤                       │
│  │ U│ M│ P│ E│                       │
│  └──┴──┴──┴──┘                       │
│                                      │
│  Current: S-T-O-N-E  (5 letters)     │
│                                      │
│  Words found: 4   Invalid: 1         │
└──────────────────────────────────────┘
```

**Design notes:**
- Opponent's live score is hidden (shown as a redacted block) to prevent pacing off the opponent rather than thinking independently.
- Own score is shown live so the player tracks their own performance.
- Word history is hidden until match end (prevents memorizing opponent's list mid-match via a disconnect-reconnect).
- The grid tiles scale to fill the screen on any device; tiles are large enough for accurate swiping on a 4.7" screen.

### 5.6 Round 1 Summary (5-second overlay)

```
┌──────────────────────────────────────┐
│          ROUND 1 COMPLETE            │
│                                      │
│  You:        187 pts  (12 words)     │
│  Opponent:   214 pts  (14 words)     │
│                                      │
│  Match total so far:                 │
│  You: 187  |  Opp: 214              │
│                                      │
│         Round 2 starts in 3...       │
└──────────────────────────────────────┘
```

Opponent score is revealed here for the first time.

### 5.7 Post-Match Results Screen

```
┌──────────────────────────────────────┐
│           MATCH RESULT               │
│                                      │
│  ★ YOU WIN ★   (or YOU LOSE / DRAW) │
│                                      │
│         YOU        |    OPPONENT     │
│  Rd 1:  187 pts   |   214 pts       │
│  Rd 2:  231 pts   |   198 pts       │
│  Total: 418 pts   |   412 pts       │
│                                      │
│  Prize:  +$9.00                      │
│  (or:  -$5.00  /  $0.00 on draw)    │
│                                      │
│  ─────────────────────────────────── │
│  YOUR WORDS          OPP WORDS       │
│  STONE (25)  ←→   STONE (25)        │
│  RING  (16)         TONER (25)       │
│  ...                ...              │
│                                      │
│  Words only you found:  STORING ★   │
│  Words only opp found:  GROINS       │
│                                      │
│  [  REMATCH  ]   [  NEW MATCH  ]    │
└──────────────────────────────────────┘
```

**Transparency features:**
- Both word lists are shown in full after the match — the game has nothing to hide.
- "Words only you found" / "Words only opponent found" surfaces missed vocabulary, which is a learning moment that retains players.
- Unique words found by the player are highlighted with a ★ to reward discovery.

### 5.8 Profile / Stats Screen

Tracks: win/loss/draw record, average score per round, longest word found, win rate by entry tier, ELO history chart, badge collection (cosmetic).

---

## 6. Matchmaking Flow

### 6.1 Entry Tiers

All real-money matches use one fixed entry fee per match. There is no cross-tier matching — a $1.00 player never matches against a $25.00 player.

| Tier | Entry | Prize (net of rake) | Rake |
|---|---|---|---|
| Penny | $0.50 | $0.90 | $0.10 |
| Dollar | $1.00 | $1.80 | $0.20 |
| Fiver | $2.50 | $4.50 | $0.50 |
| Ten | $5.00 | $9.00 | $1.00 |
| Twenty | $10.00 | $18.00 | $2.00 |
| Fifty | $25.00 | $45.00 | $5.00 |

**Practice tier:** Uses play-money tokens (🪙); no real stakes; no rake.

### 6.2 Skill Rating (ELO)

Each player maintains a single ELO rating, initialized at **1200**. ELO is global across all entry tiers (skill is skill, regardless of stakes).

```
K = 32   (standard K-factor for new/intermediate players)
K = 16   (for players with >100 matches)

Expected score:  E = 1 / (1 + 10^((opponent_elo - player_elo) / 400))
ELO delta (win):  ΔR = K × (1 - E)
ELO delta (loss): ΔR = K × (0 - E)
ELO delta (draw): ΔR = K × (0.5 - E)
```

ELO is computed and stored server-side; the client displays it but never computes it. Rating updates immediately after match result.

### 6.3 Queue Logic

1. Player selects entry tier → enters queue.
2. Server escrows entry fee immediately.
3. Match is sought within ±75 ELO of the player's rating.
4. If no match found in **15 seconds**, the window expands to ±150 ELO.
5. If no match found in **30 seconds**, window expands to ±300 ELO.
6. If no match found in **60 seconds**, the player is offered:
   - Wait longer (unlimited)
   - Enter an AI practice match at that tier (play money, not real money — AI is disclosed)
   - Cancel and get escrow returned

**Anti-smurf measure:** Players with < 20 career matches are bucketed separately until their provisional rating stabilizes. They only match each other during calibration.

### 6.4 Escrow & Payout Flow

```
Player A enters queue:  $5.00 escrowed from wallet → "pending" state
Player B enters queue:  $5.00 escrowed from wallet → "pending" state

Match confirmed:
  → Both $5.00 amounts moved to match escrow contract ($10.00 total)

Match completes (A wins):
  → $9.00 released to Player A's wallet  (entry × 2 × 0.90)
  → $1.00 retained as platform rake
  → Player B's $5.00 was consumed

Match completes (draw):
  → $5.00 returned to Player A's wallet
  → $5.00 returned to Player B's wallet
  → $0.00 rake retained
```

Escrow movements are logged with cryptographic event hashes, stored for dispute resolution.

---

## 7. Revenue Model

### 7.1 Tournament Rake (10%)

The core business model. Platform retains 10% of the winning side's prize pool on every non-draw match.

**Revenue projection (illustrative):**

| Daily matches | Avg entry | Gross entry | Rake revenue |
|---|---|---|---|
| 500 | $3.00 | $1,500 | $150/day |
| 5,000 | $3.00 | $15,000 | $1,500/day |
| 50,000 | $3.00 | $150,000 | $15,000/day |

Rake revenue scales linearly with volume. A healthy playerbase of 10,000 daily active players at moderate stakes generates $500k–$1M+ annually.

### 7.2 Pro Pass ($4.99/month)

An optional subscription sold as a convenience and cosmetics tier. **Does not affect gameplay ability in any way.**

**Pro Pass benefits:**

| Benefit | Description |
|---|---|
| Ad-free | No rewarded-ad prompts shown to Pro subscribers. Play-money income is replaced with a daily direct grant (see below). |
| Pro badge | Cosmetic gold "PRO" badge visible on profile and in the pre-game screen. |
| Exclusive board skins | Alternate tile art themes (e.g., Dark Mode, Neon, Parchment). |
| Word history export | Download your all-time word history as CSV (for personal study). |
| Priority queue | Slight matchmaking priority to reduce queue times at low-volume hours. |
| Daily token grant | 200 🪙 play-money tokens per day, replacing ad income. |

**Subscription mechanics:**
- Managed via RevenueCat (same integration used in the roguelike game). Handles App Store / Play Store billing, trial management, and entitlement sync.
- Cancel-anytime; benefits expire at period end, not immediately.
- Monthly only (no annual to reduce refund complexity).

**Pro Pass — anti-pay-to-win audit:**

Every Pro benefit is either cosmetic, convenience, or a practice-game currency grant. None of the following are Pro-gated: access to any entry tier, ELO matchmaking, grid generation, word list, scoring, or any in-game mechanic. A free player who is a better word-finder beats a Pro subscriber every time.

### 7.3 Rewarded Ads — Play Money Grants

Free players can watch short rewarded video ads to earn 🪙 play-money tokens. These tokens are **only usable in the practice tier** (no-stakes matches); they cannot be converted to real money or used in real-money entry tiers.

**Ad surfaces (all optional, player-initiated):**

| Placement | Grant |
|---|---|
| "Earn tokens" button on Home screen | +50 🪙 per ad (max 5/day) |
| Post-match "Watch to double token earnings" | Double practice winnings for that match |
| Daily free chest (timer) | +100 🪙 per chest; ad shortens timer |

**Ad rules:**
- No interstitials between matches.
- No banners.
- Pro subscribers never see ad prompts; they receive daily direct grants instead.
- Ad grant cap: 350 🪙/day from ads for free players.

**Play-money economy:**

| Action | Token flow |
|---|---|
| Practice match entry | −100 🪙 |
| Practice match win | +180 🪙 (net +80) |
| Practice match draw | +100 🪙 (full return) |
| Practice match loss | +0 🪙 |
| Daily ad cap earnings | +350 🪙 |
| Pro daily grant | +200 🪙 |

Tokens have no cash value and cannot be gifted or traded.

### 7.4 Revenue Mix Summary

| Stream | Monetizes | Coercion level |
|---|---|---|
| Rake (10%) | Real-money match plays | Zero — players chose to enter |
| Pro Pass | Cosmetics + convenience | Zero — free tier is fully functional |
| Rewarded ads | Play-money patience | Zero — skippable, optional, capped |

There is no "remove ads" IAP because the ad tier is already voluntary. There are no gem packs, gacha, battle passes, or time-limited exclusive content.

---

## 8. Fairness Measures

### 8.1 Symmetric Board (Zero Informational Advantage)

The most important fairness guarantee: **both players receive the identical 4×4 grid** at the exact same millisecond. Grid state is determined server-side and broadcast simultaneously. There is no position advantage (it's not a board game with sides), no element of the grid is player-specific, and both players operate under the same 30-second time constraint. The outcome is determined entirely by vocabulary, pattern recognition speed, and strategy.

### 8.2 Clock Fairness (Latency Equalization)

As described in §4.2, submission windows are equalized for network latency measured at session start. A player on a 150ms connection and one on a 10ms connection are given equivalently fair windows. The maximum latency equalization is capped at 300ms RTT (players beyond this threshold are flagged for review).

### 8.3 Lexicon Transparency

The word list (TWL06) is publicly documented and well-known in the competitive word-game community. Players can study it, and the app surfaces a "word study" section for this purpose. There are no secret word inclusions or exclusions.

**Consistency:** The exact same server-side lexicon binary is used for all validation. No platform-specific or locale-specific word list variation. A word that scores in one match scores in all matches.

### 8.4 No Rating Manipulation Protection

- Players cannot choose a specific opponent; matchmaking is automated.
- Intentional self-loss (to manipulate ELO) is detectable from word-submission patterns (e.g., zero words submitted, repeated invalid submissions). Players with suspicious patterns are reviewed.
- Friends cannot be matched in real-money games (they can in practice games). This prevents collusion where one player throws to let a friend win real money.

### 8.5 Responsible Gaming Controls

- **Daily deposit limit:** Players set a maximum daily deposit cap at registration; raising it requires 24-hour cooling period.
- **Session loss limit:** Optional. If enabled, the app locks real-money entry after reaching a player-defined loss amount in one session.
- **Play history:** Full match history with P&L is always available in the app.
- **Self-exclusion:** One-tap self-exclusion for 24h, 7 days, 30 days, or permanent (permanent requires support ticket).
- **Reality check:** After every 30 real-money matches in a session, a modal shows time played and net P&L.
- **Minor prevention:** Age verification (ID or credit-card verification) required before first real-money deposit.

### 8.6 Result Auditability

Every match produces a signed result log containing:

```json
{
  "match_id": "uuid",
  "grid_seed": "sha256_hash",
  "grid": [["S","T","O","N"],["A","R","E","L"],["I","N","G","D"],["U","M","P","E"]],
  "player_a": {
    "user_id": "...",
    "submissions": [
      { "word": "STONE", "path": [[0,0],[0,1],[0,2],[0,3],[1,2]], "ts_ms": 1234567890, "valid": true }
    ],
    "score": 418
  },
  "player_b": { ... },
  "winner": "player_a",
  "rake_usd": 1.00,
  "server_version": "1.4.2"
}
```

This log is stored and available to the player on request. Players may dispute a result by submitting the match_id within 48 hours.

---

## 9. Anti-Cheat & Security

### 9.1 Threat Model

| Threat | Attack | Defense |
|---|---|---|
| **Dictionary bot** | Automated client that submits all valid words in < 1 second | Server-side submission rate limiting; human timing analysis; mouse/touch event validation |
| **Word list pre-compute** | Player pre-downloads TWL06, uses external tool to solve grid before round | Pre-compute window is < 3 seconds (server doesn't send grid until countdown); time window too short for meaningful advantage vs. a skilled human |
| **Collusion** | Two accounts controlled by one player | Friends cannot match in money games; same-device account detection; cross-account ELO anomaly analysis |
| **Replay / packet replay** | Replay valid submission packets from a previous match | Match sessions use per-match nonce in submission packets; replayed packets rejected |
| **Client-side score tampering** | Modify client to report higher score | Score is computed **entirely server-side** from the submission log; client score display is informational only |
| **Grid interception** | Intercept the grid broadcast to pre-solve it | Grid is encrypted in transit (TLS); the grid is sent at countdown T-3 seconds, not before |

### 9.2 Server-Side Authority

The server is the sole arbiter of:

- Whether a word path is valid adjacency
- Whether a word is in the lexicon
- What score a word earns
- When the round ends
- Who wins

The client renders and provides input UX only. A compromised or modified client cannot change the outcome of a match.

### 9.3 Timing Analysis (Bot Detection)

Human word-finding has recognizable timing signatures:
- Words are submitted irregularly (bursts and pauses)
- Swipe gesture duration correlates with word length
- Inter-submission delays follow human reaction distributions

Submissions flagged as non-human (e.g., uniform inter-submission intervals, all submissions within 50ms of each other, no invalid attempts across 50+ matches) are queued for manual review. Confirmed bots are banned and winnings from affected matches are refunded to opponents.

### 9.4 Financial Security

- Real-money wallet is backend-only; client never holds or computes balances.
- Withdrawals require re-authentication (biometric or PIN).
- Large withdrawals (> $500/day) trigger a manual review hold.
- PCI-DSS compliance for payment card handling (via Stripe or equivalent).

---

## 10. Legal & Regulatory Compliance

### 10.1 Skill Game Qualification

Word Duel is designed to qualify as a **skill contest**, not gambling, under US law. The primary legal test is the "predominance of skill" standard applied in most US states.

**Skill elements:**
- Vocabulary knowledge (fixed, learnable, improvable by study)
- Pattern recognition speed
- Strategic decision-making (long word vs. many short words)
- Grid scanning efficiency

**No chance elements:**
- Both players share the same grid (symmetric chance environment eliminates relative luck)
- Word validity is deterministic, not probabilistic
- Score formula is deterministic

The symmetry of the shared grid is the critical design decision: any "luck" in the grid (good letters vs. bad) applies equally to both players and therefore cancels out. The outcome is determined by differential skill.

### 10.2 Restricted Jurisdictions

Real-money play is **blocked** in the following states which have stricter definitions of gambling or have not enacted skill-game safe harbors:

- Arizona
- Arkansas
- Connecticut
- Delaware (pending review)
- Indiana
- Iowa
- Louisiana
- Montana
- South Carolina
- South Dakota
- Tennessee
- Vermont

Players in restricted jurisdictions can access all practice-mode features. Jurisdiction is determined by IP geolocation confirmed with a mailing-address verification on first deposit. VPN detection is enforced.

**International:** Real-money play is initially US-only. Expansion to UK (requires Gambling Commission license), Canada (province-by-province review), and Australia is on the post-launch roadmap.

### 10.3 Age & Identity Verification

- Age gate: 18+ only. Date of birth collected at registration.
- KYC: Government ID photo verification required before any real-money withdrawal. Provided by a third-party KYC vendor (e.g., Persona, Jumio).
- PEP/Sanctions screening: Checked against OFAC and standard watchlists at account creation and periodically thereafter.

### 10.4 Tax Reporting

- Net winnings exceeding $600/year per player generate a 1099-MISC (US). Players provide W-9 at onboarding.
- Tax withholding at 24% applied on winnings for players who have not completed W-9.
- Annual tax summary available in the app.

### 10.5 Terms of Service & Rake Disclosure

- Full rake disclosure is mandatory at entry (see §5.2 UI).
- ToS must be accepted at registration.
- Rules of the game (adjacency, lexicon, timer) are published in full and accessible without logging in.

---

## 11. Technical Architecture Notes

### 11.1 Client

- **Framework:** Phaser 3 (existing studio stack) wrapping a custom grid and word-trace input system.
- **Platform:** Capacitor wrapping for iOS and Android native distribution (same pipeline as Dungeon Drift).
- **Swipe input:** Custom Phaser pointer-tracking layer that maps swipe coordinates to grid tile indices, validates adjacency in real-time, and highlights tiles.

### 11.2 Multiplayer Backend

| Component | Technology |
|---|---|
| Real-time game server | Node.js + Socket.IO (or Colyseus for room management) |
| Matchmaking service | Separate Node.js microservice |
| Lexicon validation | In-memory Trie loaded from TWL06; O(n) lookup where n = word length |
| Grid generation | Server-side; seeded PRNG with frequency-weighted letter selection + validation loop |
| Escrow / wallet | PostgreSQL with strict ACID transactions; no wallet mutation outside a database transaction |
| Result log | Append-only event store (PostgreSQL partitioned table; never updated, only inserted) |
| Auth | JWT + refresh tokens; biometric on mobile via Capacitor Biometrics plugin |

### 11.3 Lexicon (Trie) Structure

```
TWL06 contains ~178,000 words.
Trie memory footprint: ~25 MB.
Lookup time: O(L) where L = word length (≤ 16 for a 4×4 board).
Grid solving (full solution set generation): O(16! / (16-L)!) bounded by trie pruning;
  empirically < 5ms per grid on a modern server, well within validation window.
```

### 11.4 Match State Machine

```
IDLE → QUEUED → ESCROWED → MATCHED → COUNTDOWN_R1 → ROUND_1 → 
SUMMARY_1 → COUNTDOWN_R2 → ROUND_2 → RESULT → PAID
```

Each state transition is an atomic event written to the result log before the transition is applied. Replaying the event log from any match reproduces the final result deterministically.

### 11.5 Payment Infrastructure

- **Deposits:** Stripe (card), Apple Pay, Google Pay via Capacitor in-app billing passthrough where required.
- **Withdrawals:** ACH bank transfer (US), PayPal, Venmo (where permitted).
- **Wallet:** Server-side only. No crypto.
- **RevenueCat:** Manages the Pro Pass subscription (same integration as Dungeon Drift `src/services/subscription.js`).

---

## 12. Open Questions & Post-Launch Roadmap

### 12.1 Open Questions

| Question | Current assumption | Needs validation |
|---|---|---|
| Optimal round length | 30 seconds | A/B test 20s vs. 30s vs. 45s at beta |
| Grid minimum word count | 30 words | May need to raise to 40 if beta grids feel sparse |
| ELO K-factor | 32 / 16 | Monitor rating volatility at launch |
| Restricted state list | Conservative (12 states) | Legal counsel review before launch |
| Queue timeout (60s) | Assumed healthy | If queues exceed 2 min at launch, add bot fill with disclosure |

### 12.2 Post-Launch Roadmap

**V1.1 — Tournaments**
- Bracket-style elimination tournaments (8 or 16 players).
- Fixed entry fee; higher prize pool. Same 10% rake per match.
- Scheduled start times published 48h in advance.

**V1.2 — Word Study Mode**
- Free educational feature: solve completed match grids offline.
- Shows every valid word in the grid, filterable by length.
- Designed to improve player skill (retains players, increases match quality, grows the addressable market).

**V1.3 — Language Expansion**
- Spanish grid + DRAE (Real Academia Española) lexicon.
- Separate ELO pools per language.

**V1.4 — Daily Challenge**
- One free shared daily grid, no money, global leaderboard.
- Drives organic install and retention for free players.
- Pro subscribers get a second daily challenge grid.

**V2.0 — UK Launch**
- Obtain UK Gambling Commission license or restructure as a skill contest under UK law (legal review required).
- Separate UK wallet with GBP denomination.
