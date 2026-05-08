-- DataStore wrapper. Sole owner of DataStoreService for profiles. Other
-- services read/write through Get/Update/Flush. Falls back to in-memory store
-- when DataStore API is unavailable (Studio without API access).

local DataStoreService = game:GetService("DataStoreService")
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")

local Shared = require(game:GetService("ReplicatedStorage").Shared)
local Schema = Shared.Modules.Schema
local Config = Shared.Config.DataStore

local DataService = {}

local profiles: { [Player]: any } = {}
local lastWrite: { [Player]: number } = {}
local store: DataStore?
local apiAvailable = true

local function key(userId: number): string
	return "u_" .. tostring(userId)
end

local function tryLoadStore()
	local ok, result = pcall(function()
		return DataStoreService:GetDataStore(Config.profileStore)
	end)
	if ok then
		store = result
	else
		apiAvailable = false
		warn("[DataService] DataStore unavailable; using in-memory fallback. " .. tostring(result))
	end
end

local function loadProfile(player: Player)
	if not apiAvailable or not store then
		profiles[player] = Schema.default()
		return
	end
	local data: any
	for attempt = 1, Config.retries do
		local ok, result = pcall(function()
			return store:GetAsync(key(player.UserId))
		end)
		if ok then
			data = result
			break
		end
		warn(string.format("[DataService] GetAsync failed (try %d): %s", attempt, tostring(result)))
		task.wait(Config.retryBackoffBase ^ (attempt - 1))
	end
	profiles[player] = Schema.migrate(data or Schema.default())
end

local function writeProfile(player: Player)
	if not apiAvailable or not store then
		return
	end
	local profile = profiles[player]
	if not profile then
		return
	end
	for attempt = 1, Config.retries do
		local ok, err = pcall(function()
			store:UpdateAsync(key(player.UserId), function()
				return profile
			end)
		end)
		if ok then
			lastWrite[player] = os.clock()
			return
		end
		warn(string.format("[DataService] UpdateAsync failed (try %d): %s", attempt, tostring(err)))
		task.wait(Config.retryBackoffBase ^ (attempt - 1))
	end
end

function DataService:Init()
	tryLoadStore()
end

function DataService:Start()
	for _, plr in ipairs(Players:GetPlayers()) do
		task.spawn(loadProfile, plr)
	end
	Players.PlayerAdded:Connect(function(plr)
		loadProfile(plr)
	end)
	Players.PlayerRemoving:Connect(function(plr)
		writeProfile(plr)
		profiles[plr] = nil
		lastWrite[plr] = nil
	end)
	game:BindToClose(function()
		for plr in pairs(profiles) do
			writeProfile(plr)
		end
		if RunService:IsStudio() then
			task.wait(0.2)
		else
			task.wait(2)
		end
	end)
end

function DataService:Get(player: Player)
	-- Block briefly until the profile lands (data races on PlayerAdded).
	local t0 = os.clock()
	while not profiles[player] and (os.clock() - t0) < 5 do
		task.wait(0.1)
	end
	return profiles[player]
end

-- Atomic update. fn receives the live profile; mutate in place.
function DataService:Update(player: Player, fn: (any) -> ())
	local profile = self:Get(player)
	if not profile then
		return
	end
	fn(profile)
	-- Throttled write.
	local last = lastWrite[player] or 0
	if (os.clock() - last) >= Config.writeMinInterval then
		task.spawn(writeProfile, player)
	end
end

function DataService:Flush(player: Player)
	writeProfile(player)
end

return DataService
