-- World 10: THE VOID. Pitch black, glowing edges. Most platforms are invisible
-- until touched. The final stage carries the gold VIP barrier.

local Base = require(script.Parent.BaseBuilder)
local Invisible = require(script.Parent.Parent.Gimmicks.InvisiblePart)
local Laser = require(script.Parent.Parent.Gimmicks.LaserGrid)
local RNG = require(game:GetService("ReplicatedStorage").Shared.Modules.RNG)

local M = {}

local function makeVIPGate(stageFolder: Instance, anchorCF: CFrame, deps: any)
	local barrier = Instance.new("Part")
	barrier.Name = "VIPBarrier"
	barrier.Size = Vector3.new(20, 10, 1)
	barrier.Material = Enum.Material.Neon
	barrier.Color = Color3.fromRGB(255, 215, 0)
	barrier.Transparency = 0.2
	barrier.Anchored = true
	barrier.CFrame = anchorCF * CFrame.new(0, 5, -8)
	barrier.Parent = stageFolder
	if deps and deps.VIP then
		deps.VIP:TagBarrier(barrier)
	end
	-- Gold sparkle particles.
	local att = Instance.new("Attachment", barrier)
	local emit = Instance.new("ParticleEmitter")
	emit.Texture = "rbxasset://textures/particles/sparkles_main.dds"
	emit.LightEmission = 1
	emit.Color = ColorSequence.new(Color3.fromRGB(255, 230, 100))
	emit.Lifetime = NumberRange.new(1.2)
	emit.Rate = 30
	emit.Speed = NumberRange.new(2)
	emit.Parent = att

	-- Reward zone behind the barrier.
	local reward = Instance.new("Part")
	reward.Name = "VIPReward"
	reward.Size = Vector3.new(40, 1, 40)
	reward.Material = Enum.Material.Neon
	reward.Color = Color3.fromRGB(255, 215, 0)
	reward.Anchored = true
	reward.CFrame = anchorCF * CFrame.new(0, 0, -36)
	reward.Parent = stageFolder
end

function M:Build(stageFolder: Instance, originCF: CFrame, row: any, deps: any)
	local rng = RNG.new(row.params.seed + 10)
	local lastCF: CFrame
	Base.standardBuild(stageFolder, originCF, row, Color3.fromRGB(20, 0, 30), function(plat, _i, cf)
		plat.Color = Color3.fromRGB(80, 0, 120)
		if rng:Float() < row.params.gimmickDensity then
			Invisible.apply(plat)
		end
		if rng:Float() < row.params.gimmickDensity * 0.4 then
			Laser.apply(stageFolder, cf + Vector3.new(0, 5, 0), row.params.width + 4, math.max(0.6, 1.2 - 0.05 * row.stage))
		end
		lastCF = cf
	end)
	if row.world == 10 and row.stage == 20 and lastCF then
		makeVIPGate(stageFolder, lastCF, deps)
	end
end
return M
