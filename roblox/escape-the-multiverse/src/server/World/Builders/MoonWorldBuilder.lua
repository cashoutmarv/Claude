-- World 4: low-gravity moon base. Low-grav zones + rotating stations.
local Base = require(script.Parent.BaseBuilder)
local LowGrav = require(script.Parent.Parent.Gimmicks.LowGravZone)
local Rotating = require(script.Parent.Parent.Gimmicks.RotatingStation)
local RNG = require(game:GetService("ReplicatedStorage").Shared.Modules.RNG)

local M = {}
function M:Build(stageFolder: Instance, originCF: CFrame, row: any, _deps: any)
	local rng = RNG.new(row.params.seed + 4)
	local rotateSpots: { CFrame } = {}
	Base.standardBuild(stageFolder, originCF, row, Color3.fromRGB(180, 180, 200), function(plat, _i, cf)
		plat.Material = Enum.Material.Concrete
		if rng:Float() < row.params.gimmickDensity * 0.7 then
			LowGrav.apply(plat, 0.25)
			plat.Color = Color3.fromRGB(120, 140, 200)
		end
		if rng:Float() < 0.06 then
			table.insert(rotateSpots, cf)
		end
	end)
	for _, cf in ipairs(rotateSpots) do
		Rotating.apply(stageFolder, cf * CFrame.new(0, 4, 0), Vector3.new(row.params.width * 1.6, 0.6, row.params.width * 0.4), 0.4 + 0.05 * row.stage)
	end
end
return M
