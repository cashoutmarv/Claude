-- Pure-logic test runner for lune. Runs the TestEZ specs in tests/ by:
--   1. Building a `stubs` table of Roblox globals (Color3, Vector3, CFrame,
--      Enum, Instance, game, …) so config files that reference them at
--      module load do not crash.
--   2. Loading every required module via a shimmed `require` that recognizes
--      ModuleScript proxies (Roblox shape) and reads the corresponding file.
--      Each loaded module gets its own `script` upvalue whose `script.Parent`
--      walks the filesystem tree, so Roblox `script.Parent.X` style requires
--      resolve.
--   3. Implementing a minimal TestEZ DSL (describe / it / expect.to.equal /
--      expect.never.to.equal). Exits non-zero on any failure so CI fails.
--
-- Why we don't put stubs on `_G`: in Luau (and therefore Lune) the globals
-- visible to a chunk loaded via `luau.load({ environment = env })` come from
-- `env` directly, NOT via metatable lookup to `_G`. Lune's `injectGlobals`
-- copies the standard library (`print`, `string`, `math`, …) into `env`, but
-- entries we set on `_G` do not propagate. So we keep stubs in our own
-- `stubs` table and copy them into every chunk env we build.

local fs = require("@lune/fs")
local process = require("@lune/process")
local luau = require("@lune/luau")

-- Capture lune's native require *before* anything else so pass-through to
-- "@lune/<x>" still works inside our patched require.
local lune_require = require

-- ─── Roblox global stubs ──────────────────────────────────────────────────

local stubs = {}

local function tagged(t, name)
	t.__t = name
	return t
end

stubs.Color3 = {
	fromRGB = function(r, g, b)
		return tagged({ R = r or 0, G = g or 0, B = b or 0 }, "Color3")
	end,
	new = function(r, g, b)
		return tagged({ R = (r or 0) * 255, G = (g or 0) * 255, B = (b or 0) * 255 }, "Color3")
	end,
}

stubs.Vector3 = {
	new = function(x, y, z)
		return tagged({ X = x or 0, Y = y or 0, Z = z or 0 }, "Vector3")
	end,
	zero = tagged({ X = 0, Y = 0, Z = 0 }, "Vector3"),
}

stubs.CFrame = setmetatable({
	new = function(...)
		return tagged({ args = { ... } }, "CFrame")
	end,
	Angles = function(...)
		return tagged({ args = { ... } }, "CFrame")
	end,
}, {
	__call = function(_, ...)
		return tagged({ args = { ... } }, "CFrame")
	end,
})

stubs.ColorSequence = {
	new = function(...)
		return tagged({ args = { ... } }, "ColorSequence")
	end,
}
stubs.ColorSequenceKeypoint = {
	new = function(t, c)
		return tagged({ Time = t, Value = c }, "ColorSequenceKeypoint")
	end,
}
stubs.NumberRange = {
	new = function(min, max)
		return tagged({ Min = min, Max = max or min }, "NumberRange")
	end,
}
stubs.UDim = {
	new = function(s, o)
		return tagged({ Scale = s, Offset = o }, "UDim")
	end,
}
stubs.UDim2 = {
	new = function(...)
		return tagged({ args = { ... } }, "UDim2")
	end,
	fromOffset = function(x, y)
		return tagged({ X = x, Y = y }, "UDim2")
	end,
	fromScale = function(x, y)
		return tagged({ X = x, Y = y }, "UDim2")
	end,
}
stubs.Random = {
	new = function(seed)
		local rng = { seed = seed or 0 }
		function rng:NextNumber(a, b)
			a = a or 0
			b = b or 1
			return a + (b - a) * 0.5
		end
		function rng:NextInteger(a, b)
			return math.floor((a + b) / 2)
		end
		return rng
	end,
}
stubs.Enum = setmetatable({}, {
	__index = function(_, k)
		return setmetatable({}, {
			__index = function(_, k2)
				return tagged({ Category = k, Name = k2 }, "EnumItem")
			end,
		})
	end,
})
stubs.Instance = {
	new = function(className, parent)
		return tagged({ ClassName = className, Children = {}, Parent = parent }, "Instance")
	end,
}
stubs.typeof = type

-- ─── Pre-built filesystem tree ────────────────────────────────────────────
-- We cannot call fs.isFile / fs.isDir from inside a __index metamethod, because
-- the spec functions are run via pcall (TestEZ-style) and Lune's fs functions
-- yield internally → "attempt to yield across metamethod/C-call boundary".
-- Instead, we walk src/ once at startup and store a directory tree in memory.

