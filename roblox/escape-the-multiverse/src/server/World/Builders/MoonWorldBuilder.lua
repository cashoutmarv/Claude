-- World 4: low-gravity moon base. Half the stages are vertical drops
-- (layColumn) between low-grav landing pads; the other half use the
-- standard forward row but spawn rotating stations as actual jump targets,
-- not just decoration. Large dark sphere "skybox" decorations float overhead.
local Base = require(script.Parent.BaseBuilder)
local LowGrav = require(script.Parent.Parent.Gimmicks.LowGravZone)
local Rotating = require(script.Parent.Parent.Gimmicks.RotatingStation)
local RNG = require(game:GetService("ReplicatedStorage").Shared.Modules.RNG)

local M = {}

local function spawnSkybox(stageFolder: Instance, originCF: CFrame, length: number)
	-- Two large dark spheres floating high above for celestial-body feel.
	for i = 1, 2 do
		local zOffset = -length * (8 + i * 6)
		Base.makeDecorPillar(
			stageFolder,
			originCF * CFrame.new((i % 2 == 0 and 60 or -60), 80, zOffset),
			18,
			Color3.fromRGB(20, 10, 30),
			Enum.Material.SmoothPlastic,
			"Ball"
		)
	end
end

function M:Build(stageFolder: Instance, originCF: CFrame, row: any, _deps: any)
	if Base.tryHandcrafted(stageFolder, originCF, row) then
		return
	end
	local rng = RNG.new(row.params.seed + 4)
	Base.makeStartAnchor(stageFolder, originCF)
	-- Even local-stages drop vertically; odd local-stages stay horizontal.
	local useColumn = (row.stage % 2 == 0)
	local cfs
	if useColumn then
		cfs = Base.layColumn(stageFolder, originCF, row.params, Color3.fromRGB(180, 180, 200))
	else
		cfs = Base.layRow(stageFolder, originCF, row.params, Color3.fromRGB(180, 180, 200))
	end

	Base.eachPlatform(stageFolder, function(plat, i, cf)
		plat.Material = Enum.Material.Concrete
		plat.Color = Color3.fromRGB(180, 180, 200)
		-- Low-grav zone over every 3rd platform for floaty jumps.
		if i % 3 == 0 then
			LowGrav.apply(plat, 0.25)
			plat.Color = Color3.fromRGB(120, 140, 200)
		end
	end)

	-- Insert rotating stations as required jump targets between platforms.
	-- Spawn one per ~5 platforms, sitting BETWEEN cfs[i] and cfs[i+1].
	local stationCount = math.max(1, math.floor(#cfs / 5))
	for s = 1, stationCount do
		local i = math.min(#cfs - 1, math.floor((#cfs * s) / (stationCount + 1)))
		if i >= 1 and cfs[i] and cfs[i + 1] then
			local mid = cfs[i]:Lerp(cfs[i + 1], 0.5)
			Rotating.apply(
				stageFolder,
				mid + Vector3.new(0, 2, 0),
				Vector3.new(row.params.width * 1.6, 0.6, row.params.width * 0.4),
				0.3 + 0.04 * row.stage
			)
		end
	end

	spawnSkybox(stageFolder, originCF, math.max(1, row.params.length))
	Base.finalize(stageFolder, cfs, row)
end
return M
