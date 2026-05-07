-- Boots client controllers in order.

local ReplicatedStorage = game:GetService("ReplicatedStorage")

-- Wait for the server to populate ETM_Net so controllers don't race.
ReplicatedStorage:WaitForChild("ETM_Net", 10)

local Shared = require(ReplicatedStorage.Shared)
local Controllers = script.Controllers

local function load(name: string)
	local mod = Controllers:FindFirstChild(name)
	if not mod or not mod:IsA("ModuleScript") then
		warn("[ETM client] missing controller " .. name)
		return nil
	end
	return require(mod)
end

local profileState = { profile = nil :: any }

local order = {
	"UIController",
	"HUDController",
	"DeathBillboardController",
	"LeaderboardUIController",
	"HallOfFameController",
	"TrailSelectorController",
	"PortalTransitionController",
	"ScreenShakeController",
	"GachaUIController",
	"ShopUIController",
	"RaceUIController",
	"MusicController",
}

local mods = {}
for _, name in ipairs(order) do
	local m = load(name)
	if m then
		table.insert(mods, m)
		if m.Init then
			m:Init(profileState)
		end
	end
end

-- Live-updated profile mirror.
Shared.Net.event("ProfileSync").OnClientEvent:Connect(function(view)
	profileState.profile = view
end)

for _, m in ipairs(mods) do
	if m.Start then
		m:Start()
	end
end

print("[ETM] Client boot complete.")
