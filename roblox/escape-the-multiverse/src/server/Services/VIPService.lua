-- VIP gold gate at the end of W10S20. Owners pass the barrier; non-owners
-- bounce off (CollisionGroup-based, no client trust).

local PhysicsService = game:GetService("PhysicsService")
local Workspace = game:GetService("Workspace")
local Players = game:GetService("Players")

local Shared = require(game:GetService("ReplicatedStorage").Shared)
local Monetization = Shared.Config.Monetization

local LOCKED = "ETM_VIPLocked"
local CLEARED = "ETM_VIPCleared"
local BARRIER_GROUP = "ETM_VIPBarrier"

local VIPService = {}
VIPService._deps = nil :: any

function VIPService:Init(deps: any)
	self._deps = deps
	pcall(function()
		PhysicsService:RegisterCollisionGroup(LOCKED)
		PhysicsService:RegisterCollisionGroup(CLEARED)
		PhysicsService:RegisterCollisionGroup(BARRIER_GROUP)
		PhysicsService:CollisionGroupSetCollidable(LOCKED, BARRIER_GROUP, true)
		PhysicsService:CollisionGroupSetCollidable(CLEARED, BARRIER_GROUP, false)
		PhysicsService:CollisionGroupSetCollidable(LOCKED, CLEARED, true)
	end)
end

local function setCharGroup(char: Model, group: string)
	for _, d in ipairs(char:GetDescendants()) do
		if d:IsA("BasePart") then
			d.CollisionGroup = group
		end
	end
end

local function applyForPlayer(self, player: Player)
	local pass = Monetization.GAMEPASSES.VIP
	local owns = pass and self._deps.Monetization:OwnsGamePass(player, pass.id)
	local function onChar(char)
		setCharGroup(char, owns and CLEARED or LOCKED)
	end
	if player.Character then
		onChar(player.Character)
	end
	player.CharacterAdded:Connect(onChar)
end

function VIPService:Start()
	for _, plr in ipairs(Players:GetPlayers()) do
		applyForPlayer(self, plr)
	end
	Players.PlayerAdded:Connect(function(plr)
		applyForPlayer(self, plr)
	end)
	-- Re-check on purchase.
	self._deps.Monetization.GamePassPurchased:Connect(function(player, passId)
		if passId == Monetization.GAMEPASSES.VIP.id then
			if player.Character then
				setCharGroup(player.Character, CLEARED)
			end
		end
	end)
end

function VIPService:TagBarrier(part: BasePart)
	part.CollisionGroup = BARRIER_GROUP
end

return VIPService
