-- Per-session death counter (in-memory only). Broadcasts to all clients so
-- the overhead BillboardGui in DeathBillboardController can show every player's
-- death count.

local Players = game:GetService("Players")

local Shared = require(game:GetService("ReplicatedStorage").Shared)
local Net = Shared.Net

local DeathTrackerService = {}
DeathTrackerService._deps = nil :: any

local counts: { [Player]: number } = {}

function DeathTrackerService:Init(deps: any)
	self._deps = deps
end

local function broadcast(player: Player)
	Net.event("DeathCountChanged"):FireAllClients(player.UserId, counts[player] or 0)
end

local function bindPlayer(player: Player)
	counts[player] = 0
	local function bindChar(char)
		local hum = char:WaitForChild("Humanoid", 5)
		if not hum then
			return
		end
		hum.Died:Connect(function()
			counts[player] = (counts[player] or 0) + 1
			broadcast(player)
		end)
	end
	if player.Character then
		bindChar(player.Character)
	end
	player.CharacterAdded:Connect(bindChar)
end

function DeathTrackerService:Start()
	for _, plr in ipairs(Players:GetPlayers()) do
		bindPlayer(plr)
		broadcast(plr)
	end
	Players.PlayerAdded:Connect(function(plr)
		bindPlayer(plr)
		-- Send the new joiner everyone else's current counts.
		for other in pairs(counts) do
			Net.event("DeathCountChanged"):FireClient(plr, other.UserId, counts[other])
		end
	end)
	Players.PlayerRemoving:Connect(function(plr)
		counts[plr] = nil
	end)
end

function DeathTrackerService:Get(player: Player): number
	return counts[player] or 0
end

return DeathTrackerService
