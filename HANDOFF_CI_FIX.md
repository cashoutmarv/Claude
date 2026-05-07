# CI Failure Handoff — Roblox `lint-and-test` (PR #6)

**Repo:** `cashoutmarv/Claude`
**Branch:** `claude/multiverse-obby-game-sinqB`
**Failing workflow:** `.github/workflows/roblox-ci.yml` → step *"Pure-logic specs (lune) — hard gate"*
**Failing job URL:** https://github.com/cashoutmarv/Claude/actions/runs/25481699816/job/74767185517

This document captures the diagnosis and fix for a chain of CI failures on
PR #6 ("Add Escape The Multiverse — 200-stage Roblox obby"). It is written so
another LLM (or human) can pick up the work in a fresh chat and verify the
fix without re-deriving the analysis.

---

## TL;DR

The CI install steps (`selene`, `stylua`, `lune` via direct binary download +
`chmod +x` + `sudo mv` to `/usr/local/bin`) were correct. The hard-gate failure
was inside `roblox/escape-the-multiverse/tests/runner.lua`, which broke in
**three** different Luau/Lune-specific ways, each masked behind the previous
one. The "fix(ci): runner properly sets script + require per-chunk env" commit
addressed a *fourth* bug correctly but introduced none of the new bugs — it
just left the others standing.

After the fixes in this handoff, `lune run tests/runner.lua` returns
**`37 passed, 0 failed`** locally with `lune 0.8.9`, exit code `0`.

---

## What was happening

The runner has to bridge three separate gaps to test Roblox-style modules
under Lune:

1. **Globals.** Roblox modules reference `Color3`, `Vector3`, `CFrame`,
   `Enum`, `Instance`, `game`, etc. Lune doesn't provide any of these.
2. **`require`.** Roblox modules `require(<ModuleScript>)` where the argument
   is an `Instance`, not a string path. Lune's native `require` only accepts
   strings (`"@lune/fs"`, etc.).
3. **`script` upvalue.** Roblox modules use `script.Parent.X` to navigate the
   instance tree. Lune chunks have no `script` global by default.

The runner's strategy is fine: build proxy `Instance`-shaped tables, install a
patched `require` that unwraps them to filesystem paths, and load every spec /
module file in a custom environment.

The previous commit (`fix(ci): runner properly sets script + require per-chunk
env`, `2b55460`) refactored exactly that — and was conceptually right. But it
ran into three Luau/Lune-specific traps that only manifest at runtime. They
fail in order: each fix unmasks the next.

---

## The three bugs (in failure order)

### Bug 1 — `load` is `nil` in Luau

```lua
local chunk, err = load(source, "@" .. fsPath, "t", env)
-- → tests/runner:189 attempt to call a nil value
```

`load` and `loadstring` are part of standard Lua. **Luau does not expose them
as globals**, and Lune does not re-export them either (security: arbitrary
source compilation is a sandbox break in Roblox). They have to come from the
`@lune/luau` builtin:

```lua
local luau = require("@lune/luau")
local fn = luau.load(source, { debugName = "@" .. fsPath, environment = env })
```

`luau.load` *throws* on compile error rather than returning `(nil, err)`, so
wrap it in `pcall` to keep the runner's `(chunk, err)` calling convention.

### Bug 2 — `_G.X = ...` does not make `X` a global to chunks

After fixing bug 1, every spec failed with `attempt to index nil with
'GetService'`. The runner had been doing:

```lua
_G.game = setmetatable({...})  -- sets _G.game
local env = setmetatable({...}, { __index = _G })  -- env falls through to _G
```

In standard Lua this works because `_G` *is* the globals table. **In Luau
it isn't.** Chunks loaded via `luau.load({ environment = env })` resolve
globals strictly from `env`'s direct keys (plus the standard library that
Lune injects when `injectGlobals = true`). The metatable `__index` chain
to `_G` is bypassed by the global resolver — confirmed empirically:

```lua
_G.special = "from_G"
local env = setmetatable({}, { __index = _G })
luau.load("print(special)", { environment = env })()
-- → nil
```

Fix: keep stubs in our own `stubs` table and **copy them by value** into each
chunk's env at load time. No metatable trickery.

```lua
local stubs = {}
stubs.game = ...
stubs.Color3 = ...
-- ... etc

local function makeChunkEnv(fsPath)
    local env = {}
    for k, v in pairs(stubs) do env[k] = v end
    env.script = makeScript(fsPath)
    env.require = patched_require
    return env
end
```

