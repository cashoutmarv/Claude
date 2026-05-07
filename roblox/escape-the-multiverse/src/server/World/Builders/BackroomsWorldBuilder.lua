-- World 8: the backrooms. Maze layout (layMaze) with intentional dead-ends.
-- Full-length yellow wallpaper walls flank the navigable area. Every couple
-- of stages a flickering ceiling lamp adds the characteristic dread.
local Base = require(script.Parent.BaseBuilder)
local Flicker = require(script.Parent.Parent.Gimmicks.FlickerLight)
local RNG = require(game:GetService("ReplicatedStorage").Shared.Modules.RNG)

local M = {}
function M:Build(stageFolder: Instance, originCF: CFrame, row: any, _deps: any)
	if Base.tryHandcrafted(stageFolder, originCF, row) then
		return
	end
	local rng = RNG.new(row.params.seed + 8)
	Base.makeStartAnchor(stageFolder, originCF)

	-- Alternate maze (even stages) and branching (odd stages) so traversal
	-- still feels varied within the maze theme. Both yield dead-ends.
	local cfs
	if row.stage % 2 == 0 then
		cfs = Base.layMaze(stageFolder, originCF, row.params, Color3.fromRGB(200, 180, 100))
	else
		cfs = Base.layBranching(stageFolder, originCF, row.params, Color3.fromRGB(200, 180, 100))
	end

	Base.eachPlatform(stageFolder, function(plat, i, cf)
		plat.Material = Enum.Material.Plastic
		plat.Color = Color3.fromRGB(200, 180, 100)
		if cf and rng:Float() < row.params.gimmickDensity * 0.5 then
			Flicker.apply(stageFolder, cf + Vector3.new(0, 14, 0))
		end
	end)

	-- Full-length yellow wallpaper walls and a low ceiling for that liminal
	-- "office hallway" claustrophobia.
	local len = math.max(40, row.params.length * (row.params.jumpAvg + row.params.width))
	Base.makeDecorWall(
		stageFolder,
		originCF * CFrame.new(-30, 6, -len / 2),
		len,
		12,
		Color3.fromRGB(220, 200, 100),
		Enum.Material.Plastic
	)
	Base.makeDecorWall(
		stageFolder,
		originCF * CFrame.new(30, 6, -len / 2),
		len,
		12,
		Color3.fromRGB(220, 200, 100),
		Enum.Material.Plastic
	)
	-- Ceiling tile.
	local ceiling = Instance.new("Part")
	ceiling.Anchored = true
	ceiling.CanCollide = false
	ceiling.Material = Enum.Material.Plastic
	ceiling.Color = Color3.fromRGB(220, 200, 130)
	ceiling.Size = Vector3.new(60, 1, len)
	ceiling.CFrame = originCF * CFrame.new(0, 14, -len / 2)
	ceiling.Name = "Ceiling"
	ceiling.Parent = stageFolder

	Base.finalize(stageFolder, cfs, row)
end
return M