local function buildTree(root)
	local node = { kind = "dir", path = root, children = {} }
	if not fs.isDir(root) then
		return nil
	end
	for _, entry in ipairs(fs.readDir(root)) do
		local sub = root .. "/" .. entry
		if fs.isDir(sub) then
			node.children[entry] = buildTree(sub)
		elseif fs.isFile(sub) then
			node.children[entry] = { kind = "file", path = sub }
		end
	end
	return node
end

local roots = {
	["src/shared"] = buildTree("src/shared"),
	["src/server"] = buildTree("src/server"),
	["src/client"] = buildTree("src/client"),
}

-- ─── Module loader (Roblox path → filesystem) ─────────────────────────────

local cache = {}

-- Forward declarations.
local makeFolder
local makeScript
local readModule
local patched_require

-- Compile a chunk via @lune/luau. Lune doesn't expose standard `load`, and
-- env entries are NOT looked up through metatables — they must be present
-- on the env table itself.
local function compileChunk(source, chunkname, env)
	local ok, fnOrErr = pcall(luau.load, source, {
		debugName = chunkname,
		environment = env,
	})
	if not ok then
		return nil, tostring(fnOrErr)
	end
	return fnOrErr, nil
end

-- Find a tree node for a filesystem path, walking from the root.
local function findNode(fsPath)
	for rootPath, root in pairs(roots) do
		if fsPath == rootPath then
			return root
		end
		local rest = fsPath:match("^" .. rootPath:gsub("([%.%-%+%(%)%[%]%^%$%?%*])", "%%%1") .. "/(.+)$")
		if rest and root then
			local node = root
			for part in rest:gmatch("[^/]+") do
				if not node or node.kind ~= "dir" then
					return nil
				end
				node = node.children[part]
			end
			return node
		end
	end
	return nil
end

-- A folder proxy: indexing returns either a child folder or a ModuleScript proxy.
-- All resolution comes from the pre-built `roots` tree → no fs calls in metamethods.
function makeFolder(fsPath)
	local node = findNode(fsPath)
	return setmetatable({ __t = "Folder", _fs = fsPath }, {
		__index = function(_, key)
			if key == "Parent" then
				local parent = fsPath:match("^(.*)/[^/]+$")
				if parent and parent ~= "" then
					return makeFolder(parent)
				end
				return nil
			end
			if not node or node.kind ~= "dir" then
				return nil
			end
			local fileChild = node.children[key .. ".lua"]
			if fileChild and fileChild.kind == "file" then
				local childPath = fileChild.path
				return setmetatable({ __t = "ModuleScript", _fs = childPath }, {
					__index = function(_, kk)
						if kk == "Parent" then
							return makeFolder(fsPath)
						end
						return nil
					end,
				})
			end
			local dirChild = node.children[key]
			if dirChild and dirChild.kind == "dir" then
				return makeFolder(dirChild.path)
			end
			return nil
		end,
	})
end

-- A `script` upvalue for a module file. `script.Parent` is its containing folder.
function makeScript(fsPath)
	local parentDir = fsPath:match("^(.*)/[^/]+%.lua$") or "."
	return setmetatable({ __t = "ModuleScript", _fs = fsPath }, {
		__index = function(_, k)
			if k == "Parent" then
				return makeFolder(parentDir)
			end
			return nil
		end,
	})
end

-- ─── game proxy (for `game:GetService("ReplicatedStorage").Shared.X`) ─────

local sharedRoot = makeFolder("src/shared")
local etmNetRoot = makeFolder("src/shared") -- harmless placeholder

local function makeService(name)
	if name == "ReplicatedStorage" then
		return setmetatable({}, {
			__index = function(_, k)
				if k == "Shared" then
					return sharedRoot
				elseif k == "ETM_Net" then
					return etmNetRoot
				end
				return nil
			end,
		})
	elseif name == "RunService" then
		return {
			IsServer = function()
				return true
			end,
			IsClient = function()
				return false
			end,
			IsStudio = function()
				return false
			end,
		}
	elseif name == "ServerScriptService" then
		return setmetatable({}, {
			__index = function(_, k)
				if k == "Server" then
					return makeFolder("src/server")
				end
				return nil
			end,
		})
	end
	return setmetatable({}, {})
end

stubs.game = setmetatable({
	GetService = function(_, name)
		return makeService(name)
	end,
}, {
	__index = function(_, k)
		return makeService(k)
	end,
})

-- Build a fresh chunk env: every stub key copied in directly, plus per-chunk
-- `script` and `require`. We do NOT use metatable __index to a stubs table
-- because Luau's global resolution for chunks loaded with `luau.load` looks
-- only at direct keys on the env.
local function makeChunkEnv(fsPath)
	local env = {}
	for k, v in pairs(stubs) do
		env[k] = v
	end
	env.script = makeScript(fsPath)
	env.require = patched_require
	return env