### Bug 3 — `fs.isFile` / `fs.isDir` yield across metamethod boundaries

After fixing bug 2, every spec failed with `attempt to yield across
metamethod/C-call boundary`. The runner was lazily walking the filesystem
inside `__index` metamethods on Folder proxies:

```lua
function makeFolder(fsPath)
    return setmetatable(..., {
        __index = function(_, key)
            if fs.isFile(fsPath .. "/" .. key .. ".lua") then ...
        end,
    })
end
```

Lune's `@lune/fs` functions yield internally (they're synchronous to the
caller, but implemented over an async runtime). When a spec is running inside
TestEZ-style `pcall(fn)` and the spec evaluates
`game:GetService("ReplicatedStorage").Shared.Config.Difficulty`, every
intermediate `__index` lookup is a metamethod call. Yielding from inside a
metamethod that's reached from inside a `pcall` is forbidden.

Fix: walk the directory tree **once at startup** (outside any pcall, outside
any metamethod) and store it as a plain Lua table. Then the metamethods do
in-memory lookups only — no yields.

```lua
local function buildTree(root)
    local node = { kind = "dir", path = root, children = {} }
    if not fs.isDir(root) then return nil end
    for _, entry in ipairs(fs.readDir(root)) do
        local sub = root .. "/" .. entry
        if fs.isDir(sub) then node.children[entry] = buildTree(sub)
        elseif fs.isFile(sub) then node.children[entry] = { kind = "file", path = sub } end
    end
    return node
end
local roots = { ["src/shared"] = buildTree("src/shared"), ... }
```

`makeFolder` then resolves children by table lookup against `roots`.

### Bug 4 — TestEZ matcher wired with colon syntax, specs use dot syntax

After fixing bug 3, all specs ran but most asserts reported nonsense like
`expected nil, got true`. The matcher in the runner was:

```lua
return function(_, other)  -- expected `expect(x).to:equal(y)`
    check(other)
end
```

Specs throughout use **dot** syntax: `expect(x).to.equal(y)`. With the
function above, `equal(1)` calls it with `_ = 1, other = nil`, so every check
becomes `value == nil`.

Fix: drop the unused first parameter so dot-call works:

```lua
return function(other)  -- works for `expect(x).to.equal(y)`
    check(other)
end
```

(This was *not* introduced by the previous commit — it was already wrong but
masked because bug 1 stopped the runner before any matcher ran.)

### Bonus — two real `Difficulty.lua` formula bugs

With the runner finally working, the spec surfaced two genuine bugs in
`src/shared/Config/Difficulty.lua` that have been in the repo since Phase 1:

```lua
-- before
function Difficulty.jumpDistance(world, stage)
    return 8 + 0.6 * (world - 1) + 0.15 * stage
end
```

- **Not monotonic across globalStage**: W1S20 → 11.0, W2S1 → 8.75 (drop at
  the world boundary). Spec asserts non-decreasing across all 200 stages.
- **Too gentle at the end**: W10S20 → 16.4. Spec asserts ≥ 22.

```lua
-- after
function Difficulty.jumpDistance(world, stage)
    local g = Difficulty.globalStage(world, stage)
    return 8 + 0.075 * (g - 1)
end
```

W1S1 = 8.0 (≤ 8.5 ✓), W10S20 = 22.925 (≥ 22 ✓), monotonic across globalStage
by construction.

---

## Files changed by this fix

```
roblox/escape-the-multiverse/tests/runner.lua            +159 / -75
roblox/escape-the-multiverse/src/shared/Config/Difficulty.lua  +5 / -1
```

Specifically in `tests/runner.lua`:

- Added `require("@lune/luau")` and a `compileChunk(source, name, env)` helper
  that wraps `luau.load` and returns `(chunk, err)` like standard Lua's `load`.
- Replaced `_G.X = …` Roblox stub assignments with a top-level `stubs` table.
  Added `makeChunkEnv(fsPath)` which copies stubs into a fresh table per chunk
  and adds per-chunk `script` + `require`.
- Added `buildTree()` to prefetch `src/shared`, `src/server`, `src/client`
  recursively at startup, and `findNode(fsPath)` to resolve in-memory.
  `makeFolder()`'s `__index` now reads from this tree only — no `fs.*` calls
  inside metamethods.
- Fixed the matcher: `equal` and `never.equal` now take a single `other`
  argument (dot syntax) instead of `(_, other)` (colon syntax).

