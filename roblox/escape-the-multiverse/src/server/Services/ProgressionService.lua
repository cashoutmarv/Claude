-- Server-authoritative stage credit. Listens to Net.StageReached from clients,
-- validates HRP distance + monotonicity + rate limit. Fires WorldCompleted on
-- stage 20 of each world.

local Players = game:GetService("Players")
local CollectionService = game:GetService("CollectionService")

local Shared = require(game:GetService("ReplicatedStorage").Shared)
local Net = Shared.Net
local Signal = Shared.Modules.Signal
local Validate = Shared.Modules.Validate
local Difficulty = Shared.Config.Difficulty

local STAGE_RADIUS = 24
local RATE_KEY = "StageReached"
local RATE_INTERVAL = 0.5

local ProgressionService = {}
ProgressionService._deps = nil :: any

function ProgressionService:Init(deps: any)
	self._deps = deps
	self.StageReached = Signal.new()
	self.WorldCompleted = Signal.new()
end

local function hrpPosition(player: Player): Vector3?
	local char = player.Character
	if not char then
		return nil
	end
	local hrp = char:FindFirstChild("HumanoidRootPart")
	if hrp and hrp:IsA("BasePart") then
		return hrp.Position
	end
	return nil
end

function ProgressionService:Start()
	-- Tag-based listener for every stage's EndPart (set up by Builders).
	local function bindEndPart(part: Instance)
		if not part:IsA("BasePart") then
			return
		end
		part.Touched:Connect(function(hit)
			local plr = Players:GetPlayerFromCharacter(hit.Parent)
			if plr then
				local world = part:GetAttribute("World")
				local stage = part:GetAttribute("Stage")
				if type(world) == "number" and type(stage) == "number" then
					self:_credit(plr, world, stage, part.Position)
				end
			end
		end)
	end
	for _, p in ipairs(CollectionService:GetTagged("StageReached")) do
		bindEndPart(p)
	end
	CollectionService:GetInstanceAddedSignal("StageReached"):Connect(bindEndPart)

	-- Client also fires Net.StageReached for cases where Touched is unreliable.
	Net.event("StageReached").OnServerEvent:Connect(function(player, world, stage)
		if not Validate.intInRange(world, 1, 10) or not Validate.intInRange(stage, 1, 20) then
			self._deps.AntiExploit:Flag(player, "StageReached bad args", 2)
			return
		end
		if not Validate.rateOk(player, RATE_KEY, RATE_INTERVAL) then
			self._deps.AntiExploit:Flag(player, "StageReached rate-limit", 1)
			return
		end
		self:_credit(player, world, stage, nil)
	end)
end

function ProgressionService:_credit(player: Player, world: number, stage: number, anchorPos: Vector3?)
	local profile = self._deps.DataService:Get(player)
	if not profile then
		return
	end
	-- Position validation if we have an anchor reference.
	if anchorPos then
		local pos = hrpPosition(player)
		if not pos or not Validate.distance(pos, anchorPos, STAGE_RADIUS) then
			return -- ignore silently — common during respawn races
		end
	end
	-- Monotonicity: must be ≤ highestStage+1, with replay tolerance for revisits.
	local globalId = Difficulty.globalStage(world, stage)
	if globalId > profile.highestStage + 1 then
		self._deps.AntiExploit:Flag(player, "stage skip " .. globalId, 2)
		return
	end
	if globalId <= profile.highestStage then
		-- Already credited; just update checkpoint.
		self._deps.CheckpointService:Set(player, world, stage)
		return
	end
	-- New stage cleared.
	self._deps.DataService:Update(player, function(p)
		p.highestStage = globalId
	end)
	self._deps.CheckpointService:Set(player, world, stage)
	self._deps.CurrencyService:Add(player, "soft", 10 + globalId)
	self.StageReached:Fire(player, world, stage, globalId)
	if stage == 20 then
		self._deps.DataService:Update(player, function(p)
			p.worldsCompleted = math.max(p.worldsCompleted, world)
		end)
		self.WorldCompleted:Fire(player, world)
	end
end

function ProgressionService:GetCurrent(player: Player): (number, number)
	local profile = self._deps.DataService:Get(player)
	if not profile then
		return 1, 1
	end
	local g = profile.highestStage + 1
	if g > 200 then
		return 10, 20
	end
	local world = math.floor((g - 1) / 20) + 1
	local stage = ((g - 1) % 20) + 1
	return world, stage
end

return ProgressionService
