-- Pure-logic test runner for lune. Runs the TestEZ specs in tests/ by:
--   1. Stubbing Roblox globals on _G (Color3, Vector3, CFrame, etc.) so config
--      files that reference them at module load do not crash.
--   2. Loading every required module via a shimmed `require` that recognizes
--      ModuleScript proxies (Roblox shape) and reads the corresponding file.
--      Each loaded module gets its own `script` upvalue whose `script.Parent`
--      walks the filesystem tree, so Roblox `script.Parent.X` style requires
--      resolve.
--   3. Implementing a minimal TestEZ DSL (describe / it / expect.to.equal /
--      expect.never.to.equal). Exits non-zero on any failure so CI fails.

local fs = require("@lune/fs")
local process = require("@lune/process")

-- Capture lune's native require *before* we overwrite the global so that
-- any pass-through to "@lune/<x>" or other lune paths still works.
local lune_require = require

-- ─── Roblox global stubs (visible to every loaded module) ─────────────────

local function tagged(t, name)
	t.__t = name
	return t
end

_G.Color3 = {
	fromRGB = function(r, g, b)
		return tagged({ R = r or 0, G = g or 0, B = b or 0 }, "Color3")
	end,
	new = function(r, g, b)
		return tagged({ R = (r or 0) * 255, G = (g or 0) * 255, B = (b or 0) * 255 }, "Color3")
	end,
}

_G.Vector3 = {
	new = function(x, y, z)
		return tagged({ X = x or 0, Y = y or 0, Z = z or 0 }, "Vector3")
	end,
	zero = tagged({ X = 0, Y = 0, Z = 0 }, "Vector3"),
}

_G.CFrame = setmetatable({
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

_G.ColorSequence = {
	new = function(...)
		return tagged({ args = { ... } }, "ColorSequence")
	end,
}
_G.ColorSequenceKeypoint = {
	new = function(t, c)
		return tagged({ Time = t, Value = c }, "ColorSequenceKeypoint")
	end,
}
_G.NumberRange = {
	new = function(min, max)
		return tagged({ Min = min, Max = max or min }, "NumberRange")
	end,
}
_G.UDim = {
	new = function(s, o)
		return tagged({ Scale = s, Offset = o }, "UDim")
	end,
}
_G.UDim2 = {
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
_G.Random = {
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
_G.Enum = setmetatable({}, {
	__index = function(_, k)
		return setmetatable({}, {
			__index = function(_, k2)
				return tagged({ Category = k, Name = k2 }, "EnumItem")
			end,
		})
	end,
})
_G.Instance = {
	new = function(className, parent)
		return tagged({ ClassName = className, Children = {}, Parent = parent }, "Instance")
	end,
}
-- typeof falls back to type if absent (lune defines it for Roblox-shaped values).
if rawget(_G, "typeof") == nil then
	_G.typeof = type
end

-- ─── Module loader (Roblox path → filesystem) ─────────────────────────────

-- Each module is loaded once and cached by its filesystem path.
local cache = {}

-- Forward declarations.
local makeFolder
local makeScript
local readModule
local patched_require

-- A folder proxy: indexing returns either a child folder or a ModuleScript proxy.
function makeFolder(fsPath)
	return setmetatable({ __t = "Folder", _fs = fsPath }, {
		__index = function(_, key)
			if key == "Parent" then
				local parent = fsPath:match("^(.*)/[^/]+$")
				if parent and parent ~= "" then
					return makeFolder(parent)
				end
				return nil
			end
			local subFile = fsPath .. "/" .. key .. ".lua"
			local subDir = fsPath .. "/" .. key
			if fs.isFile(subFile) then
				return setmetatable({ __t = "ModuleScript", _fs = subFile }, {
					__index = function(_, kk)
						if kk == "Parent" then
							return makeFolder(fsPath)
						end
						return nil
					end,
				})
			elseif fs.isDir(subDir) then
				return makeFolder(subDir)
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

-- Read + execute a module file once, returning whatever it `return`s.
function readModule(fsPath)
	if cache[fsPath] ~= nil then
		return cache[fsPath]
	end
	if not fs.isFile(fsPath) then
		error("missing module file: " .. fsPath)
	end
	local source = fs.readFile(fsPath)
	-- Per-chunk environment: inherits _G for Roblox stubs, plus its own
	-- `script` and the patched `require`. `game` is also exposed because
	-- some modules use `require(game:GetService(...).Shared.X)`.
	local env = setmetatable({
		script = makeScript(fsPath),
		require = patched_require,
	}, { __index = _G })
	local chunk, err = load(source, "@" .. fsPath, "t", env)
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

_G.game = setmetatable({
	GetService = function(_, name)
		return makeService(name)
	end,
}, {
	__index = function(_, k)
		return makeService(k)
	end,
})

-- Expose the patched require globally too so any chunk that does NOT receive
-- our custom env (for example loaded with bare `load(source)`) can still
-- resolve ModuleScript proxies.
_G.require = patched_require

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
	local toTbl
	toTbl = setmetatable({}, {
		__index = function(_, k)
			if k == "equal" then
				return function(_, other)
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

_G.describe = describe
_G.it = it
_G.expect = expect

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
		local env = setmetatable({
			script = makeScript(specPath),
			require = patched_require,
		}, { __index = _G })
		local chunk, err = load(source, "@" .. specPath, "t", env)
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
