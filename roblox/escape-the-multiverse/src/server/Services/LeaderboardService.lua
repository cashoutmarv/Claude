-- OrderedDataStore top-N by worldsCompleted. Listens to ProgressionService.
-- WorldCompleted, increments, periodically refreshes the broadcast list.

local DataStoreService = game:GetService("DataStoreService")
local Players = game:GetService("Players")

local Shared = require(game:GetService("ReplicatedStorage").Shared)
local Net = Shared.Net
local Config = Shared.Config.DataStore

local LeaderboardService = {}
LeaderboardService._deps = nil :: any

local store: OrderedDataStore?
local lastWrite: { [number]: number } = {}
local cachedTop: { { userId: number, score: number } } = {}

function LeaderboardService:Init(deps: any)
	self._deps = deps
	local ok, result = pcall(function()
		return DataStoreService:GetOrderedDataStore(Config.leaderboardStore)
	end)
	if ok then
		store = result
	else
		warn("[Leaderboard] OrderedDataStore unavailable: " .. tostring(result))
	end
end

local function writeScore(userId: number, score: number)
	if not store then
		return
	end
	-- Per-user write throttle to respect DataStore quotas.
	local now = os.clock()
	if (lastWrite[userId] or 0) + 30 > now then
		return
	end
	pcall(function()
		store:SetAsync(tostring(userId), score)
	end)
	lastWrite[userId] = now
end

local function refreshTop()
	if not store then
		return
	end
	local ok, pages = pcall(function()
		return store:GetSortedAsync(false, Config.leaderboardSize)
	end)
	if not ok then
		return
	end
	local list = {}
	for _, entry in ipairs(pages:GetCurrentPage()) do
		local userId = tonumber(entry.key)
		if userId then
			table.insert(list, { userId = userId, score = entry.value })
		end
	end
	cachedTop = list
	Net.event("LeaderboardUpdate"):FireAllClients(cachedTop)
end

function LeaderboardService:Start()
	-- Hook progression event.
	self._deps.Progression.WorldCompleted:Connect(function(player: Player, world: number)
		writeScore(player.UserId, world)
	end)
	-- Periodic refresh.
	task.spawn(function()
		while true do
			refreshTop()
			task.wait(Config.leaderboardRefreshInterval)
		end
	end)
	-- New clients get a snapshot on join.
	Players.PlayerAdded:Connect(function(plr)
		task.wait(2)
		Net.event("LeaderboardUpdate"):FireClient(plr, cachedTop)
	end)
end

function LeaderboardService:GetTop()
	return cachedTop
end

return LeaderboardService