end

-- Read + execute a module file once, returning whatever it `return`s.
function readModule(fsPath)
	if cache[fsPath] ~= nil then
		return cache[fsPath]
	end
	if not fs.isFile(fsPath) then
		error("missing module file: " .. fsPath)
	end
	local source = fs.readFile(fsPath)
	local env = makeChunkEnv(fsPath)
	local chunk, err = compileChunk(source, "@" .. fsPath, env)
	if not chunk then
		error("compile " .. fsPath .. ": " .. tostring(err))
	end
	local result = chunk()
	cache[fsPath] = result
	return result
end

-- The require shim. ModuleScript proxies → file load. Lune-style strings →
-- pass-through to lune's native require.
function patched_require(arg)
	if type(arg) == "table" and arg.__t == "ModuleScript" then
		return readModule(arg._fs)
	end
	return lune_require(arg)
end

-- ─── Minimal TestEZ DSL ───────────────────────────────────────────────────

local report = { passed = 0, failed = 0, currentSuite = nil }

local function describe(name, fn)
	local prev = report.currentSuite
	report.currentSuite = { name = name, parent = prev }
	local ok, err = pcall(fn)
	if not ok then
		print("[describe error] " .. name .. ": " .. tostring(err))
		report.failed = report.failed + 1
	end
	report.currentSuite = prev
end

local function it(name, fn)
	local suite = report.currentSuite
	local fullname = (suite and suite.name or "") .. " › " .. name
	local ok, err = pcall(fn)
	if ok then
		report.passed = report.passed + 1
		print("  ✓ " .. fullname)
	else
		report.failed = report.failed + 1
		print("  ✗ " .. fullname .. " — " .. tostring(err))
	end
end

local function makeMatcher(value, negated)
	local function check(other)
		local equal = value == other
		if negated and equal then
			error(
				("expected NOT %s, got %s"):format(tostring(other), tostring(value)),
				3
			)
		elseif not negated and not equal then
			error(("expected %s, got %s"):format(tostring(other), tostring(value)), 3)
		end
	end
	-- TestEZ specs call matchers with dot syntax: `expect(x).to.equal(y)`.
	-- That means `equal` is invoked with a single positional arg (no `self`),
	-- so we must NOT use a colon-style first parameter when wiring it up.
	local toTbl
	toTbl = setmetatable({}, {
		__index = function(_, k)
			if k == "equal" then
				return function(other)
					check(other)
				end
			elseif k == "be" then
				return toTbl
			elseif k == "never" then
				return makeMatcher(value, not negated)
			end
			return nil
		end,
	})
	return setmetatable({}, {
		__index = function(_, k)
			if k == "to" then
				return toTbl
			elseif k == "never" then
				return makeMatcher(value, not negated)
			elseif k == "be" then
				return toTbl
			end
			return nil
		end,
	})
end

local function expect(value)
	return makeMatcher(value, false)
end

stubs.describe = describe
stubs.it = it
stubs.expect = expect

-- ─── Run specs ────────────────────────────────────────────────────────────

local SPECS = {
	"tests/Difficulty.spec.lua",
	"tests/Validate.spec.lua",
	"tests/PityCalculator.spec.lua",
	"tests/Gacha.spec.lua",
	"tests/StageTable.spec.lua",
	"tests/Achievements.spec.lua",
}

print("ETM lune test runner")
print("====================")

for _, specPath in ipairs(SPECS) do
	if not fs.isFile(specPath) then
		print("SKIP (missing): " .. specPath)
	else
		print("\n[" .. specPath .. "]")
		local source = fs.readFile(specPath)
		local env = makeChunkEnv(specPath)
		local chunk, err = compileChunk(source, "@" .. specPath, env)
		if not chunk then
			print("compile error: " .. tostring(err))
			report.failed = report.failed + 1
		else
			local ok, specResult = pcall(chunk)
			if not ok then
				print("load error: " .. tostring(specResult))
				report.failed = report.failed + 1
			elseif type(specResult) == "function" then
				local runOk, runErr = pcall(specResult)
				if not runOk then
					print("spec error: " .. tostring(runErr))
					report.failed = report.failed + 1
				end
			else
				print("spec did not return a function")
				report.failed = report.failed + 1
			end
		end
	end
end

print("")
print("====================")
print(string.format("%d passed, %d failed", report.passed, report.failed))

if report.failed > 0 then
	process.exit(1)
end
