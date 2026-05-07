-- Builds a private arena for a pair: 2 lanes, 10 stages each, side-by-side.
-- Uses BaseBuilder + the requested world's gimmick layer. Despawns on demand.

local Workspace = game:GetService("Workspace")

local Shared = require(game:GetService("ReplicatedStorage").Shared)
local Race = Shared.Config.Race
local Difficulty = Shared.Config.Difficulty
local Worlds = Shared.Config.Worlds

local Base = require(game:GetService("ServerScriptService").Server.World.Builders.BaseBuilder)

local Arena = {}
Arena._next = 1

local function ensureParent(): Folder
	local p = Workspace:FindFirstChild(Race.parentName)
	if not p then
		p = Instance.new("Folder")
		p.Name = Race.parentName
		p.Parent = Workspace
	end
	return p
end

local function buildLane(parent: Instance, originCF: CFrame, world: number, startStage: number)
	local laneFolder = Instance.new("Folder")
	laneFolder.Name = "Lane"
	laneFolder.Parent = parent
	local cf = originCF
	for s = 0, Race.stagesPerRace - 1 do
		local stage = startStage + s
		local stageFolder = Instance.new("Folder")
		stageFolder.Name = "S" .. stage
		stageFolder.Parent = laneFolder
		local len = Difficulty.stageLength(world, stage)
		local jump = Difficulty.jumpDistance(world, stage)
		local width = Difficulty.platformWidth(world, stage)
		local params = {
			length = len,
			jumpAvg = jump,
			jumpJitter = 0.5,
			width = width,
			killBricks = 0,
			gimmicks = {},
			gimmickDensity = 0,
			seed = world * 100000 + stage * 100 + s,
		}
		Base.makeStartAnchor(stageFolder, cf)
		local cfs = Base.layRow(stageFolder, cf, params)
		if #cfs > 0 then
			cf = cfs[#cfs] * CFrame.new(0, 0, -jump - width / 2)
		end
	end
	-- Final flag.
	local flag = Instance.new("Part")
	flag.Name = "RaceFinish"
	flag.Size = Vector3.new(20, 12, 1)
	flag.Material = Enum.Material.Neon
	flag.Color = Color3.fromRGB(0, 255, 100)
	flag.Anchored = true
	flag.CanCollide = false
	flag.Transparency = 0.3
	flag.CFrame = cf
	flag.Parent = laneFolder
	return laneFolder, flag
end

function Arena.spawn(playerA: Player, playerB: Player, world: number, startStage: number)
	local pairId = Arena._next
	Arena._next += 1
	local parent = ensureParent()
	local pair = Instance.new("Folder")
	pair.Name = "Pair_" .. pairId
	pair.Parent = parent
	local origin = CFrame.new(Race.arenaStride * pairId)
	local laneA, flagA = buildLane(pair, origin + Vector3.new(-12, 0, 0), world, startStage)
	local laneB, flagB = buildLane(pair, origin + Vector3.new(12, 0, 0), world, startStage)
	return pair, { a = laneA, b = laneB, flagA = flagA, flagB = flagB, origin = origin }
end

function Arena.despawn(pairFolder: Instance, delay: number?)
	task.delay(delay or 5, function()
		if pairFolder.Parent then
			pairFolder:Destroy()
		end
	end)
end

return Arena
