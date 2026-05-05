# Word Duel — Technical Architecture

**Version:** 1.0  
**Date:** 2026-05-05  
**Stack:** Unity (iOS/Android) + Node.js + Socket.IO  

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Component Breakdown](#2-component-breakdown)
3. [Data Flow: End-to-End Match Lifecycle](#3-data-flow-end-to-end-match-lifecycle)
4. [Server Authority & Validation](#4-server-authority--validation)
5. [Anti-Cheat Architecture](#5-anti-cheat-architecture)
6. [Rake Calculation & Wallet](#6-rake-calculation--wallet)
7. [Persistence & Event Store](#7-persistence--event-store)
8. [Infrastructure & Deployment](#8-infrastructure--deployment)
9. [Security Hardening](#9-security-hardening)

---

## 1. System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT (Unity)                              │
│  ┌──────────┐  ┌────────────┐  ┌──────────────┐  ┌─────────────┐  │
│  │ UI Layer │  │ Input Layer│  │ State Machine│  │ Socket.IO   │  │
│  │(Screens) │  │(Grid Swipe)│  │(Match phases)│  │ Client SDK  │  │
│  └──────────┘  └────────────┘  └──────────────┘  └──────┬──────┘  │
└─────────────────────────────────────────────────────────-│---------┘
                                                           │ TLS 1.3
                                                           │ WSS
┌─────────────────────────────────────────────────────────-│---------┐
│                    GAME SERVER CLUSTER                    │         │
│                                                           │         │
│  ┌─────────────────────────────────────────────────────┐ │         │
│  │              Socket.IO Game Server (Node.js)        │◄┘         │
│  │  ┌──────────┐ ┌────────────┐ ┌────────────────────┐ │           │
│  │  │Match Room│ │Word Validator│ │Timer Authority    │ │           │
│  │  │Manager  │ │(Trie)      │ │(server clock only) │ │           │
│  │  └────┬─────┘ └─────┬──────┘ └────────────────────┘ │           │
│  │       │             │                                │           │
│  │  ┌────▼─────────────▼────────────────────────────┐  │           │
│  │  │        Anti-Cheat Middleware                   │  │           │
│  │  │  (rate limiter · timing analyzer · anomaly)   │  │           │
│  │  └───────────────────┬───────────────────────────┘  │           │
│  └──────────────────────│───────────────────────────────┘           │
│                         │                                            │
│  ┌──────────────────────▼───────────────────────────────┐           │
│  │          Matchmaking Service (Node.js)               │           │
│  │  (ELO queues · escrow trigger · bracket assign)      │           │
│  └──────────────────────┬───────────────────────────────┘           │
│                         │                                            │
│  ┌──────────────────────▼───────────────────────────────┐           │
│  │               Wallet & Rake Service                  │           │
│  │  (PostgreSQL ACID transactions · payout triggers)    │           │
│  └──────────────────────┬───────────────────────────────┘           │
│                         │                                            │
│  ┌──────────────────────▼───────────────────────────────┐           │
│  │               Event Store (PostgreSQL)               │           │
│  │  (append-only match log · audit trail · replay)      │           │
│  └──────────────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────────────┘
```

**Key principle:** The client is a dumb terminal. It renders, captures input, and sends events. Every game-critical decision (word validity, score, time, payout) lives exclusively on the server.

---

## 2. Component Breakdown

### 2.1 Unity Client

| Module | Responsibility |
|---|---|
| `GridRenderer` | Renders 4×4 tile grid; applies tile-highlight state pushed from server |
| `SwipeInputHandler` | Captures pointer/touch drag, maps screen coords to tile indices, streams path to `SocketManager` |
| `SocketManager` | Wraps Socket.IO Unity SDK; reconnection logic; serializes/deserializes message envelopes |
| `MatchStateMachine` | Local replica of match phase; driven by server events (`phase_change`, `round_start`, `round_end`, `match_result`) |
| `ScoreDisplay` | Shows own live score (local optimistic counter); opponent score revealed only after `round_end` event |
| `ObfuscatedConfig` | Dotfuscator-obfuscated constants (server URL, API keys stripped — injected at build time via CI env) |

**What the client does NOT do:**
- Validate words against a local dictionary
- Calculate scores
- Determine when the round ends
- Compute ELO or payouts

### 2.2 Socket.IO Game Server (Node.js)

Primary real-time process. One Node.js process per game server node; horizontal scaling via sticky sessions or Colyseus-style room routing.

```
src/
  server.js              # Express + Socket.IO bootstrap
  rooms/
    MatchRoom.js         # Per-match room: manages 2 sockets, phases, timer
  validation/
    WordValidator.js     # Trie lookup; adjacency path checker
    GridGenerator.js     # Weighted letter draw + validation loop
  anticheat/
    RateLimiter.js       # Token-bucket per socket
    TimingAnalyzer.js    # Per-socket inter-submission timing stats
    AnomalyDetector.js   # Flags sessions for review
  middleware/
    AuthMiddleware.js    # JWT verification on every socket connection
    NonceMiddleware.js   # Per-message nonce replay prevention
  services/
    TimerService.js      # Server-authoritative countdown; emits phase changes
    WalletClient.js      # gRPC/REST client to Wallet Service
    EventLogger.js       # Writes to append-only event store
```

### 2.3 Matchmaking Service (Node.js, separate process)

Decoupled from the game server so queue logic doesn't share memory or CPU with active matches.

- Maintains ELO-bucketed queues (one queue per entry tier).
- On match found: calls Wallet Service to escrow both players' entries atomically.
- On escrow confirmed: assigns both sockets to a MatchRoom, returns room token.
- On queue timeout: expands ELO window; eventually returns `queue_timeout` event.

### 2.4 Wallet & Rake Service (Node.js + PostgreSQL)

Handles all money movement. Isolated from the game server to minimize attack surface.

- All balance mutations are PostgreSQL transactions with row-level locking.
- Exposes an internal REST API (not public-facing) called only by the game server and matchmaking service.
- Idempotency keys on all mutation endpoints prevent double-crediting from retries.

### 2.5 Behavioral Anomaly Detector (sidecar process)

Reads the event stream from the event store (via PostgreSQL LISTEN/NOTIFY or a message queue) and runs pattern analysis. Does not block gameplay. Emits `flag_for_review` events consumed by an admin dashboard.

---

## 3. Data Flow: End-to-End Match Lifecycle

```
PHASE 0: MATCHMAKING
──────────────────────────────────────────────────────────────────────

Player A                 Matchmaking Svc            Wallet Svc
   │                           │                        │
   │──connect(JWT)────────────►│                        │
   │◄─ack(session_token)───────│                        │
   │                           │                        │
   │──queue_join({tier,$5.00})►│                        │
   │                           │──escrow($5, player_A)─►│
   │                           │◄─escrow_ok(txn_A)──────│
   │◄─queue_joined(eta_hint)───│                        │
   │                           │                        │
   │  [Player B joins same tier queue]                  │
   │                           │──escrow($5, player_B)─►│
   │                           │◄─escrow_ok(txn_B)──────│
   │                           │                        │
   │◄─match_found(room_token)──│                        │
   [Player B receives same]    │                        │


PHASE 1: ROOM SETUP & GRID GENERATION
──────────────────────────────────────────────────────────────────────

Player A           Game Server (MatchRoom)          Event Store
   │                        │                           │
   │──join_room(room_token)─►│                           │
   [Player B joins room]     │                           │
   │                        │──generate_grid()           │
   │                        │   (weighted draw + validate vs. Trie)
   │                        │──log(GRID_GENERATED, grid, seed)──►│
   │◄─room_joined(grid,      │                           │
   │   round_start_ts)───────│                           │
   [Player B receives same grid and same round_start_ts]


PHASE 2: ROUND 1 (60 seconds)
──────────────────────────────────────────────────────────────────────

Player A           Game Server (MatchRoom)         Event Store
   │                        │                          │
   │  [T=0: round starts, server fires TimerService]   │
   │                        │──log(ROUND_1_START, ts)─►│
   │                        │                          │
   │──submit_word({          │                          │
   │   word:"STONE",         │                          │
   │   path:[…],             │                          │
   │   nonce:"abc123",       │                          │
   │   client_ts:…})────────►│                          │
   │                        │  1. NonceMiddleware: check nonce unused
   │                        │  2. AuthMiddleware: JWT valid
   │                        │  3. RateLimiter: within token budget
   │                        │  4. TimingAnalyzer: record inter-submission Δt
   │                        │  5. TimerService: submission_ts < round_end_ts
   │                        │  6. WordValidator.validatePath(grid, path)
   │                        │  7. WordValidator.lookupTrie("STONE") → valid
   │                        │  8. Deduplicate (already scored in this round?)
   │                        │  9. Score = 5² = 25
   │                        │──log(WORD_SCORED, playerA, "STONE", 25)──►│
   │◄─word_result({valid:true, score:25, running:25})───│
   │                        │                          │
   │  [Player submits more words; invalid = word_result({valid:false})]
   │                        │                          │
   │  [T=60: TimerService fires]                        │
   │                        │──log(ROUND_1_END, scores)►│
   │◄─round_end({            │                          │
   │   your_score: 187,      │                          │
   │   opp_score: 214})──────│                          │
   [Player B receives same]  │                          │


PHASE 3: ROUND 2 (identical flow, new grid)
──────────────────────────────────────────────────────────────────────

[Same as Phase 2 with grid #2]


PHASE 4: RESULT & PAYOUT
──────────────────────────────────────────────────────────────────────

Game Server             Wallet Svc               Event Store
   │                        │                        │
   │  [Compute totals: A=418, B=412; A wins]         │
   │──release_escrow({       │                        │
   │   winner: player_A,     │                        │
   │   entry: $5.00,         │                        │
   │   prize: $9.00,         │                        │
   │   rake: $1.00,          │                        │
   │   idempotency_key: match_id})──────────────────►│
   │                        │──credit($9.00, player_A)│
   │                        │──credit($1.00, platform)│
   │                        │──debit($10.00, escrow)  │
   │◄─payout_ok(txn_id)──────│                        │
   │                        │                         │
   │──log(MATCH_RESULT, winner, scores, payout)───────►│
   │                         │                        │
   │  emit match_result to both sockets               │
   │◄─match_result({winner:"player_A", prize:$9.00,   │
   │   words_A:[…], words_B:[…], your_score:418})──── │


ANOMALY DETECTION (async, non-blocking)
──────────────────────────────────────────────────────────────────────

Event Store            Anomaly Detector          Admin Dashboard
   │                        │                        │
   │──NOTIFY(match events)─►│                        │
   │                        │  analyze timing stats  │
   │                        │  (inter-submission Δt, │
   │                        │   invalid rate,         │
   │                        │   word count/second)   │
   │                        │──flag_for_review(───────►│
   │                        │   player_id, match_id,  │
   │                        │   reason:"bot_pattern") │
```

---

## 4. Server Authority & Validation

### 4.1 Word Submission Pipeline

Every `submit_word` event passes through this sequential middleware stack. Rejection at any stage returns an error code and does not modify game state.

```
submit_word event received
        │
        ▼
┌─────────────────────────┐
│ 1. Auth: JWT valid?      │──no──► reject(401, UNAUTHORIZED)
└────────────┬────────────┘
             │ yes
        ▼
┌─────────────────────────┐
│ 2. Nonce: unused?        │──no──► reject(400, DUPLICATE_NONCE)
└────────────┬────────────┘
             │ yes
        ▼
┌─────────────────────────┐
│ 3. Rate limit: within   │──no──► reject(429, RATE_LIMITED)
│    token budget?         │        + increment violation counter
└────────────┬────────────┘
             │ yes
        ▼
┌─────────────────────────┐
│ 4. Timer: server_now <  │──no──► reject(400, ROUND_ENDED)
│    round_end_ts?         │
└────────────┬────────────┘
             │ yes
        ▼
┌─────────────────────────┐
│ 5. Path: valid adjacency │──no──► reject(400, INVALID_PATH)
│    on this grid?         │
└────────────┬────────────┘
             │ yes
        ▼
┌─────────────────────────┐
│ 6. Word: in Trie?        │──no──► reject(400, NOT_IN_DICTIONARY)
└────────────┬────────────┘
             │ yes
        ▼
┌─────────────────────────┐
│ 7. Dedupe: word not yet  │──no──► reject(400, ALREADY_SCORED)
│    scored this round?    │
└────────────┬────────────┘
             │ yes
        ▼
   Score = length²
   Log event, update room state
   Return word_result(valid:true, score:N)
```

### 4.2 Grid Adjacency Validator (`WordValidator.js`)

```javascript
// Tile (r, c) neighbors in a 4x4 grid
function neighbors(r, c) {
  const result = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < 4 && nc >= 0 && nc < 4) result.push([nr, nc]);
    }
  }
  return result;
}

function validatePath(grid, path) {
  if (path.length < 3) return false;
  const used = new Set();
  for (let i = 0; i < path.length; i++) {
    const [r, c] = path[i];
    const key = `${r},${c}`;
    if (r < 0 || r > 3 || c < 0 || c > 3) return false;    // out of bounds
    if (used.has(key)) return false;                          // tile reuse
    if (i > 0) {
      const [pr, pc] = path[i - 1];
      if (Math.abs(r - pr) > 1 || Math.abs(c - pc) > 1) return false; // non-adjacent
    }
    used.add(key);
  }
  // Reconstruct word from grid
  const word = path.map(([r, c]) => grid[r][c]).join('');
  return word;
}
```

### 4.3 Dictionary Trie (`WordValidator.js`)

TWL06 (~178,000 words) is loaded into a compact trie at server startup (~25 MB RAM). Lookups are O(L) where L ≤ 16.

```javascript
class Trie {
  constructor() { this.root = {}; }

  insert(word) {
    let node = this.root;
    for (const ch of word) {
      if (!node[ch]) node[ch] = {};
      node = node[ch];
    }
    node['$'] = true;  // end-of-word marker
  }

  contains(word) {
    let node = this.root;
    for (const ch of word) {
      if (!node[ch]) return false;
      node = node[ch];
    }
    return node['$'] === true;
  }

  hasPrefix(prefix) {
    let node = this.root;
    for (const ch of prefix) {
      if (!node[ch]) return false;
      node = node[ch];
    }
    return true;
  }
}
```

`hasPrefix` is used during grid solution validation (the generator uses DFS + trie pruning to enumerate all valid words on a candidate grid).

### 4.4 Server-Authoritative Timer

```javascript
class TimerService {
  startRound(roomId, durationMs = 60000) {
    const startTs = Date.now();
    const endTs = startTs + durationMs;

    // Broadcast signed start event to both players
    io.to(roomId).emit('round_start', { startTs, endTs });

    // Log to event store
    eventLogger.log(roomId, 'ROUND_START', { startTs, endTs });

    // Schedule end — server-side, cannot be affected by client
    this.timers[roomId] = setTimeout(() => {
      this.endRound(roomId, endTs);
    }, durationMs);

    return endTs;
  }

  isSubmissionValid(roomId, submissionTs) {
    return submissionTs <= this.roundEndTs[roomId];
  }
}
```

The `endTs` is stored in server memory and in the event store. Every submission is checked against `Date.now() < endTs` — not any client-provided timestamp.

---

## 5. Anti-Cheat Architecture

Anti-cheat operates in three layers: client obfuscation (raises attack cost), server-side sanity checks (blocks obvious exploits in real time), and behavioral anomaly detection (catches subtle bots post-match).

### 5.1 Layer 1 — Client-Side Obfuscation (Dotfuscator)

Dotfuscator is applied to the Unity IL2CPP build as a post-compile step in CI. Goals:

- **Symbol renaming:** All class names, method names, and field names in the game assembly are renamed to random identifiers. A would-be cheater inspecting the binary cannot find `SubmitWord()` or `RoundTimer`.
- **String encryption:** Plaintext strings (server URL, message type names) are encrypted and decrypted at runtime via a key derived from a device-unique seed. This prevents static analysis revealing endpoint URLs or protocol structure.
- **Control-flow obfuscation:** Dead-code insertion, opaque predicates, and exception-based branching obscure the call graph from dynamic analysis tools.
- **Anti-tamper:** Dotfuscator's tamper-detection hooks are enabled; if the assembly hash does not match at startup, the app shuts down and reports a `tamper_detected` event to the server.

**What obfuscation does NOT prevent:**
- Man-in-the-middle on the WebSocket (mitigated by TLS certificate pinning).
- Memory scanning at runtime (mitigated by not storing any game-critical truth in client memory).

Since the server is authoritative, a cheater who fully reverse-engineers the client and sends arbitrary packets still cannot change the game outcome — the server rejects invalid paths, out-of-time submissions, and non-dictionary words regardless of how they were generated.

**Certificate pinning (Unity):**
```csharp
// Enforced in SocketManager.cs (before obfuscation)
void ValidateCert(X509Certificate cert) {
  string pin = GetPublicKeyPin(cert);
  if (!KNOWN_PINS.Contains(pin)) {
    Disconnect();
    ReportTamper("cert_pin_mismatch");
  }
}
```

### 5.2 Layer 2 — Server-Side Sanity Checks (Real-Time)

These checks run synchronously in the submission middleware pipeline and reject implausible input immediately.

#### 5.2.1 Token-Bucket Rate Limiter

```javascript
// RateLimiter.js
const BUCKET_CAPACITY = 10;     // max burst: 10 submissions
const REFILL_RATE = 1;          // 1 token per second refilled
const HARD_REJECT_RATE = 10;    // reject if >10 submissions in 3 seconds

class RateLimiter {
  check(socketId, nowMs) {
    const state = this.buckets.get(socketId);
    const elapsed = (nowMs - state.lastRefill) / 1000;
    state.tokens = Math.min(BUCKET_CAPACITY, state.tokens + elapsed * REFILL_RATE);
    state.lastRefill = nowMs;

    // Hard burst check: >10 submissions in any 3-second sliding window
    state.recentSubmissions.push(nowMs);
    state.recentSubmissions = state.recentSubmissions.filter(t => nowMs - t < 3000);
    if (state.recentSubmissions.length > 10) {
      this.recordViolation(socketId, 'BURST_LIMIT');
      return { allowed: false, reason: 'BURST_LIMIT' };
    }

    if (state.tokens < 1) {
      return { allowed: false, reason: 'RATE_LIMITED' };
    }
    state.tokens -= 1;
    return { allowed: true };
  }
}
```

A human typing quickly finds words every 2–4 seconds; bursts of 10+ in 3 seconds are physically impossible for a human swipe interface and indicate a bot or scripted replay.

#### 5.2.2 Path Plausibility Check

Beyond adjacency validation, the server checks that the submitted path takes a physically plausible amount of time for a human swipe.

```javascript
function isSwipeTimePlausible(pathLength, swipeDurationMs) {
  // Human swipe: ~80ms per tile minimum (finger acceleration limits)
  const MIN_MS_PER_TILE = 80;
  return swipeDurationMs >= pathLength * MIN_MS_PER_TILE;
}
```

The client sends `swipe_start_ts` and `swipe_end_ts` with each submission (these are client-provided and untrusted for timing, but used as a plausibility signal). A 7-letter word submitted with a claimed swipe duration of 12ms is physically impossible.

#### 5.2.3 Nonce Registry

Each submission includes a per-session nonce (UUID v4 generated client-side). The server maintains a per-session nonce set and rejects any repeated nonce. This prevents replay attacks where a valid submission packet from one match is replayed in a later match.

```javascript
// NonceMiddleware.js
function checkNonce(sessionId, nonce) {
  const seen = nonceRegistry.get(sessionId);
  if (seen.has(nonce)) return false;  // replay
  seen.add(nonce);
  return true;
}
// Nonces expire with the session (room close); no cross-session persistence needed.
```

### 5.3 Layer 3 — Behavioral Anomaly Detector (Async, Post-Match)

Runs as a sidecar service reading the event store stream. Does not block gameplay. Flags sessions for human review.

#### 5.3.1 Signals Collected Per Match

| Signal | Description | Bot indicator |
|---|---|---|
| `inter_submission_delta_cv` | Coefficient of variation of inter-submission times | CV < 0.1 (inhuman uniformity) |
| `invalid_attempt_rate` | Invalid submissions / total submissions | < 0.01 across 50+ matches (bots know the dictionary perfectly) |
| `words_per_second_peak` | Peak submissions in any 5-second window | > 2.5 wps |
| `swipe_duration_p5` | 5th percentile swipe duration (ms) | < 100ms |
| `unique_word_ratio` | Distinct words / total words across last 10 matches | > 0.99 (bot finds every word every time) |
| `session_score_z_score` | Z-score vs. same-grid population | > 4σ above mean |

#### 5.3.2 Flagging Logic

```javascript
// AnomalyDetector.js
function scoreSession(signals) {
  let risk = 0;

  if (signals.inter_submission_delta_cv < 0.10) risk += 40;
  if (signals.invalid_attempt_rate < 0.01 && signals.total_submissions > 50) risk += 20;
  if (signals.words_per_second_peak > 2.5) risk += 25;
  if (signals.swipe_duration_p5 < 100) risk += 30;
  if (signals.unique_word_ratio > 0.99) risk += 15;
  if (signals.session_score_z_score > 4) risk += 20;

  // Risk score 0-100; thresholds:
  if (risk >= 60) return 'HIGH';    // auto-hold payout, send to review
  if (risk >= 35) return 'MEDIUM';  // log, watch next 3 sessions
  return 'CLEAR';
}
```

**HIGH-risk matches:** Payout is held (not blocked — escrowed) for up to 24 hours while a human reviewer checks the event log. If cleared, payout releases automatically. If confirmed as a bot, account is banned and opponent receives a payout from the escrowed amount.

#### 5.3.3 Human Reaction-Time Model

Inter-submission times follow a **log-normal distribution** for genuine human players (fast typists cluster around 2–5 seconds, with a long tail). The detector fits the player's 50-match inter-submission histogram to a log-normal and flags the session if the fit residual (KL-divergence) exceeds a threshold, indicating the distribution is too uniform or too fast to be human.

```
Human players: median inter-submission Δt ≈ 3.2s, σ ≈ 1.8s
               (log-normal μ ≈ 1.0, σ ≈ 0.55 in log-space)

Bot players:   median Δt ≈ 0.4s, CV ≈ 0.05
               (uniform, inhuman)

Threshold:     KL-divergence > 0.8 from human reference distribution → flag
```

---

## 6. Rake Calculation & Wallet

### 6.1 Rake Formula

```
rake = entry_fee * 0.10
prize = (entry_fee * 2) - rake
     = entry_fee * 1.90
```

The rake is calculated and recorded at the time of escrow release, not at match end. This prevents any rounding ambiguity from affecting wallet balances.

```javascript
// WalletClient.js
async function releaseEscrow({ matchId, winnerId, loserId, entryUsd, idempotencyKey }) {
  const prize = Math.round(entryUsd * 2 * 0.90 * 100) / 100;  // round to cents
  const rake  = Math.round(entryUsd * 2 * 0.10 * 100) / 100;

  await db.transaction(async trx => {
    await trx('escrow').where({ match_id: matchId }).delete();
    await trx('wallets').where({ user_id: winnerId }).increment('balance_cents', prize * 100);
    await trx('wallets').where({ user_id: 'platform' }).increment('balance_cents', rake * 100);
    await trx('transactions').insert([
      { user_id: winnerId, amount_cents: prize * 100, type: 'match_win', match_id: matchId },
      { user_id: 'platform', amount_cents: rake * 100, type: 'rake', match_id: matchId },
    ]);
  });
}
```

All balance values are stored as integer cents to avoid floating-point rounding errors.

### 6.2 Draw Handling

```javascript
async function releaseEscrowDraw({ matchId, playerA, playerB, entryUsd, idempotencyKey }) {
  // Full refund, zero rake
  await db.transaction(async trx => {
    await trx('escrow').where({ match_id: matchId }).delete();
    await trx('wallets').where({ user_id: playerA }).increment('balance_cents', entryUsd * 100);
    await trx('wallets').where({ user_id: playerB }).increment('balance_cents', entryUsd * 100);
    await trx('transactions').insert([
      { user_id: playerA, amount_cents: entryUsd * 100, type: 'draw_refund', match_id: matchId },
      { user_id: playerB, amount_cents: entryUsd * 100, type: 'draw_refund', match_id: matchId },
    ]);
  });
}
```

### 6.3 Idempotency

Every wallet mutation endpoint requires a caller-provided `idempotency_key` (the `match_id` for payouts). If a network failure causes a retry, the second call checks the key and returns the original result without applying the mutation again.

```javascript
async function releaseEscrow(params) {
  const existing = await db('idempotency_keys').where({ key: params.idempotencyKey }).first();
  if (existing) return existing.result;   // already processed

  const result = await applyPayout(params);

  await db('idempotency_keys').insert({
    key: params.idempotencyKey,
    result: JSON.stringify(result),
    created_at: new Date()
  });

  return result;
}
```

---

## 7. Persistence & Event Store

### 7.1 Schema (PostgreSQL)

```sql
-- Append-only match event log (never UPDATE or DELETE)
CREATE TABLE match_events (
  id             BIGSERIAL PRIMARY KEY,
  match_id       UUID NOT NULL,
  event_type     TEXT NOT NULL,   -- GRID_GENERATED, WORD_SCORED, ROUND_END, etc.
  player_id      UUID,
  payload        JSONB NOT NULL,
  server_ts      TIMESTAMPTZ NOT NULL DEFAULT now(),
  server_version TEXT NOT NULL
);
CREATE INDEX ON match_events (match_id, server_ts);

-- One row per match; written at match end
CREATE TABLE matches (
  match_id       UUID PRIMARY KEY,
  player_a       UUID NOT NULL REFERENCES users(id),
  player_b       UUID NOT NULL REFERENCES users(id),
  entry_cents    INT NOT NULL,
  winner         UUID,            -- NULL = draw
  score_a        INT NOT NULL,
  score_b        INT NOT NULL,
  rake_cents     INT NOT NULL,
  status         TEXT NOT NULL,   -- PENDING, COMPLETE, DISPUTED
  completed_at   TIMESTAMPTZ
);

-- Wallet balances
CREATE TABLE wallets (
  user_id        UUID PRIMARY KEY REFERENCES users(id),
  balance_cents  BIGINT NOT NULL DEFAULT 0 CHECK (balance_cents >= 0)
);

-- Escrow (two rows per match while in progress)
CREATE TABLE escrow (
  match_id       UUID NOT NULL,
  user_id        UUID NOT NULL,
  amount_cents   INT NOT NULL,
  PRIMARY KEY (match_id, user_id)
);
```

### 7.2 Replay Guarantee

The `match_events` table is the source of truth. Given any `match_id`, the full match can be replayed deterministically:

1. Find `GRID_GENERATED` event → reconstruct grid from seed.
2. Replay all `WORD_SCORED` events in order → reconstruct both score totals.
3. Verify against the `MATCH_RESULT` event.

This replay is used in dispute resolution and periodic audit jobs.

---

## 8. Infrastructure & Deployment

```
┌──────────────────────────────────────────────────────────┐
│                    AWS (us-east-1)                        │
│                                                           │
│  Route 53 ──► CloudFront (TLS termination)               │
│                    │                                      │
│               ┌────▼──────────────────────────┐          │
│               │      ALB (sticky sessions)     │          │
│               └────┬──────────┬───────────────┘          │
│                    │          │                           │
│           ┌────────▼──┐  ┌───▼────────┐                 │
│           │ Game Server│  │ Matchmaking│                  │
│           │ ECS Fargate│  │ ECS Fargate│                 │
│           │ (auto-scale│  │            │                 │
│           │  1-50 tasks│  │            │                 │
│           └────────┬───┘  └───┬────────┘                 │
│                    │          │                           │
│           ┌────────▼──────────▼────────┐                 │
│           │  Wallet & Escrow Service   │                 │
│           │  ECS Fargate (2 tasks min) │                 │
│           └────────────┬───────────────┘                 │
│                        │                                  │
│           ┌────────────▼───────────────┐                 │
│           │  RDS PostgreSQL (Multi-AZ) │                 │
│           │  + read replica            │                 │
│           └────────────────────────────┘                 │
│                                                           │
│  Anomaly Detector: ECS Fargate sidecar, reads from       │
│  PostgreSQL LISTEN; writes flags to admin DB table.       │
└──────────────────────────────────────────────────────────┘
```

**Scaling:** Game server tasks are stateful (active rooms live in memory). The ALB uses sticky sessions (cookie-based) to route both players in a match to the same server task. When a task nears capacity (> 80% rooms full), ECS spins up a new task; new matches route there.

**Horizontal scaling ceiling:** Each Node.js game server task handles ~500 concurrent rooms (1,000 concurrent players) comfortably at < 40% CPU. 50 tasks = 25,000 concurrent players.

---

## 9. Security Hardening

| Attack surface | Mitigation |
|---|---|
| WebSocket flooding | Rate limiter per socket (§5.2.1); CloudFront WAF with connection-rate rules |
| JWT theft | Short expiry (15 min access token); refresh token rotation; device binding |
| Wallet SQL injection | All queries via parameterized statements (pg library); no raw string interpolation |
| Replay attacks | Per-session nonce registry (§5.2.3); match-scoped idempotency keys |
| Escrow double-credit | Database-level idempotency keys + row-level locking (§6.3) |
| MitM | TLS 1.3 + certificate pinning on Unity client |
| Client modification | Dotfuscator obfuscation + tamper detection + server-authoritative scoring |
| Collusion | Friend-match block in money queues; cross-account ELO anomaly detection |
| DDoS | CloudFront shield; WAF; ALB with connection limits |
| Enumeration | User IDs are UUIDs (not sequential integers); rate-limited login |
| PCI scope | Card data never touches game servers; Stripe handles tokenization |
