-- World 2: candy apocalypse. Sticky slow-zones + bouncy gummies + frosting.
local Base = require(script.Parent.BaseBuilder)
local Sticky = require(script.Parent.Parent.Gimmicks.StickyZone)
local Bouncy = require(script.Parent.Parent.Gimmicks.BouncyGummy)
local RNG = require(game:GetService("ReplicatedStorage").Shared.Modules.RNG)

local CANDY_COLORS = {
	Color3.fromRGB(255, 180, 200),
	Color3.fromRGB(255, 220, 140),
	Color3.fromRGB(180, 240, 255),
	Color3.fromRGB(220, 180, 255),
}

local M = {}
function M:Build(stageFolder: Instance, originCF: CFrame, row: any, _deps: any)
	local rng = RNG.new(row.params.seed + 2)
	Base.standardBuild(stageFolder, originCF, row, Color3.fromRGB(255, 200, 220), function(plat)
		plat.Color = CANDY_COLORS[rng:Int(1, #CANDY_COLORS)]
		plat.Material = Enum.Material.Plastic
		local roll = rng:Float()
		if roll < row.params.gimmickDensity * 0.5 then
			Sticky.apply(plat, 0.4)
			plat.Material = Enum.Material.Glass
		elseif roll < row.params.gimmickDensity then
			Bouncy.apply(plat, 80)
			plat.Material = Enum.Material.Foil
		end
	end)
end
return M
