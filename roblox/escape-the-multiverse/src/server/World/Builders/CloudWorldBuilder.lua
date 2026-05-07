-- World 7: cloud city. Drifting clouds + wind gusts.
local Base = require(script.Parent.BaseBuilder)
local Drifting = require(script.Parent.Parent.Gimmicks.DriftingCloud)
local Wind = require(script.Parent.Parent.Gimmicks.WindGust)
local RNG = require(game:GetService("ReplicatedStorage").Shared.Modules.RNG)

local M = {}
function M:Build(stageFolder: Instance, originCF: CFrame, row: any, _deps: any)
	local rng = RNG.new(row.params.seed + 7)
	Base.standardBuild(stageFolder, originCF, row, Color3.fromRGB(240, 245, 255), function(plat, _i, cf)
		plat.Material = Enum.Material.SmoothPlastic
		if rng:Float() < row.params.gimmickDensity * 0.6 then
			Drifting.apply(plat, Vector3.new(rng:Pick({ -1, 1 }) * 8, 0, 0), 3 + rng:Range(-1, 1))
		end
		if rng:Float() < 0.18 then
			-- Wind gust zone above the platform.
			local zone = Instance.new("Part")
			zone.Size = Vector3.new(row.params.width + 4, 6, row.params.width)
			zone.Transparency = 0.85
			zone.Material = Enum.Material.ForceField
			zone.Color = Color3.fromRGB(220, 240, 255)
			zone.Anchored = true
			zone.CanCollide = false
			zone.CFrame = cf + Vector3.new(0, 5, 0)
			zone.Parent = stageFolder
			Wind.apply(zone, Vector3.new(rng:Pick({ -1, 1 }), 0, 0), 50 + 3 * row.stage)
		end
	end)
end
return M
