-- World 6: hell's kitchen. Spinning blades + rolling pins.
local Base = require(script.Parent.BaseBuilder)
local Blender = require(script.Parent.Parent.Gimmicks.BlenderBlade)
local Pin = require(script.Parent.Parent.Gimmicks.RollingPin)
local RNG = require(game:GetService("ReplicatedStorage").Shared.Modules.RNG)

local M = {}
function M:Build(stageFolder: Instance, originCF: CFrame, row: any, _deps: any)
	local rng = RNG.new(row.params.seed + 6)
	Base.standardBuild(stageFolder, originCF, row, Color3.fromRGB(220, 220, 230), function(plat, _i, cf)
		plat.Material = Enum.Material.Metal
		local roll = rng:Float()
		if roll < row.params.gimmickDensity * 0.4 then
			Blender.apply(stageFolder, cf * CFrame.new(0, 5, 0))
		elseif roll < row.params.gimmickDensity then
			Pin.apply(stageFolder, cf * CFrame.new(0, 3, 0), row.params.width + 6, 1.6)
		end
	end)
end
return M
