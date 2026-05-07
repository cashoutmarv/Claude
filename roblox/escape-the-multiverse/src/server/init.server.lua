-- Boots all services in dependency order. Calls :Init(deps) on every service,
-- then :Start() once the dependency graph is fully wired.

local ServerScriptService = game:GetService("ServerScriptService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = require(ReplicatedStorage.Shared)

-- Ensure all remotes exist before any client tries to wait on them.
Shared.Net.bootstrapServer()

local Services = ServerScriptService.Server.Services

local AntiExploit = require(Services.AntiExploitService)
local DataService = require(Services.DataService)
local CurrencyService = require(Services.CurrencyService)
local CheckpointService = require(Services.CheckpointService)
local PlayerService = require(Services.PlayerService)
local Monetization = require(Services.MonetizationService)
local Progression = require(Services.ProgressionService)
local Leaderboard = require(Services.LeaderboardService)
local Badge = require(Services.BadgeService)
local SkipGate = require(Services.SkipGateService)
local Portal = require(Services.PortalService)
local VIP = require(Services.VIPService)
local Trail = require(Services.TrailService)
local DeathTracker = require(Services.DeathTrackerService)
local Gacha = require(Services.GachaService)
local Race = require(Services.RaceService)
local SpawnHub = require(Services.SpawnHubService)
local Achievements = require(Services.AchievementsService)

local WorldBuilder = require(ServerScriptService.Server.World.WorldBuilder)
local Diagnostics = require(ServerScriptService.Server.Diagnostics)

local deps: any = {}
deps.AntiExploit = AntiExploit
deps.DataService = DataService
deps.Currency = CurrencyService
deps.CurrencyService = CurrencyService
deps.CheckpointService = CheckpointService
deps.PlayerService = PlayerService
deps.Monetization = Monetization
deps.Progression = Progression
deps.Leaderboard = Leaderboard
deps.Badge = Badge
deps.SkipGate = SkipGate
deps.Portal = Portal
deps.VIP = VIP
deps.Trail = Trail
deps.DeathTracker = DeathTracker
deps.Gacha = Gacha
deps.Race = Race
deps.Achievements = Achievements
deps.WorldBuilder = WorldBuilder
deps.Diagnostics = Diagnostics

local order = {
	AntiExploit,
	DataService,
	CurrencyService,
	CheckpointService,
	PlayerService,
	Monetization,
	Progression,
	Leaderboard,
	Badge,
	SkipGate,
	Portal,
	VIP,
	Trail,
	DeathTracker,
	Gacha,
	Race,
	Achievements,
	SpawnHub,
	WorldBuilder,
	Diagnostics,
}

for _, svc in ipairs(order) do
	if svc.Init then
		svc:Init(deps)
	end
end
for _, svc in ipairs(order) do
	if svc.Start then
		svc:Start()
	end
end

print("[ETM] Server boot complete.")
