-- World 9: cyber tokyo. Stages 1-10 use a forward row; stages 11-19 use the
-- zig-zag layout for serpentine pathing; stage 20 reverts to forward for
-- a clean finale. Moving train platforms now SPAN the full path width;
-- laser grids stand as vertical fences the player must time under.
-- Decorative neon kanji billboards flank the path.
local Base = require(script.Parent.BaseBuilder)
local Train = require(script.Parent.Parent.Gimmicks.MovingTrain)
local Laser = require(script.Parent.Parent.Gimmicks.LaserGrid)
local RNG = require(game:GetService("ReplicatedStorage").Shared.Modules.RNG)

local M = {}

local KANJI_COLORS = {
	Color3.fromRGB(255, 0, 200),
	Color3.fromRGB(0, 220, 255),
	Color3.fromRGB(255, 220, 0),
}

function M:Build(stageFolder: Instance, originCF: CFrame, row: any, _deps: any)
	if Base.tryHandcrafted(stageFolder, originCF, row) then
		return
	end
	local rng = RNG.new(row.params.seed + 9)
	Base.makeStartAnchor(stageFolder, originCF)

	local cfs
	if row.stage >= 11 and row.stage <= 19 then
		cfs = Base.layZigZag(stageFolder, originCF, row.params, Color3.fromRGB(40, 0, 80), row.params.width * 1.6)
	else
		cfs = Base.layRow(stageFolder, originCF, row.params, Color3.fromRGB(40, 0, 80))
	end

	-- Pick laser slots up front.
	local laserCount = math.max(1, math.floor(row.params.gimmickDensity * row.params.length * 0.4))
	local laserSlots = {}
	while next(laserSlots) == nil or #laserSlots < laserCount do
		local idx = rng:Int(2, math.max(2, row.params.length - 1))
		laserSlots[idx] = true
		local count = 0
		for _ in pairs(laserSlots) do count += 1 end
		if count >= laserCount then break end
	end

	Base.eachPlatform(stageFolder, function(plat, i, cf)
		plat.Material = Enum.Material.Metal
		plat.Color = Color3.fromRGB(40, 0, 80)
		-- Train platforms span the full path width: travel BACK along the path
		-- (Z-axis forward = -Z) so the player must time their jump.
		if rng:Float() < row.params.gimmickDensity * 0.4 then
			-- Stretch the platform into a full-width train.
			plat.Size = Vector3.new(row.params.width * 2.2, 1, row.params.width * 0.7)
			plat.Color = Color3.fromRGB(255, 0, 200)
			Train.apply(plat, Vector3.new(rng:Pick({ -1, 1 }) * 14, 0, 0), 5 + rng:Range(-1, 1))
		end
		if cf and laserSlots[i] then
			-- Vertical-fence laser: rotated 90° about Z so it stands tall.
			Laser.apply(stageFolder, cf * CFrame.new(0, 5, 0) * CFrame.Angles(0, 0, math.rad(90)), row.params.width + 4, 1.4 - 0.05 * row.stage)
		end
		-- Neon kanji billboards every 4th platform on alternating sides.
		if cf and i % 4 == 0 then
			local side = (i % 8 == 0) and 1 or -1
			local b = Instance.new("Part")
			b.Name = "KanjiBillboard"
			b.Anchored = true
			b.CanCollide = false
			b.Material = Enum.Material.Neon
			b.Color = KANJI_COLORS[((i // 4) % #KANJI_COLORS) + 1]
			b.Size = Vector3.new(0.4, 8, 6)
			b.CFrame = cf * CFrame.new(side * (row.params.width + 6), 6, 0)
			b.Parent = stageFolder
		end
	end)

	Base.finalize(stageFolder, cfs, row)
end
return M
