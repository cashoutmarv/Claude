-- World 5: underwater abyss. S-shaped curve so the secret room at S8 is
-- genuinely off-line; bubble currents pull perpendicular to path direction;
-- glowing decorative coral arches frame the path.
--
-- PRESERVED: params.secretHook == "AbyssSecretS8" still spawns the
-- AbyssSecretPlatform and fires Badge.SecretRoomEntered.

local Base = require(script.Parent.BaseBuilder)
local Bubble = require(script.Parent.Parent.Gimmicks.BubbleCurrent)
local RNG = require(game:GetService("ReplicatedStorage").Shared.Modules.RNG)

local M = {}

-- Curved S-path: each platform offset on X by an amount tracing one full sine.
local function laySCurve(stageFolder: Instance, originCF: CFrame, params: any, color: Color3?): { CFrame }
	local rng = RNG.new((params.seed or 0) + 5151)
	local platforms: { CFrame } = {}
	local cf = originCF
	local amp = params.width * 1.8
	for i = 1, params.length do
		local jitter = rng:Range(-params.jumpJitter, params.jumpJitter)
		local jump = params.jumpAvg + jitter
		cf = cf * CFrame.new(0, 0, -jump - params.width / 2)
		-- Full sine wave across the stage length (one S-curve total).
		local theta = (i / math.max(1, params.length)) * math.pi * 2
		local sideOffset = math.sin(theta) * amp
		local placed = cf * CFrame.new(sideOffset, 0, 0)
		Base.makePlatform(stageFolder, placed, Vector3.new(params.width, 1, params.width), color)
		table.insert(platforms, placed)
	end
	for i = 1, params.killBricks do
		local idx = rng:Int(2, math.max(2, #platforms - 1))
		local at = platforms[idx]
		local side = rng:Pick({ -1, 1 })
		Base.makeKillBrick(stageFolder, at * CFrame.new(side * (params.width / 2 + 1.5), 0, 0), Vector3.new(2, 1, params.width))
	end
	return platforms
end

local function spawnSecretRoom(stageFolder: Instance, anchorCF: CFrame, deps: any)
	-- Hidden platform 28 studs to the right of the stage line, 8 studs lower:
	-- requires a deliberate side-jump. Decorative coral hides it from view from
	-- the main path.
	local hiddenCF = anchorCF * CFrame.new(28, -8, -10)
	local plat = Instance.new("Part")
	plat.Name = "AbyssSecretPlatform"
	plat.Size = Vector3.new(8, 1, 8)
	plat.Material = Enum.Material.Neon
	plat.Color = Color3.fromRGB(255, 230, 200)
	plat.Anchored = true
	plat.CFrame = hiddenCF
	plat.Parent = stageFolder

	-- Decorative "coral" wall blocking direct sight.
	local wall = Instance.new("Part")
	wall.Size = Vector3.new(2, 14, 14)
	wall.Material = Enum.Material.SmoothPlastic
	wall.Color = Color3.fromRGB(50, 0, 80)
	wall.Anchored = true
	wall.CanCollide = false
	wall.Transparency = 0.2
	wall.CFrame = anchorCF * CFrame.new(14, 4, -10)
	wall.Parent = stageFolder

	plat.Touched:Connect(function(hit)
		local plr = game.Players:GetPlayerFromCharacter(hit.Parent)
		if plr and deps and deps.Badge then
			deps.Badge.SecretRoomEntered:Fire(plr)
		end
	end)
end

function M:Build(stageFolder: Instance, originCF: CFrame, row: any, deps: any)
	if Base.tryHandcrafted(stageFolder, originCF, row) then
		return
	end
	local rng = RNG.new(row.params.seed + 5)
	Base.makeStartAnchor(stageFolder, originCF)
	local cfs = laySCurve(stageFolder, originCF, row.params, Color3.fromRGB(0, 80, 160))

	Base.eachPlatform(stageFolder, function(plat, i, cf)
		plat.Material = Enum.Material.Neon
		plat.Color = Color3.fromRGB(40 + rng:Int(0, 80), 100 + rng:Int(0, 100), 200)
		if cf and rng:Float() < row.params.gimmickDensity then
			-- Bubble current PERPENDICULAR to forward path direction. Since the
			-- path is curving, simple X-axis push is "perpendicular enough" and
			-- threatens to kick the player off the curve.
			local zone = Instance.new("Part")
			zone.Size = Vector3.new(row.params.width + 6, 8, row.params.width)
			zone.Material = Enum.Material.ForceField
			zone.Color = Color3.fromRGB(150, 220, 255)
			zone.Transparency = 0.7
			zone.Anchored = true
			zone.CanCollide = false
			zone.CFrame = cf + Vector3.new(0, 4, 0)
			zone.Parent = stageFolder
			local dir = rng:Pick({ Vector3.new(1, 0, 0), Vector3.new(-1, 0, 0) })
			Bubble.apply(zone, dir, 60 + 4 * row.stage)
		end
		-- Coral arches every 5th platform.
		if cf and i % 5 == 0 then
			Base.makeArch(stageFolder, cf * CFrame.new(0, 0, -row.params.width / 2 - 1), row.params.width + 4, Color3.fromRGB(255, 80, 180))
		end
	end)

	local lastCF = cfs[#cfs]
	if row.params.secretHook == "AbyssSecretS8" and lastCF then
		spawnSecretRoom(stageFolder, lastCF, deps)
	end
	Base.finalize(stageFolder, cfs, row)
end
return M
