-- World 5: underwater abyss. Bioluminescent platforms + bubble currents +
-- hidden secret room on stage 8 (precise side jump → BadgeService grants).

local Base = require(script.Parent.BaseBuilder)
local Bubble = require(script.Parent.Parent.Gimmicks.BubbleCurrent)
local RNG = require(game:GetService("ReplicatedStorage").Shared.Modules.RNG)

local M = {}

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
	local rng = RNG.new(row.params.seed + 5)
	local lastCF: CFrame
	Base.standardBuild(stageFolder, originCF, row, Color3.fromRGB(0, 80, 160), function(plat, _i, cf)
		plat.Material = Enum.Material.Neon
		plat.Color = Color3.fromRGB(40 + rng:Int(0, 80), 100 + rng:Int(0, 100), 200)
		if rng:Float() < row.params.gimmickDensity then
			-- Sideways bubble current zone next to the platform.
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
		lastCF = cf
	end)
	if row.params.secretHook == "AbyssSecretS8" and lastCF then
		spawnSecretRoom(stageFolder, lastCF, deps)
	end
end
return M
