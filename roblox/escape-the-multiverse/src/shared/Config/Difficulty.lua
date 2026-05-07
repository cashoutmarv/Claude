-- Pure difficulty curve. Inputs world ∈ [1,10], stage ∈ [1,20].
-- All exports are deterministic so tests can pin down expected values.

local Difficulty = {}

Difficulty.MIN_PLATFORM_WIDTH = 2.5

function Difficulty.globalStage(world: number, stage: number): number
	return (world - 1) * 20 + stage
end

function Difficulty.jumpDistance(world: number, stage: number): number
	return 8 + 0.6 * (world - 1) + 0.15 * stage
end

function Difficulty.platformWidth(world: number, stage: number): number
	local raw = 8 - 0.4 * (world - 1) - 0.05 * stage
	return math.max(Difficulty.MIN_PLATFORM_WIDTH, raw)
end

function Difficulty.movingPlatformSpeed(world: number, stage: number): number
	return 4 + 1.2 * (world - 1) + 0.3 * stage
end

function Difficulty.gimmickDensity(world: number, stage: number): number
	return math.min(1, 0.20 + 0.06 * (world - 1) + 0.02 * stage)
end

function Difficulty.killBrickDensity(world: number, stage: number): number
	return math.min(1, 0.05 + 0.04 * (world - 1) + 0.01 * stage)
end

function Difficulty.stageLength(world: number, stage: number): number
	return 10 + math.floor((world + stage) / 3)
end

function Difficulty.killBrickCount(world: number, stage: number): number
	return math.floor(Difficulty.stageLength(world, stage) * Difficulty.killBrickDensity(world, stage))
end

return Difficulty
