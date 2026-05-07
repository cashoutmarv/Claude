-- Lazy-creates RemoteEvents from Config/RemoteNames. Server creates them on
-- first access; clients wait on them. Single source of truth for cross-boundary
-- traffic.

local RunService = game:GetService("RunService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local RemoteNames = require(script.Parent.Config.RemoteNames)

local Net = {}

local folder: Folder
do
	if RunService:IsServer() then
		folder = ReplicatedStorage:FindFirstChild("ETM_Net") :: Folder
		if not folder then
			folder = Instance.new("Folder")
			folder.Name = "ETM_Net"
			folder.Parent = ReplicatedStorage
		end
	else
		folder = ReplicatedStorage:WaitForChild("ETM_Net") :: Folder
	end
end

local cache: { [string]: RemoteEvent } = {}

local function getOrCreate(name: string): RemoteEvent
	if cache[name] then
		return cache[name]
	end
	local existing = folder:FindFirstChild(name)
	if existing and existing:IsA("RemoteEvent") then
		cache[name] = existing
		return existing
	end
	if RunService:IsServer() then
		local r = Instance.new("RemoteEvent")
		r.Name = name
		r.Parent = folder
		cache[name] = r
		return r
	else
		local r = folder:WaitForChild(name, 10)
		assert(r and r:IsA("RemoteEvent"), "Net: missing remote " .. name)
		cache[name] = r
		return r
	end
end

function Net.event(name: string): RemoteEvent
	if not RemoteNames[name] then
		warn("Net: unknown remote name: " .. name)
	end
	return getOrCreate(name)
end

-- Pre-creates all known remotes on the server so clients never race.
function Net.bootstrapServer()
	assert(RunService:IsServer(), "Net.bootstrapServer is server-only")
	for name in pairs(RemoteNames) do
		getOrCreate(name)
	end
end

return Net
