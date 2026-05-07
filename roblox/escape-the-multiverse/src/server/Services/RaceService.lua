-- Orchestrates 2-player races. Queue → arena spawn → scorer → reward → despawn.

local CollectionService = game:GetService("CollectionService")
local Players = game:GetService("Players")

local Shared = require(game:GetService("ReplicatedStorage").Shared)
local Net = Shared.Net
local Race = Shared.Config.Race
local Difficulty = Shared.Config.Difficulty
local Validate = Shared.Modules.Validate
local RNG = Shared.Modules.RNG
local Signal = Shared.Modules.Signal

local Queue = require(game:GetService("ServerScriptService").Server.Race.RaceQueue)
local Arena = require(game:GetService("ServerScriptService").Server.Race.RaceArena)
local Scorer = require(game:GetService("ServerScriptService").Server.Race.RaceScorer)

local RaceService = {}
RaceService._deps = nil :: any

local previousPositions: { [Player]: CFrame } = {}

function RaceService:Init(deps: any)
	self._deps = deps
	-- Server-side Signal fired (winner, loser, world, startStage) after the
	-- scorer resolves. AchievementsService listens for first-race-win grants.
	-- Net.RaceResult continues to fire to clients independently.
	self.OnWin = Signal.new()
end

local function teleport(player: Player, cf: CFrame)
	local char = player.Character
	if not char then
		return
	end
	local hrp = char:FindFirstChild("HumanoidRootPart")
	if hrp and hrp:IsA("BasePart") then
		hrp.CFrame = cf + Vector3.new(0, 4, 0)
	end
end

local function rememberPosition(player: Player)
	local char = player.Character
	if not char then
		return
	end
	local hrp = char:FindFirstChild("HumanoidRootPart")
	if hrp and hrp:IsA("BasePart") then
		previousPositions[player] = hrp.CFrame
	end
end

local function returnHome(player: Player)
	local cf = previousPositions[player]
	if cf then
		teleport(player, cf)
	end
	previousPositions[player] = nil
end

local function startRace(self, playerA: Player, playerB: Player)
	rememberPosition(playerA)
	rememberPosition(playerB)
	local rng = RNG.new(os.time())
	local world = rng:Pick(Race.eligibleWorlds)
	local startStage = rng:Int(1, math.max(1, 20 - Race.stagesPerRace + 1))
	local pair, arena = Arena.spawn(playerA, playerB, world, startStage)

	-- Side-by-side spawn pads.
	local laneA = arena.a:FindFirstChild("S" .. startStage)
	local laneB = arena.b:FindFirstChild("S" .. startStage)
	local startA = laneA and laneA:FindFirstChild("StartAnchor")
	local startB = laneB and laneB:FindFirstChild("StartAnchor")
	if startA and startA:IsA("BasePart") then
		teleport(playerA, startA.CFrame)
	end
	if startB and startB:IsA("BasePart") then
		teleport(playerB, startB.CFrame)
	end
	-- Countdown then start.
	for n = 3, 1, -1 do
		Net.event("RaceCountdown"):FireClient(playerA, n)
		Net.event("RaceCountdown"):FireClient(playerB, n)
		task.wait(1)
	end
	Net.event("RaceCountdown"):FireClient(playerA, 0)
	Net.event("RaceCountdown"):FireClient(playerB, 0)

	Scorer.run(arena, playerA, playerB, Race.timerSeconds, function(winner, loser)
		Net.event("RaceResult"):FireClient(winner, true)
		Net.event("RaceResult"):FireClient(loser, false)
		self._deps.Currency:Add(winner, "soft", Race.winnerSoft)
		self._deps.Currency:Add(loser, "soft", Race.loserSoft)
		-- Notify any server-side listeners (e.g. AchievementsService).
		if self.OnWin then
			self.OnWin:Fire(winner, loser, world, startStage)
		end
		-- First-race-win badge.
		local Badges = Shared.Config.Badges
		if Badges.FirstRaceWin and Badges.FirstRaceWin ~= 0 then
			pcall(function()
				game:GetService("BadgeService"):AwardBadge(winner.UserId, Badges.FirstRaceWin)
			end)
		end
		-- Return both players home, then despawn the arena.
		task.delay(2, function()
			if winner.Parent then
				returnHome(winner)
			end
			if loser.Parent then
				returnHome(loser)
			end
			Arena.despawn(pair, 5)
		end)
	end)
end

function RaceService:Start()
	Queue:OnPair(function(a, b)
		startRace(self, a, b)
	end)
	-- Race portal — tag a part in workspace with "RacePortal" and players touching it queue up.
	local function bindPortal(part: Instance)
		if not part:IsA("BasePart") then
			return
		end
		part.Touched:Connect(function(hit)
			local plr = Players:GetPlayerFromCharacter(hit.Parent)
			if plr and Validate.rateOk(plr, "RaceQueue", 1.0) then
				Queue:Add(plr)
			end
		end)
	end
	for _, p in ipairs(CollectionService:GetTagged("RacePortal")) do
		bindPortal(p)
	end
	CollectionService:GetInstanceAddedSignal("RacePortal"):Connect(bindPortal)

	Net.event("RaceQueueJoin").OnServerEvent:Connect(function(player)
		if Validate.rateOk(player, "RaceQueueJoin", 1.0) then
			Queue:Add(player)
		end
	end)
end

return RaceService
