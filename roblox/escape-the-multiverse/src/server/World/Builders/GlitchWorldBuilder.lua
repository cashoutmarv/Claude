-- World 1: corrupted neon matrix. Standard forward row layout but with
-- "missing" platform skips covered by Disappearing platforms (phase timer)
-- and a one-shot Warp tile that teleports the player ~2 stages-worth forward.
local Base = require(script.Parent.BaseBuilder)
local Disappearing = require(script.Parent.Parent.Gimmicks.DisappearingPlatform)
local RNG = require(game:GetService("ReplicatedStorage").Shared.Modules.RNG)

local M = {}

local function makeWarp(parent: Instance, cf: CFrame, targetCF: CFrame)
	local warp = Instance.new("Part")
	warp.Name = "GlitchWarp"
	warp.Size = Vector3.new(6, 0.6, 6)
	warp.Material = Enum.Material.ForceField
	warp.Color = Color3.fromRGB(0, 255, 220)
	warp.Transparency = 0.2
	warp.Anchored = true
	warp.CanCollide = true
	warp.CFrame = cf * CFrame.new(0, 0.6, 0)
	warp.Parent = parent
	local cooling = false
	warp.Touched:Connect(function(hit)
		if cooling then return end
		local hum = hit.Parent and hit.Parent:FindFirstChildOfClass("Humanoid")
		local hrp = hit.Parent and hit.Parent:FindFirstChild("HumanoidRootPart")
		if not (hum and hrp) then return end
		cooling = true
		hrp.CFrame = targetCF + Vector3.new(0, 4, 0)
		task.delay(2, function()
			cooling = false
		end)
	end)
end

function M:Build(stageFolder: Instance, originCF: CFrame, row: any, _deps: any)
	if Base.tryHandcrafted(stageFolder, originCF, row) then
		return
	end
	local rng = RNG.new(row.params.seed + 1)
	Base.makeStartAnchor(stageFolder, originCF)
	local cfs = Base.layRow(stageFolder, originCF, row.params, Color3.fromRGB(200, 0, 220))
	-- Per-platform glitch decoration.
	Base.eachPlatform(stageFolder, function(plat, i)
		plat.Material = Enum.Material.Neon
		-- Pick 2-3 platforms in the middle to phase out.
		if i >= 3 and i <= #cfs - 2 and rng:Float() < math.max(0.25, row.params.gimmickDensity) then
			Disappearing.apply(plat, math.max(0.6, 2 - 0.05 * (row.world + row.stage)))
			plat.Color = Color3.fromRGB(255, 0, 200)
		end
	end)
	-- Warp tile: teleport from ~25% along the row to ~85% along, skipping the gap.
	if #cfs >= 6 and rng:Float() < 0.5 then
		local fromIdx = math.max(2, math.floor(#cfs * 0.25))
		local toIdx = math.min(#cfs, math.floor(#cfs * 0.85))
		makeWarp(stageFolder, cfs[fromIdx], cfs[toIdx])
	end
	Base.finalize(stageFolder, cfs, row)
end

return M