In `src/shared/Config/Difficulty.lua`:

- `jumpDistance` reparameterized by globalStage with formula `8 + 0.075*(g-1)`.

---

## What the workflow should keep doing (no change needed)

The CI workflow itself is fine. For the record, the install pattern is robust:

```yaml
- name: Install Lune
  working-directory: ${{ github.workspace }}
  run: |
    set -euo pipefail
    cd "$RUNNER_TEMP"
    curl -fsSL -o lune.zip \
      "https://github.com/lune-org/lune/releases/download/v${LUNE_VERSION}/lune-${LUNE_VERSION}-linux-x86_64.zip"
    unzip -q lune.zip
    chmod +x lune
    sudo mv lune /usr/local/bin/lune
    lune --version
```

`set -euo pipefail` + `chmod +x` + `sudo mv` to a directory already in `PATH`
+ a `--version` smoke test is the minimum viable pattern for these tools.
The same shape works for `selene`, `stylua`, and `lune`. Pinned versions
(`SELENE_VERSION=0.27.1`, `STYLUA_VERSION=0.20.0`, `LUNE_VERSION=0.8.9`) are
fine; in particular **don't bump lune past 0.8.x without re-checking
`@lune/luau`'s `load` API**, since it has changed in past majors.

`selene` and `stylua` runs are wrapped with `continue-on-error: true` and
`|| echo "::warning::..."` so formatting drift is non-fatal. That's
intentional — only the lune step is a hard gate.

---

## Local verification

```bash
cd roblox/escape-the-multiverse

# Install lune 0.8.9 if not already present
curl -fsSL -o /tmp/lune.zip \
  https://github.com/lune-org/lune/releases/download/v0.8.9/lune-0.8.9-linux-x86_64.zip
unzip -q -o /tmp/lune.zip -d /tmp
chmod +x /tmp/lune

/tmp/lune run tests/runner.lua
# → 37 passed, 0 failed
# → exit code 0
```

---

## How to pick this up in another chat

If you're a fresh LLM picking this up, the minimum context you need is:

1. **The bug chain is `load` → `_G` → `fs.yield` → matcher.** Fix them in
   order. The repo's PR #6 currently has all four fixed in
   `tests/runner.lua` plus the difficulty-formula fix in
   `src/shared/Config/Difficulty.lua`. Pull and run `lune run
   tests/runner.lua` to confirm 37 passed.

2. **Don't add `loadstring` polyfills.** Use `@lune/luau`'s `load` directly.

3. **Don't put new Roblox stubs on `_G`** — they won't propagate. Add them to
   the `stubs` table at the top of `tests/runner.lua`.

4. **Don't call `fs.*` from inside a metamethod.** Extend `buildTree()` /
   `findNode()` instead.

5. **The CI workflow `.github/workflows/roblox-ci.yml` does not need
   changes.** All four lints (selene, stylua) and one hard gate (lune) are
   already wired correctly. If a future bump of lune breaks something, check
   `@lune/luau` API first.

6. **PR is draft #6.** After pushing, CI runs automatically; the next run
   should land green.

---

## Original CI failures and what each was actually doing

| Commit (newest → oldest) | What the message said | What actually broke |
|---|---|---|
| `2b55460` *fix(ci): runner properly sets script + require per-chunk env* | Wired patched_require, `script` upvalue, env metatable to `_G`, _G-namespaced stubs | Bug 1 unmasked — `load` is nil in Luau. Bugs 2/3/4 latent. |
| `05d8b9c` *feat: world polish + AchievementsService + diagnostics harness* | Phase-2 content delivery (10 worlds, achievements, diagnostics) | Same bug 1 — runner couldn't compile any spec. |
| `57a1274` *ci: install selene/stylua/lune via direct binaries (drop aftman+wally)* | Replaced action-based installs with curl + chmod + sudo mv | Install steps started passing — exposed bug 1 in lune step. |
| `16a1f42` *ci: install lune via direct binary download (action did not exist)* | First attempt at lune install via curl | Install step started passing — exposed bug 1. |
| `d1044c9` *chore: ignore .claude/worktrees* | gitignore tweak | Unrelated; CI passed only because workflow paths filter excluded it. |

The progression is "fix the install pipeline → expose the runner bug → try to
fix it once → still wrong because of bugs 2 + 3 + 4 underneath". This handoff
ends that loop.
