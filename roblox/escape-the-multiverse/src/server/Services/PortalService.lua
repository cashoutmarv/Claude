-- Cinematic portal between W{N}_S20 and W{N+1}_S01. Builds on WorldCompleted,
-- locks player + sends PortalCue to client, teleports across, restores.

local Workspace = game:GetService("Workspace")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = require(ReplicatedStorage.Shared)
local Net = Shared.Net

local PortalService = {}
PortalService._deps = nil :: any

local portals: { [number]: BasePart } = {}

function PortalService:Init(deps: any)
	self._deps = deps
end

local function findStage(world: number, stage: number): Instance?
	local worlds = Workspace:FindFirstChild("Worlds")
	if not worlds then
		return nil
	end
	local w = worlds:FindFirstChild("W" .. world)
	if not w then
		return nil
	end
	return w:FindFirstChild("S" .. stage)
end

local function spawnPortal(self, fromWorld: number)
	if portals[fromWorld] then
		return
	end
	local stageEnd = findStage(fromWorld, 20)
	local nextStart = findStage(fromWorld + 1, 1)
	if not stageEnd or not nextStart then
		return
	end
	local endAnchor = stageEnd:FindFirstChild("EndAnchor")
	if not endAnchor or not endAnchor:IsA("BasePart") then
		return
	end
	-- Try to clone from Assets, else fall back to a procedural ring.
	local template = ReplicatedStorage:FindFirstChild("Assets")
		and ReplicatedStorage.Assets:FindFirstChild("Portals")
		and ReplicatedStorage.Assets.Portals:FindFirstChild("WorldPortal")
	local part: BasePart
	if template and template:IsA("Model") and template.PrimaryPart then
		local clone = template:Clone()
		clone:PivotTo(endAnchor.CFrame * CFrame.new(0, 4, -8))
		clone.Parent = Workspace
		part = clone.PrimaryPart :: BasePart
	else
		part = Instance.new("Part")
		part.Name = "Portal_W" .. fromWorld
		part.Shape = Enum.PartType.Cylinder
		part.Size = Vector3.new(0.5, 12, 12)
		part.Material = Enum.Material.Neon
		part.Color = Color3.fromRGB(180, 50, 255)
		part.Anchored = true
		part.CanCollide = false
		part.CFrame = endAnchor.CFrame * CFrame.new(0, 6, -8) * CFrame.Angles(0, 0, math.rad(90))
		part.Parent = Workspace
	end
	portals[fromWorld] = part
	part.Touched:Connect(function(hit)
		local plr = game.Players:GetPlayerFromCharacter(hit.Parent)
		if plr then
			self:_doTransition(plr, fromWorld + 1)
		end
	end)
end

function PortalService:_doTransition(player: Player, toWorld: number)
	local char = player.Character
	if not char then
		return
	end
	local hum = char:FindFirstChildOfClass("Humanoid")
	if not hum then
		return
	end
	local hrp = char:FindFirstChild("HumanoidRootPart")
	if not (hrp and hrp:IsA("BasePart")) then
		return
	end
	-- Lock player.
	local prevSpeed = hum.WalkSpeed
	hum.WalkSpeed = 0
	Net.event("PortalCue"):FireClient(player, toWorld)
	task.wait(2.5)
	-- Teleport to W{toWorld}_S01 anchor.
	local startStage = findStage(toWorld, 1)
	if startStage then
		local anchor = startStage:FindFirstChild("StartAnchor")
		if anchor and anchor:IsA("BasePart") then
			hrp.CFrame = anchor.CFrame + Vector3.new(0, 4, 0)
		end
	end
	hum.WalkSpeed = prevSpeed
	-- Update checkpoint.
	self._deps.CheckpointService:Set(player, toWorld, 1)
end

function PortalService:Start()
	-- After every world clear, ensure that world's portal is spawned.
	self._deps.Progression.WorldCompleted:Connect(function(_player: Player, world: number)
		if world < 10 then
			spawnPortal(self, world)
		end
	end)
	-- Pre-spawn portals for already-cleared worlds when WorldBuilder finishes.
	task.defer(function()
		task.wait(2)
		for w = 1, 9 do
			spawnPortal(self, w)
		end
	end)
end

return PortalService
