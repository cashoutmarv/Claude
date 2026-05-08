-- Boot-time smoke check: walks the live Workspace + ReplicatedStorage state
-- after WorldBuilder has finished and verifies every wiring invariant the
-- 200-stage obby relies on. Non-fatal: every failure becomes a `warn`, never
-- an error/kick — the goal is to surface bugs to the playtester, not to gate
-- the server boot.
--
-- :Check() is pure (modulo Workspace reads) — it returns
--   { ok: bool, results: { { label, ok, detail? } } }
-- so the spec can drive it against a synthetic fixture.
--
-- :Start() does the live boot-time variant: waits a beat for WorldBuilder to
-- settle, runs :Check(), then logs the summary.

local CollectionService = game:GetService("CollectionService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Workspace = game:GetService("Workspace")

local Shared = require(ReplicatedStorage.Shared)
local RemoteNames = Shared.Config.RemoteNames

local Diagnostics = {}
Diagnostics._deps = nil :: any

-- ─── Helpers ──────────────────────────────────────────────────────────────

local function findChild(parent: Instance?, name: string): Instance?
	if not parent then
		return nil
	end
	return parent:FindFirstChild(name)
end

local function isA(inst: Instance?, className: string): boolean
	return inst ~= nil and inst:IsA(className)
end

local function gotTagged(part: Instance, tag: string): boolean
	if not CollectionService:HasTag(part, tag) then
		return false
	end
	return true
end

local function findStageReachedSensor(stageFolder: Instance): Instance?
	-- Any descendant tagged StageReached with World/Stage attributes counts.
	for _, descendant in ipairs(stageFolder:GetDescendants()) do
		if descendant:IsA("BasePart") and CollectionService:HasTag(descendant, "StageReached") then
			local w = descendant:GetAttribute("World")
			local s = descendant:GetAttribute("Stage")
			if type(w) == "number" and type(s) == "number" then
				return descendant
			end
		end
	end
	return nil
end

local function findFirstByName(parent: Instance, name: string): Instance?
	for _, descendant in ipairs(parent:GetDescendants()) do
		if descendant.Name == name then
			return descendant
		end
	end
	return nil
end

local function findTaggedUnder(parent: Instance, tag: string): { Instance }
	local out = {}
	for _, descendant in ipairs(parent:GetDescendants()) do
		if CollectionService:HasTag(descendant, tag) then
			table.insert(out, descendant)
		end
	end
	return out
end

-- ─── Individual checks ────────────────────────────────────────────────────

local function checkStageGrid(results)
	local worlds = findChild(Workspace, "Worlds")
	local missingFolders, missingStart, missingEnd, missingSensor = {}, {}, {}, {}

	if not worlds then
		table.insert(results, {
			label = "Workspace.Worlds folder",
			ok = false,
			detail = "Workspace.Worlds folder is missing entirely",
		})
		return
	end

	for w = 1, 10 do
		local wFolder = findChild(worlds, "W" .. w)
		if not wFolder then
			table.insert(missingFolders, "W" .. w)
			-- can't check stages without world folder
			continue
		end
		for s = 1, 20 do
			local sFolder = findChild(wFolder, "S" .. s)
			if not sFolder then
				table.insert(missingFolders, "W" .. w .. ".S" .. s)
				continue
			end
			local startAnchor = findChild(sFolder, "StartAnchor")
			if not isA(startAnchor, "BasePart") then
				table.insert(missingStart, "W" .. w .. ".S" .. s)
			end
			local endAnchor = findChild(sFolder, "EndAnchor")
			if not isA(endAnchor, "BasePart") then
				table.insert(missingEnd, "W" .. w .. ".S" .. s)
			end
			if not findStageReachedSensor(sFolder) then
				table.insert(missingSensor, "W" .. w .. ".S" .. s)
			end
		end
	end

	table.insert(results, {
		label = "200 stage folders (Worlds.W{1..10}.S{1..20})",
		ok = #missingFolders == 0,
		detail = #missingFolders > 0 and ("missing: " .. table.concat(missingFolders, ", ")) or nil,
	})
	table.insert(results, {
		label = "Every stage has StartAnchor (BasePart)",
		ok = #missingStart == 0,
		detail = #missingStart > 0 and ("missing on: " .. table.concat(missingStart, ", ")) or nil,
	})
	table.insert(results, {
		label = "Every stage has EndAnchor (BasePart)",
		ok = #missingEnd == 0,
		detail = #missingEnd > 0 and ("missing on: " .. table.concat(missingEnd, ", ")) or nil,
	})
	table.insert(results, {
		label = "Every stage has StageReached-tagged sensor with World+Stage attrs",
		ok = #missingSensor == 0,
		detail = #missingSensor > 0 and ("missing on: " .. table.concat(missingSensor, ", ")) or nil,
	})
end

local function checkRemotes(results)
	local folder = ReplicatedStorage:FindFirstChild("ETM_Net")
	if not folder then
		table.insert(results, {
			label = "ReplicatedStorage.ETM_Net folder",
			ok = false,
			detail = "ETM_Net folder is missing — Net.bootstrapServer never ran",
		})
		return
	end
	local missing = {}
	for name in pairs(RemoteNames) do
		local r = folder:FindFirstChild(name)
		if not r or not r:IsA("RemoteEvent") then
			table.insert(missing, name)
		end
	end
	table.insert(results, {
		label = "All RemoteNames exist as RemoteEvents in ETM_Net",
		ok = #missing == 0,
		detail = #missing > 0 and ("missing: " .. table.concat(missing, ", ")) or nil,
	})
end

local function checkSpawnHub(results)
	local spawnFolder = findChild(Workspace, "Spawn")
	if not spawnFolder then
		table.insert(results, {
			label = "Workspace.Spawn folder",
			ok = false,
			detail = "Spawn folder missing",
		})
		return
	end

	local mainSpawn = findChild(spawnFolder, "MainSpawn")
	table.insert(results, {
		label = "Workspace.Spawn.MainSpawn (SpawnLocation)",
		ok = isA(mainSpawn, "SpawnLocation"),
		detail = (not isA(mainSpawn, "SpawnLocation")) and "missing or wrong class" or nil,
	})

	local sign = findChild(spawnFolder, "LeaderboardSign")
	local signOk, signDetail = false, "missing LeaderboardSign"
	if sign and sign:IsA("BasePart") then
		local sg = sign:FindFirstChildWhichIsA("SurfaceGui")
		if sg then
			local list = sg:FindFirstChild("List")
			if list and list:IsA("Frame") then
				signOk = true
				signDetail = nil
			else
				signDetail = "LeaderboardSign SurfaceGui has no List Frame"
			end
		else
			signDetail = "LeaderboardSign has no SurfaceGui"
		end
	end
	table.insert(results, {
		label = "Spawn.LeaderboardSign with SurfaceGui.List Frame",
		ok = signOk,
		detail = signDetail,
	})

	local hofFolder = findChild(Workspace, "HallOfFame")
	local wallOk, wallDetail = false, "missing HallOfFame.Wall"
	if hofFolder then
		local wall = findChild(hofFolder, "Wall")
		if wall and wall:IsA("BasePart") then
			local sg = wall:FindFirstChildWhichIsA("SurfaceGui")
			if sg then
				local missingSlots = {}
				for i = 1, 10 do
					local slot = sg:FindFirstChild("Slot" .. i)
					if not (slot and slot:IsA("Frame")) then
						table.insert(missingSlots, "Slot" .. i)
					end
				end
				if #missingSlots == 0 then
					wallOk = true
					wallDetail = nil
				else
					wallDetail = "HallOfFame.Wall SurfaceGui missing: " .. table.concat(missingSlots, ", ")
				end
			else
				wallDetail = "HallOfFame.Wall has no SurfaceGui"
			end
		end
	end
	table.insert(results, {
		label = "HallOfFame.Wall with 10 SurfaceGui Slot frames",
		ok = wallOk,
		detail = wallDetail,
	})

	local trailKiosk = findChild(Workspace, "TrailKiosk")
	local trailOk, trailDetail = false, "missing TrailKiosk"
	if trailKiosk then
		local tagged = findTaggedUnder(trailKiosk, "TrailButton")
		if #tagged >= 4 then
			trailOk = true
			trailDetail = nil
		else
			trailOk = false
			trailDetail = "TrailKiosk has only " .. #tagged .. " TrailButton-tagged parts (need ≥4)"
		end
	end
	table.insert(results, {
		label = "TrailKiosk with ≥4 TrailButton-tagged parts",
		ok = trailOk,
		detail = trailDetail,
	})

	local racePortal = findChild(spawnFolder, "RacePortal")
	local raceOk = racePortal ~= nil and racePortal:IsA("BasePart") and CollectionService:HasTag(racePortal, "RacePortal")
	table.insert(results, {
		label = "Spawn.RacePortal tagged RacePortal",
		ok = raceOk,
		detail = (not raceOk) and "missing or untagged RacePortal" or nil,
	})
end

local function checkSkipDoors(results)
	local worlds = findChild(Workspace, "Worlds")
	if not worlds then
		table.insert(results, {
			label = "Stage 15 of every world has a SkipDoor-tagged part",
			ok = false,
			detail = "no Worlds folder",
		})
		return
	end
	local missing = {}
	for w = 1, 10 do
		local wFolder = findChild(worlds, "W" .. w)
		local sFolder = wFolder and findChild(wFolder, "S15") or nil
		if not sFolder then
			table.insert(missing, "W" .. w .. ".S15 (folder missing)")
		else
			local tagged = findTaggedUnder(sFolder, "SkipDoor")
			if #tagged < 1 then
				table.insert(missing, "W" .. w .. ".S15")
			end
		end
	end
	table.insert(results, {
		label = "Stage 15 of every world has a SkipDoor-tagged part",
		ok = #missing == 0,
		detail = #missing > 0 and ("no skip door on: " .. table.concat(missing, ", ")) or nil,
	})
end

local function checkVIPGate(results)
	local worlds = findChild(Workspace, "Worlds")
	local sFolder = worlds and findChild(worlds, "W10") and findChild(findChild(worlds, "W10"), "S20")
	if not sFolder then
		table.insert(results, {
			label = "W10S20 has VIPBarrier and VIPReward",
			ok = false,
			detail = "W10.S20 folder missing",
		})
		return
	end
	local barrier = findFirstByName(sFolder, "VIPBarrier")
	local reward = findFirstByName(sFolder, "VIPReward")
	local ok = barrier ~= nil and reward ~= nil
	local detail = nil
	if not ok then
		local missing = {}
		if not barrier then
			table.insert(missing, "VIPBarrier")
		end
		if not reward then
			table.insert(missing, "VIPReward")
		end
		detail = "missing on W10.S20: " .. table.concat(missing, ", ")
	end
	table.insert(results, {
		label = "W10S20 has VIPBarrier and VIPReward",
		ok = ok,
		detail = detail,
	})
end

local function checkAbyssSecret(results)
	local worlds = findChild(Workspace, "Worlds")
	local sFolder = worlds and findChild(worlds, "W5") and findChild(findChild(worlds, "W5"), "S8")
	if not sFolder then
		table.insert(results, {
			label = "W5S8 has AbyssSecretPlatform",
			ok = false,
			detail = "W5.S8 folder missing",
		})
		return
	end
	local plat = findFirstByName(sFolder, "AbyssSecretPlatform")
	table.insert(results, {
		label = "W5S8 has AbyssSecretPlatform",
		ok = plat ~= nil,
		detail = (plat == nil) and "AbyssSecretPlatform missing on W5.S8" or nil,
	})
end

-- ─── Public API ───────────────────────────────────────────────────────────

function Diagnostics:Init(deps: any)
	self._deps = deps
end

function Diagnostics:Check()
	local results = {}
	checkStageGrid(results)
	checkRemotes(results)
	checkSpawnHub(results)
	checkSkipDoors(results)
	checkVIPGate(results)
	checkAbyssSecret(results)

	local okCount = 0
	for _, r in ipairs(results) do
		if r.ok then
			okCount = okCount + 1
		end
	end
	return {
		ok = okCount == #results,
		results = results,
		okCount = okCount,
		total = #results,
	}
end

function Diagnostics:Start()
	-- Let WorldBuilder finish parenting all 200 stages before we walk Workspace.
	task.wait(0.5)
	local report = self:Check()
	if report.ok then
		print(string.format("[ETM Diagnostics] OK: %d/%d", report.okCount, report.total))
	else
		warn(string.format("[ETM Diagnostics] %d/%d checks passed — failures below:", report.okCount, report.total))
		for _, r in ipairs(report.results) do
			if not r.ok then
				warn(string.format("  ✗ %s — %s", r.label, tostring(r.detail or "(no detail)")))
			end
		end
	end
end

return Diagnostics
