-- World 1: corrupted neon matrix. Some platforms phase out on a timer.
local Base = require(script.Parent.BaseBuilder)
local Disappearing = require(script.Parent.Parent.Gimmicks.DisappearingPlatform)
local RNG = require(game:GetService("ReplicatedStorage").Shared.Modules.RNG)

local M = {}

function M:Build(stageFolder: Instance, originCF: CFrame, row: any, _deps: any)
	local rng = RNG.new(row.params.seed + 1)
	Base.standardBuild(stageFolder, originCF, row, Color3.fromRGB(200, 0, 220), function(plat)
		plat.Material = Enum.Material.Neon
		if rng:Float() < row.params.gimmickDensity then
			Disappearing.apply(plat, math.max(0.6, 2 - 0.05 * (row.world + row.stage)))
		end
	end)
end

return M
