-- Loads StageTable, dispatches each row to its world's builder. Builders are
-- registered into this table at Init time. Builds the workspace structure:
--   Workspace.Worlds.W{N}.S{stage}/{StartAnchor, EndAnchor, Platforms..., gimmicks...}

local Workspace = game:GetService("Workspace")

local Shared = require(game:GetService("ReplicatedStorage").Shared)
local StageTable = Shared.Config.StageTable
local Worlds = Shared.Config.Worlds
local Difficulty = Shared.Config.Difficulty

local Registry = {}
Registry.builders = {} :: { [string]: any }
Registry.deps = nil :: any

function Registry:Register(name: string, builder: any)
	self.builders[name] = builder
end

function Registry:SetDeps(deps: any)
	self.deps = deps
end

local function ensureWorldsFolder(): Folder
	local worlds = Workspace:FindFirstChild("Worlds")
	if not worlds then
		worlds = Instance.new("Folder")
		worlds.Name = "Worlds"
		worlds.Parent = Workspace
	end
	return worlds
end

local function worldOriginCF(worldId: number): CFrame
	-- Each world is offset on X so they all coexist in workspace.
	return CFrame.new((worldId - 1) * 2000, 50, 0)
end

local function buildStage(self, row: any): Folder
	local worlds = ensureWorldsFolder()
	local wFolder = worlds:FindFirstChild("W" .. row.world)
	if not wFolder then
		wFolder = Instance.new("Folder")
		wFolder.Name = "W" .. row.world
		wFolder.Parent = worlds
	end
	local sFolder = Instance.new("Folder")
	sFolder.Name = "S" .. row.stage
	sFolder.Parent = wFolder

	-- Compute origin CF: walk forward by previous-stage cumulative jump length.
	-- Simple approximation: each stage takes `length * (jumpAvg + width)` studs.
	local len = Difficulty.stageLength(row.world, 1) * (Difficulty.jumpDistance(row.world, 1) + 4)
	local originCF = worldOriginCF(row.world) * CFrame.new(0, 0, -(row.stage - 1) * len)

	local builder = self.builders[row.builder]
	if not builder or not builder.Build then
		warn("[StageRegistry] Missing builder: " .. tostring(row.builder))
		-- Fallback: simple grey row.
		local BaseBuilder = require(script.Parent.Builders.BaseBuilder)
		BaseBuilder.makeStartAnchor(sFolder, originCF)
		local cfs = BaseBuilder.layRow(sFolder, originCF, row.params)
		BaseBuilder.makeEndAnchor(sFolder, cfs[#cfs] * CFrame.new(0, 0, -row.params.jumpAvg - row.params.width / 2), row.world, row.stage)
		return sFolder
	end
	builder:Build(sFolder, originCF, row, self.deps)
	return sFolder
end

function Registry:LoadAll()
	for _, row in ipairs(StageTable) do
		buildStage(self, row)
	end
end

return Registry
