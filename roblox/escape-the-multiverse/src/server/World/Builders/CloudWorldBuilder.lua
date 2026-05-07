-- World 7: cloud city. Platforms arranged in 3-platform clusters with a
-- visible gap (wind-streamer) between clusters. Each cluster's middle
-- platform drifts; gold-rim pillars mark each stage exit.
local Base = require(script.Parent.BaseBuilder)
local Drifting = require(script.Parent.Parent.Gimmicks.DriftingCloud)
local Wind = require(script.Parent.Parent.Gimmicks.WindGust)
local RNG = require(game:GetService("ReplicatedStorage").Shared.Modules.RNG)

local M = {}

-- Cluster layout: 3 platforms close together, then a wider gap before the
-- next cluster of 3. Returns the CFrame list of every platform in order.
local function layClusters(stageFolder: Instance, originCF: CFrame, params: any, color: Color3?): { CFrame }
	local rng = RNG.new((params.seed or 0) + 7171)
	local platforms: { CFrame } = {}
	local cf = originCF
	for i = 1, params.length do
		-- Tight gap inside a cluster (cluster of 3); wide gap between clusters.
		local insideCluster = (i % 3 ~= 1)
		local jitter = rng:Range(-params.jumpJitter, params.jumpJitter) * 0.5
		local jump
		if insideCluster then
			jump = params.jumpAvg * 0.6 + jitter
		else
			jump = params.jumpAvg * 1.3 + jitter
		end
		cf = cf * CFrame.new(0, 0, -jump - params.width / 2)
		Base.makePlatform(stageFolder, cf, Vector3.new(params.width, 1, params.width), color)
		table.insert(platforms, cf)
	end
	for i = 1, params.killBricks do
		local idx = rng:Int(2, math.max(2, #platforms - 1))
		local at = platforms[idx]
		local side = rng:Pick({ -1, 1 })
		Base.makeKillBrick(stageFolder, at * CFrame.new(side * (params.width / 2 + 1.5), 0, 0), Vector3.new(2, 1, params.width))
	end
	return platforms
end

function M:Build(stageFolder: Instance, originCF: CFrame, row: any, _deps: any)
	if Base.tryHandcrafted(stageFolder, originCF, row) then
		return
	end
	local rng = RNG.new(row.params.seed + 7)
	Base.makeStartAnchor(stageFolder, originCF)
	local cfs = layClusters(stageFolder, originCF, row.params, Color3.fromRGB(240, 245, 255))

	Base.eachPlatform(stageFolder, function(plat, i, cf)
		plat.Material = Enum.Material.SmoothPlastic
		-- Cluster middle (i % 3 == 2 in cluster terms) drifts horizontally.
		if i % 3 == 2 and rng:Float() < math.max(0.4, row.params.gimmickDensity * 0.8) then
			Drifting.apply(plat, Vector3.new(rng:Pick({ -1, 1 }) * 8, 0, 0), 3 + rng:Range(-1, 1))
		end
	end)

	-- Wind streamers (visual + gust force) between clusters.
	for i = 1, #cfs - 1 do
		if (i % 3) == 0 then
			local mid = cfs[i]:Lerp(cfs[i + 1], 0.5)
			local zone = Instance.new("Part")
			zone.Name = "WindStreamer"
			zone.Size = Vector3.new(row.params.width + 2, 6, math.max(4, (cfs[i + 1].Position - cfs[i].Position).Magnitude))
			zone.Transparency = 0.85
			zone.Material = Enum.Material.ForceField
			zone.Color = Color3.fromRGB(220, 240, 255)
			zone.Anchored = true
			zone.CanCollide = false
			zone.CFrame = mid + Vector3.new(0, 4, 0)
			zone.Parent = stageFolder
			Wind.apply(zone, Vector3.new(0, 0, -1), 50 + 3 * row.stage)
		end
	end

	-- Gold-rim exit pillars beside the final platform.
	if #cfs > 0 then
		local last = cfs[#cfs]
		Base.makeDecorPillar(stageFolder, last * CFrame.new(-(row.params.width / 2 + 2), 0, 0), 12, Color3.fromRGB(255, 215, 0), Enum.Material.Neon)
		Base.makeDecorPillar(stageFolder, last * CFrame.new(row.params.width / 2 + 2, 0, 0), 12, Color3.fromRGB(255, 215, 0), Enum.Material.Neon)
	end

	Base.finalize(stageFolder, cfs, row)
end
return M
