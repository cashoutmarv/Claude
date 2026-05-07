-- 200 stage definitions. Milestones (stages 1, 10, 15, 20 of each world) are
-- marked handcrafted=true and load .rbxmx assets from Workspace/MilestoneStages/.
-- The other 160 are emitted procedurally from Difficulty + per-world signature
-- gimmicks. seed = world*10000 + stage*100, all unique.

local Worlds = require(script.Parent.Worlds)
local Difficulty = require(script.Parent.Difficulty)

local function isMilestone(stage: number): boolean
	return stage == 1 or stage == 10 or stage == 15 or stage == 20
end

local function buildRow(world: number, stage: number)
	local worldDef = Worlds[world]
	local len = Difficulty.stageLength(world, stage)
	local jump = Difficulty.jumpDistance(world, stage)
	local width = Difficulty.platformWidth(world, stage)
	local kb = Difficulty.killBrickCount(world, stage)
	local density = Difficulty.gimmickDensity(world, stage)

	-- Per-world gimmick density tweak: world 10 uses InvisiblePart everywhere.
	local gimmicks = {}
	for _, g in ipairs(worldDef.signature) do
		table.insert(gimmicks, g)
	end
	if world == 10 then
		density = math.min(1, density + 0.2)
	end

	local params: { [string]: any } = {
		length = len,
		jumpAvg = jump,
		jumpJitter = math.min(3, 0.5 + 0.2 * stage),
		width = width,
		killBricks = kb,
		gimmicks = gimmicks,
		gimmickDensity = density,
		seed = world * 10000 + stage * 100,
	}
	if stage == 15 then
		params.skipGate = true
	end
	if stage == 20 then
		params.portalAfter = (world < 10)
	end
	if world == 5 and stage == 8 then
		params.secretHook = "AbyssSecretS8"
	end

	local handcrafted = isMilestone(stage)
	return {
		globalId = Difficulty.globalStage(world, stage),
		world = world,
		stage = stage,
		handcrafted = handcrafted,
		asset = handcrafted and string.format("W%d_S%02d", world, stage) or nil,
		builder = worldDef.builder,
		params = params,
	}
end

local rows = {}
for w = 1, 10 do
	for s = 1, 20 do
		table.insert(rows, buildRow(w, s))
	end
end

assert(#rows == 200, "StageTable must be exactly 200 rows")

return rows
