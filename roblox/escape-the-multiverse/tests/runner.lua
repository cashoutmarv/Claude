-- Pure-logic test runner for lune. Runs the TestEZ specs in tests/ by:
--   1. Stubbing Roblox globals that config files reference at load time
--      (Color3, Vector3, CFrame, ColorSequence, NumberRange, UDim, UDim2,
--      Instance, Random, Enum, etc.). These stubs return inert tagged
--      tables — sufficient for our config files which only call constructors.
--   2. Providing `game:GetService("ReplicatedStorage").Shared.<path>` proxy
--      that resolves to ModuleScript proxies; the patched `require` reads
--      those from the filesystem under src/shared/.
--   3. Implementing a minimal TestEZ DSL (describe / it / expect.to.equal).
-- Exits non-zero on any failure so CI fails.

local fs = require("@lune/fs")
local process = require("@lune/process")

-- ─── Roblox stubs ─────────────────────────────────────────────────────────

local function tagged(t, name)
	t.__t = name
	return t
end

Color3 = {
	fromRGB = function(r, g, b)
		return tagged({ R = r or 0, G = g or 0, B = b or 0 }, "Color3")
	end,
	new = function(r, g, b)
		return tagged({ R = (r or 0) * 255, G = (g or 0) * 255, B = (b or 0) * 255 }, "Color3")
	end,
}

Vector3 = {
	new = function(x, y, z)
		return tagged({ X = x or 0, Y = y or 0, Z = z or 0 }, "Vector3")
	end,
	zero = tagged({ X = 0, Y = 0, Z = 0 }, "Vector3"),
}

CFrame = setmetatable({
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

ColorSequence = {
	new = function(...)
		return tagged({ args = { ... } }, "ColorSequence")
	end,
}
ColorSequenceKeypoint = {
	new = function(t, c)
		return tagged({ Time = t, Value = c }, "ColorSequenceKeypoint")
	end,
}
NumberRange = {
	new = function(min, max)
		return tagged({ Min = min, Max = max or min }, "NumberRange")
	end,
}
UDim = { new = function(s, o) return tagged({ Scale = s, Offset = o }, "UDim") end }
UDim2 = {
	new = function(...) return tagged({ args = { ... } }, "UDim2") end,
	fromOffset = function(x, y) return tagged({ X = x, Y = y }, "UDim2") end,
	fromScale = function(x, y) return tagged({ X = x, Y = y }, "UDim2") end,
}

Random = {
	new = function(seed)
		local rng = { seed = seed or 0 }
		function rng:NextNumber(a, b)
			a = a or 0
			b = b or 1
			return a + (b - a) * 0.5 -- deterministic stub
		end
		function rng:NextInteger(a, b)
			return math.floor((a + b) / 2)
		end
		return rng
	end,
}

Enum = setmetatable({}, {
	__index = function(_, k)
		return setmetatable({}, {
			__index = function(_, k2)
				return tagged({ Category = k, Name = k2 }, "EnumItem")
			end,
		})
	end,
})

Instance = {
	new = function(className, parent)
		local inst = tagged({ ClassName = className, Children = {}, Parent = parent }, "Instance")
		return inst
	end,
}

-- task.* functions some modules touch on load
task = task or {}
task.spawn = task.spawn or function(fn, ...) end
task.delay = task.delay or function(_, fn, ...) end
task.wait = task.wait or function() end
task.cancel = task.cancel or function() end
typeof = typeof or function(v) return type(v) end

-- ─── Module loader (Roblox path → filesystem) ─────────────────────────────

local SRC_SHARED = "src/shared"
local cache = {}

local function readModule(fsPath)
	if cache[fsPath] ~= nil then
		return cache[fsPath]
	end
	if not fs.isFile(fsPath) then
		error("missing module file: " .. fsPath)
	end
	local source = fs.readFile(fsPath)
	local chunk, err = loadstring(source, "@" .. fsPath)
	if not chunk then
		error("compile " .. fsPath .. ": " .. tostring(err))
	end
	local result = chunk()
	cache[fsPath] = result
	return result
end

-- Folder proxy: __index resolves child files/dirs lazily.
local function makeFolder(fsPath)
	return setmetatable({ __t = "Folder", _fs = fsPath }, {
		__index = function(_, key)
			local subFile = fsPath .. "/" .. key .. ".lua"
			local subDir = fsPath .. "/" .. key
			if fs.isFile(subFile) then
				-- ModuleScript proxy that the patched require unwraps.
				return setmetatable({ __t = "ModuleScript", _fs = subFile }, {})
			elseif fs.isDir(subDir) then
				return makeFolder(subDir)
			else
				return nil
			end
		end,
	})
end

local sharedRoot = makeFolder(SRC_SHARED)
local Folder_ETM_Net = makeFolder(SRC_SHARED) -- cheap dummy; not used in pure specs

local function makeService(name)
	if name == "ReplicatedStorage" then
		return setmetatable({ Shared = sharedRoot }, {
			__index = function(_, k)
				if k == "Shared" then
					return sharedRoot
				elseif k == "ETM_Net" then
					return Folder_ETM_Net
				end
				return nil
			end,
		})
	elseif name == "RunService" then
		return { IsServer = function() return true end, IsClient = function() return false end, IsStudio = function() return false end }
	end
	return setmetatable({}, {})
end

game = setmetatable({
	GetService = function(_, name) return makeService(name) end,
}, {
	__index = function(_, k)
		return makeService(k)
	end,
})

-- Patch require: if the argument is a ModuleScript proxy, read from filesystem;
-- otherwise delegate to lune's native require.
local nativeRequire = require
require = function(arg)
	if type(arg) == "table" and arg.__t == "ModuleScript" then
		return readModule(arg._fs)
	end
	return nativeRequire(arg)
end

-- ─── Minimal TestEZ DSL ───────────────────────────────────────────────────

local report = { suites = {}, passed = 0, failed = 0, currentSuite = nil }

local function describe(name, fn)
	local prev = report.currentSuite
	local suite = { name = name, parent = prev, tests = {} }
	report.currentSuite = suite
	table.insert(report.suites, suite)
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

local function expect(value)
	local matchers = {}
	matchers.to = matchers
	matchers.equal = function(self, other)
		if value ~= other then
			error(("expected %s, got %s"):format(tostring(other), tostring(value)), 2)
		end
		return matchers
	end
	matchers.never = matchers
	matchers.be = matchers
	-- chained API; allow `expect(x).to.equal(y)`
	return setmetatable({}, {
		__index = function(_, k)
			if k == "to" or k == "be" or k == "never" then
				return setmetatable({}, {
					__index = function(_, k2)
						if k2 == "equal" then
							return function(_, other)
								if value ~= other then
									error(("expected %s, got %s"):format(tostring(other), tostring(value)), 2)
								end
							end
						end
						return nil
					end,
				})
			end
			return nil
		end,
	})
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
}

print("ETM lune test runner")
print("====================")

for _, specPath in ipairs(SPECS) do
	if not fs.isFile(specPath) then
		print("SKIP (missing): " .. specPath)
	else
		print("\n[" .. specPath .. "]")
		local source = fs.readFile(specPath)
		local chunk, err = loadstring(source, "@" .. specPath)
		if not chunk then
			print("compile error: " .. tostring(err))
			report.failed = report.failed + 1
		else
			local specFn = chunk()
			if type(specFn) == "function" then
				local ok, runErr = pcall(specFn)
				if not ok then
					print("spec error: " .. tostring(runErr))
					report.failed = report.failed + 1
				end
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
