-- World 9: cyber tokyo. Moving train platforms + laser grids.
local Base = require(script.Parent.BaseBuilder)
local Train = require(script.Parent.Parent.Gimmicks.MovingTrain)
local Laser = require(script.Parent.Parent.Gimmicks.LaserGrid)
local RNG = require(game:GetService("ReplicatedStorage").Shared.Modules.RNG)

local M = {}
function M:Build(stageFolder: Instance, originCF: CFrame, row: any, _deps: any)
	local rng = RNG.new(row.params.seed + 9)
	local lasers = math.max(1, math.floor(row.params.gimmickDensity * row.params.length * 0.4))
	local laserSlots = {}
	while #laserSlots < lasers do
		local i = rng:Int(2, math.max(2, row.params.length - 1))
		laserSlots[i] = true
	end
	Base.standardBuild(stageFolder, originCF, row, Color3.fromRGB(200, 0, 200), function(plat, i, cf)
		plat.Material = Enum.Material.Metal
		plat.Color = Color3.fromRGB(40, 0, 80)
		if rng:Float() < row.params.gimmickDensity * 0.4 then
			Train.apply(plat, Vector3.new(rng:Pick({ -1, 1 }) * 16, 0, 0), 5 + rng:Range(-1, 1))
		end
		if laserSlots[i] then
			Laser.apply(stageFolder, cf + Vector3.new(0, 5, 0), row.params.width + 4, 1.4 - 0.05 * row.stage)
		end
	end)
end
return M
