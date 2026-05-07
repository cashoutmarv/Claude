-- World 8: the backrooms. Fluorescent ceiling, flickering lamps every few stages.
local Base = require(script.Parent.BaseBuilder)
local Flicker = require(script.Parent.Parent.Gimmicks.FlickerLight)
local RNG = require(game:GetService("ReplicatedStorage").Shared.Modules.RNG)

local M = {}
function M:Build(stageFolder: Instance, originCF: CFrame, row: any, _deps: any)
	local rng = RNG.new(row.params.seed + 8)
	Base.standardBuild(stageFolder, originCF, row, Color3.fromRGB(200, 180, 100), function(plat, _i, cf)
		plat.Material = Enum.Material.Plastic
		plat.Color = Color3.fromRGB(200, 180, 100)
		if rng:Float() < row.params.gimmickDensity * 0.5 then
			Flicker.apply(stageFolder, cf + Vector3.new(0, 14, 0))
		end
	end)
	-- A simple "ceiling" at fixed height for atmosphere.
	local ceiling = Instance.new("Part")
	ceiling.Anchored = true
	ceiling.CanCollide = false
	ceiling.Material = Enum.Material.Plastic
	ceiling.Color = Color3.fromRGB(220, 200, 130)
	ceiling.Size = Vector3.new(60, 1, 60 + row.params.length * (row.params.jumpAvg + row.params.width))
	ceiling.CFrame = originCF * CFrame.new(0, 18, -row.params.length * (row.params.jumpAvg + row.params.width) / 2)
	ceiling.Parent = stageFolder
end
return M
