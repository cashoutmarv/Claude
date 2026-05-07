-- World 3: ancient stone temple corridor. Two parallel decorative wall rows
-- flank the platforms; crumbling floors are arranged in groups of 3 so the
-- player has to commit to a sprint across a fragile section.
local Base = require(script.Parent.BaseBuilder)
local Crumble = require(script.Parent.Parent.Gimmicks.CrumblingFloor)
local Boulder = require(script.Parent.Parent.Gimmicks.BoulderRoller)
local RNG = require(game:GetService("ReplicatedStorage").Shared.Modules.RNG)

local M = {}
function M:Build(stageFolder: Instance, originCF: CFrame, row: any, _deps: any)
	if Base.tryHandcrafted(stageFolder, originCF, row) then
		return
	end
	local rng = RNG.new(row.params.seed + 3)
	Base.makeStartAnchor(stageFolder, originCF)
	local cfs = Base.layRow(stageFolder, originCF, row.params, Color3.fromRGB(180, 140, 80))

	-- Determine groups-of-3 crumble starts. We pick floor(density * len/3) groups.
	local groupCount = math.max(1, math.floor(row.params.gimmickDensity * row.params.length / 3))
	local crumbleSet: { [number]: boolean } = {}
	for _ = 1, groupCount do
		local start = rng:Int(2, math.max(2, #cfs - 3))
		for off = 0, 2 do
			crumbleSet[start + off] = true
		end
	end

	Base.eachPlatform(stageFolder, function(plat, i, cf)
		plat.Material = Enum.Material.Slate
		plat.Color = Color3.fromRGB(180, 140, 80)
		if crumbleSet[i] then
			Crumble.apply(plat, 0.4)
			plat.Color = Color3.fromRGB(150, 110, 60)
			plat.Material = Enum.Material.Sand
		end
		-- Decorative parallel walls flanking the corridor at each platform.
		if cf and i % 2 == 1 then
			Base.makeDecorWall(
				stageFolder,
				cf * CFrame.new(-(row.params.width / 2 + 2), 4, 0),
				row.params.width + 2,
				8,
				Color3.fromRGB(160, 130, 90),
				Enum.Material.Slate
			)
			Base.makeDecorWall(
				stageFolder,
				cf * CFrame.new(row.params.width / 2 + 2, 4, 0),
				row.params.width + 2,
				8,
				Color3.fromRGB(160, 130, 90),
				Enum.Material.Slate
			)
		end
		-- Torch markers atop the walls every 4th platform.
		if cf and i % 4 == 0 then
			Base.makeDecorPillar(stageFolder, cf * CFrame.new(-(row.params.width / 2 + 2), 8, 0), 2, Color3.fromRGB(255, 140, 30), Enum.Material.Neon, "Ball")
		end
	end)

	-- Optional boulder rolling along the central corridor.
	if #cfs >= 4 and rng:Float() < math.min(0.6, row.params.gimmickDensity) then
		local lift = Vector3.new(0, 6, 0)
		local pts = {
			cfs[1].Position + lift,
			cfs[math.floor(#cfs / 2)].Position + lift,
			cfs[#cfs].Position + lift,
		}
		Boulder.apply(stageFolder, pts, 12 + row.world)
	end
	Base.finalize(stageFolder, cfs, row)
end
return M
