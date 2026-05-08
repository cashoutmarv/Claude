-- Stage-15 SKIP doors. Touch fires Net.RequestSkipPurchase. Server prompts
-- the world's gamepass; on confirmed purchase, credits stage 16 + sets
-- checkpoint there. Server-authoritative — no client claim.

local Players = game:GetService("Players")

local Shared = require(game:GetService("ReplicatedStorage").Shared)
local Net = Shared.Net
local Monetization = Shared.Config.Monetization
local Validate = Shared.Modules.Validate
local Difficulty = Shared.Config.Difficulty

local SkipGateService = {}
SkipGateService._deps = nil :: any

function SkipGateService:Init(deps: any)
	self._deps = deps
end

local function grantSkip(deps, player: Player, world: number)
	-- Bumps highestStage to globalStage(world, 16) if not already past.
	local target = Difficulty.globalStage(world, 16)
	deps.DataService:Update(player, function(profile)
		if profile.highestStage < target then
			profile.highestStage = target
		end
	end)
	deps.CheckpointService:Set(player, world, 16)
	deps.CheckpointService:RespawnAt(player)
end

function SkipGateService:Start()
	-- Wire each per-world skip pass.
	for w = 1, 10 do
		local pass = Monetization.skipPassForWorld(w)
		if pass and pass.id ~= 0 then
			self._deps.Monetization:RegisterGamePass(pass.id, function(player)
				grantSkip(self._deps, player, w)
			end)
		end
	end
	Net.event("RequestSkipPurchase").OnServerEvent:Connect(function(player, world)
		if not Validate.intInRange(world, 1, 10) then
			self._deps.AntiExploit:Flag(player, "RequestSkipPurchase bad world", 1)
			return
		end
		if not Validate.rateOk(player, "SkipReq", 1.0) then
			return
		end
		local pass = Monetization.skipPassForWorld(world)
		if pass then
			-- If they already own it (e.g. previously bought + revisit), grant immediately.
			if self._deps.Monetization:OwnsGamePass(player, pass.id) then
				grantSkip(self._deps, player, world)
			else
				self._deps.Monetization:PromptGamePass(player, pass.id)
			end
		end
	end)
end

return SkipGateService
