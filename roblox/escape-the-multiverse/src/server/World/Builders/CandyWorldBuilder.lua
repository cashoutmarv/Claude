-- World 2: candy apocalypse. Strict alternating Sticky/Bouncy chain so the
-- player learns the rhythm; oversized gumdrop spheres and lollipop pillars
-- flank the path as scenery.
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
	if Base.tryHandcrafted(stageFolder, originCF, row) then
		return
	end
	local rng = RNG.new(row.params.seed + 2)
	Base.makeStartAnchor(stageFolder, originCF)
	local cfs = Base.layRow(stageFolder, originCF, row.params, Color3.fromRGB(255, 200, 220))
	Base.eachPlatform(stageFolder, function(plat, i, cf)
		plat.Color = CANDY_COLORS[((i - 1) % #CANDY_COLORS) + 1]
		-- Strict alternation, gated on density: even=sticky, odd=bouncy.
		if i % 2 == 0 then
			Sticky.apply(plat, 0.4)
			plat.Material = Enum.Material.Glass
			plat.Color = Color3.fromRGB(255, 100, 180)
		else
			Bouncy.apply(plat, 80)
			plat.Material = Enum.Material.Foil
			plat.Color = Color3.fromRGB(255, 220, 120)
		end
		-- Flank with gumdrop spheres (left) + lollipop pillars (right) every 3rd.
		if cf and i % 3 == 0 then
			Base.makeDecorPillar(
				stageFolder,
				cf * CFrame.new(-(row.params.width + 5), -1, 0),
				6,
				rng:Pick({ Color3.fromRGB(255, 80, 140), Color3.fromRGB(120, 220, 255), Color3.fromRGB(255, 200, 80) }),
				Enum.Material.SmoothPlastic,
				"Ball"
			)
			-- Lollipop: tall thin pillar topped with a sphere.
			Base.makeDecorPillar(
				stageFolder,
				cf * CFrame.new(row.params.width + 5, 0, 0),
				14,
				Color3.fromRGB(240, 240, 220),
				Enum.Material.SmoothPlastic
			)
			Base.makeDecorPillar(
				stageFolder,
				cf * CFrame.new(row.params.width + 5, 14, 0),
				4,
				rng:Pick({ Color3.fromRGB(255, 100, 100), Color3.fromRGB(100, 200, 255), Color3.fromRGB(220, 120, 255) }),
				Enum.Material.SmoothPlastic,
				"Ball"
			)
		end
	end)
	Base.finalize(stageFolder, cfs, row)
end
return M
