-- Per-player respawn anchor. Updates on StageReached, restores on Humanoid.Died.

local Players = game:GetService("Players")
local Workspace = game:GetService("Workspace")

local Shared = require(game:GetService("ReplicatedStorage").Shared)
local Signal = Shared.Modules.Signal

local CheckpointService = {}
CheckpointService._deps = nil :: any

local checkpoints: { [Player]: { world: number, stage: number, cf: CFrame } } = {}

function CheckpointService:Init(deps: any)
	self._deps = deps
	self.OnRespawn = Signal.new()
end

function CheckpointService:Start()
	Players.PlayerRemoving:Connect(function(plr)
		checkpoints[plr] = nil
	end)
end

local function findStageAnchor(world: number, stage: number): CFrame?
	local worlds = Workspace:FindFirstChild("Worlds")
	if not worlds then
		return nil
	end
	local w = worlds:FindFirstChild("W" .. world)
	if not w then
		return nil
	end
	local s = w:FindFirstChild("S" .. stage)
	if not s then
		return nil
	end
	local anchor = s:FindFirstChild("StartAnchor")
	if anchor and anchor:IsA("BasePart") then
		return anchor.CFrame + Vector3.new(0, 4, 0)
	end
	return nil
end

function CheckpointService:OnPlayerAdded(player: Player, profile: any)
	-- Pick the highest world the player has unlocked a checkpoint in.
	local bestWorld, bestStage = 1, 1
	for k, v in pairs(profile.checkpoints or {}) do
		local w = tonumber(k)
		if w and w >= bestWorld and v >= bestStage then
			bestWorld, bestStage = w, v
		end
	end
	local cf = findStageAnchor(bestWorld, bestStage)
	if cf then
		checkpoints[player] = { world = bestWorld, stage = bestStage, cf = cf }
	end
	-- Hook character death.
	player.CharacterAdded:Connect(function(char)
		local hum = char:WaitForChild("Humanoid", 5)
		if not hum then
			return
		end
		hum.Died:Connect(function()
			task.wait(0.5)
			task.delay(2.5, function()
				if player.Parent then
					self:RespawnAt(player)
				end
			end)
		end)
		-- Teleport to current checkpoint on spawn (Roblox spawned us at SpawnLocation).
		task.wait(0.1)
		self:RespawnAt(player)
	end)
end

function CheckpointService:Set(player: Player, world: number, stage: number)
	local cf = findStageAnchor(world, stage)
	if cf then
		checkpoints[player] = { world = world, stage = stage, cf = cf }
	end
	self._deps.DataService:Update(player, function(profile)
		profile.checkpoints[tostring(world)] = math.max(profile.checkpoints[tostring(world)] or 0, stage)
	end)
end

function CheckpointService:RespawnAt(player: Player)
	local cp = checkpoints[player]
	if not cp then
		return
	end
	local char = player.Character
	if not char then
		return
	end
	local hrp = char:FindFirstChild("HumanoidRootPart")
	if hrp and hrp:IsA("BasePart") then
		hrp.CFrame = cp.cf
		self.OnRespawn:Fire(player, cp.world, cp.stage)
	end
end

function CheckpointService:Get(player: Player)
	return checkpoints[player]
end

return CheckpointService
