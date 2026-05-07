-- World 3: ancient stone temple. Crumbling floors + occasional rolling boulders.
local Base = require(script.Parent.BaseBuilder)
local Crumble = require(script.Parent.Parent.Gimmicks.CrumblingFloor)
local Boulder = require(script.Parent.Parent.Gimmicks.BoulderRoller)
local RNG = require(game:GetService("ReplicatedStorage").Shared.Modules.RNG)

local M = {}
function M:Build(stageFolder: Instance, originCF: CFrame, row: any, _deps: any)
	local rng = RNG.new(row.params.seed + 3)
	local platforms: { CFrame } = {}
	Base.standardBuild(stageFolder, originCF, row, Color3.fromRGB(180, 140, 80), function(plat, _i, cf)
		plat.Material = Enum.Material.Slate
		table.insert(platforms, cf)
		if rng:Float() < row.params.gimmickDensity * 0.6 then
			Crumble.apply(plat, 0.4)
			plat.Color = Color3.fromRGB(150, 110, 60)
		end
	end)
	-- A boulder per ~5 stages, rolling along the row's center line.
	if #platforms >= 4 and rng:Float() < math.min(0.6, row.params.gimmickDensity) then
		local lift = Vector3.new(0, 6, 0)
		local pts = {
			platforms[1].Position + lift,
			platforms[math.floor(#platforms / 2)].Position + lift,
			platforms[#platforms].Position + lift,
		}
		Boulder.apply(stageFolder, pts, 12 + row.world)
	end
end
return M
