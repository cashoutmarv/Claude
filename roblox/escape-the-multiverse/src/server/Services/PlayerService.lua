-- Players join → load profile → push initial state to client → spawn at the
-- player's last checkpoint (or W1S1).

local Players = game:GetService("Players")

local Shared = require(game:GetService("ReplicatedStorage").Shared)
local Net = Shared.Net
local Validate = Shared.Modules.Validate

local PlayerService = {}
PlayerService._deps = nil :: any

function PlayerService:Init(deps: any)
	self._deps = deps
end

local function syncProfile(player: Player, profile: any)
	-- Send a slim, safe view to the client (avoid leaking opaque pity counters).
	local view = {
		worldsCompleted = profile.worldsCompleted,
		highestStage = profile.highestStage,
		checkpoints = profile.checkpoints,
		ownedTrails = profile.ownedTrails,
		equippedTrail = profile.equippedTrail,
		ownedCosmetics = profile.ownedCosmetics,
		equippedAura = profile.equippedAura,
		equippedNameplate = profile.equippedNameplate,
		currency = profile.currency,
		badgesAwarded = profile.badgesAwarded,
		region = profile.region,
	}
	Net.event("ProfileSync"):FireClient(player, view)
end

function PlayerService:Start()
	local DataService = self._deps.DataService
	local CheckpointService = self._deps.CheckpointService

	local function onPlayerAdded(player: Player)
		local profile = DataService:Get(player)
		if not profile then
			return
		end
		syncProfile(player, profile)
		CheckpointService:OnPlayerAdded(player, profile)
	end

	for _, plr in ipairs(Players:GetPlayers()) do
		task.spawn(onPlayerAdded, plr)
	end
	Players.PlayerAdded:Connect(onPlayerAdded)
	Players.PlayerRemoving:Connect(function(plr)
		Validate.cleanup(plr)
	end)
end

function PlayerService:SyncProfile(player: Player)
	local profile = self._deps.DataService:Get(player)
	if profile then
		syncProfile(player, profile)
	end
end

return PlayerService
