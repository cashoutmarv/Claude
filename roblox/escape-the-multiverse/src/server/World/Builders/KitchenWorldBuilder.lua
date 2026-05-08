-- World 6: hell's kitchen. Alternating countertop-bridge pattern: wide flat
-- countertop platforms separated by narrow bridge sections. Blender blades
-- spin over the narrow bridges; rolling pins sweep across the full path
-- width on a duty cycle.
local Base = require(script.Parent.BaseBuilder)
local Blender = require(script.Parent.Parent.Gimmicks.BlenderBlade)
local Pin = require(script.Parent.Parent.Gimmicks.RollingPin)
local RNG = require(game:GetService("ReplicatedStorage").Shared.Modules.RNG)

local M = {}

-- Custom layout: alternates wide "countertop" platforms with narrow "bridge"
-- platforms. Returns the resulting CFrame list in order.
local function layCounterBridge(stageFolder: Instance, originCF: CFrame, params: any): { CFrame, { boolean } }
	local rng = RNG.new((params.seed or 0) + 6161)
	local platforms: { CFrame } = {}
	local isBridge: { boolean } = {}
	local cf = originCF
	for i = 1, params.length do
		local jitter = rng:Range(-params.jumpJitter, params.jumpJitter)
		local jump = params.jumpAvg + jitter
		cf = cf * CFrame.new(0, 0, -jump - params.width / 2)
		local bridge = (i % 2 == 0) -- every other platform is a narrow bridge
		isBridge[i] = bridge
		local size
		if bridge then
			size = Vector3.new(math.max(2.5, params.width * 0.5), 1, params.width)
		else
			size = Vector3.new(params.width * 1.4, 1, params.width)
		end
		local plat = Base.makePlatform(stageFolder, cf, size, Color3.fromRGB(220, 220, 230))
		plat.Material = bridge and Enum.Material.Metal or Enum.Material.DiamondPlate
		table.insert(platforms, cf)
	end
	for i = 1, params.killBricks do
		local idx = rng:Int(2, math.max(2, #platforms - 1))
		local at = platforms[idx]
		local side = rng:Pick({ -1, 1 })
		Base.makeKillBrick(stageFolder, at * CFrame.new(side * (params.width / 2 + 1.5), 0, 0), Vector3.new(2, 1, params.width))
	end
	return platforms, isBridge
end

function M:Build(stageFolder: Instance, originCF: CFrame, row: any, _deps: any)
	if Base.tryHandcrafted(stageFolder, originCF, row) then
		return
	end
	local rng = RNG.new(row.params.seed + 6)
	Base.makeStartAnchor(stageFolder, originCF)
	local cfs, isBridge = layCounterBridge(stageFolder, originCF, row.params)

	-- Blender blades over narrow bridges.
	for i, bridge in ipairs(isBridge) do
		if bridge and cfs[i] and rng:Float() < math.max(0.4, row.params.gimmickDensity) then
			Blender.apply(stageFolder, cfs[i] * CFrame.new(0, 5, 0))
		end
	end
	-- Rolling pins crossing wide countertops.
	for i, bridge in ipairs(isBridge) do
		if (not bridge) and cfs[i] and rng:Float() < row.params.gimmickDensity * 0.6 then
			Pin.apply(stageFolder, cfs[i] * CFrame.new(0, 3, 0), row.params.width * 1.4 + 6, 1.6)
		end
	end

	-- Decorative stainless wall behind the path on both sides for "kitchen" feel.
	local span = math.max(1, #cfs) * (row.params.jumpAvg + row.params.width)
	Base.makeDecorWall(
		stageFolder,
		originCF * CFrame.new(-(row.params.width + 6), 5, -span / 2),
		span,
		10,
		Color3.fromRGB(180, 180, 200),
		Enum.Material.Metal
	)
	Base.makeDecorWall(
		stageFolder,
		originCF * CFrame.new(row.params.width + 6, 5, -span / 2),
		span,
		10,
		Color3.fromRGB(180, 180, 200),
		Enum.Material.Metal
	)

	Base.finalize(stageFolder, cfs, row)
end
return M
