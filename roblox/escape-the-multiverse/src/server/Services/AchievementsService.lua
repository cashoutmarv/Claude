-- AchievementsService — server-authoritative one-shot first-time-grant
-- bookkeeper. Mirrors the structure of the Phaser project's
-- src/services/achievements.js + src/config/achievements.js: a small fixed
-- table of milestones, each granting hard currency exactly once per save.
--
-- Subscribes (in :Start) to Signals exposed by other services rather than
-- coupling directly to gameplay code:
--   Progression.StageReached       → "stage_first"
--   Progression.WorldCompleted     → "world_first" + "world_clear_N"
--   Race.OnWin                     → "race_win_first"
--   Badge.SecretRoomEntered        → "secret_first"
--   Monetization.GamePassPurchased → "vip_purchase_first" (when VIP id matches)
--   DeathTracker.OnDeath           → "death_count_100" (gated by threshold)
--
-- Persistence rules:
--   * `awardedAchievements` set lives on the profile (Schema v2).
--   * Reads/writes go through DataService:Update — never the DataStore directly.
--   * Currency grants go through CurrencyService:Add(player, "hard", reward).
--   * Each achievement is one-shot: a row is awarded at most once per
--     (player, achievement) pair, ever.
--
-- Public API:
--   :Init(deps) / :Start()           — boot
--   :GetState(player)                — { awarded = {[id]=true,...}, locked = {ids} }
--   :CheckAndGrant(player, triggerId, payload)
--                                    — pure dispatch; safe to call from anywhere

local Shared = require(game:GetService("ReplicatedStorage").Shared)
local Net = Shared.Net
local Achievements = Shared.Config.Achievements
local Monetization = Shared.Config.Monetization

local AchievementsService = {}
AchievementsService._deps = nil :: any

function AchievementsService:Init(deps: any)
	self._deps = deps
end

local function alreadyAwarded(profile: any, id: string): boolean
	if not profile then
		return true -- no profile yet → refuse to grant; will retry on next trigger
	end
	if not profile.awardedAchievements then
		profile.awardedAchievements = {}
	end
	return profile.awardedAchievements[id] == true
end

-- Grant a single achievement to a player exactly once.
function AchievementsService:_grant(player: Player, row: any)
	local DataService = self._deps.DataService
	local Currency = self._deps.Currency
	local profile = DataService:Get(player)
	if not profile then
		return
	end
	-- Re-check inside the update closure to keep the (read, check, write)
	-- atomic w.r.t. other Update calls on the same profile.
	local granted = false
	DataService:Update(player, function(p)
		if not p.awardedAchievements then
			p.awardedAchievements = {}
		end
		if p.awardedAchievements[row.id] then
			return -- another path already granted it
		end
		p.awardedAchievements[row.id] = true
		granted = true
	end)
	if not granted then
		return
	end
	-- Award hard currency through the canonical service so wallet events fire.
	if row.hardReward and row.hardReward > 0 then
		Currency:Add(player, "hard", row.hardReward)
	end
	-- Toast the player.
	Net.event("AchievementUnlocked"):FireClient(player, {
		id = row.id,
		label = row.label,
		hardReward = row.hardReward,
	})
end

-- Check + grant any rows that fire on this trigger id. payload is trigger-specific.
function AchievementsService:CheckAndGrant(player: Player, triggerId: string, payload: any)
	local ids = Achievements.BY_TRIGGER[triggerId]
	if not ids then
		return
	end
	local profile = self._deps.DataService:Get(player)
	if not profile then
		return
	end
	for _, id in ipairs(ids) do
		local row = Achievements.BY_ID[id]
		if row and not alreadyAwarded(profile, id) then
			-- Threshold-gated rows (currently only death_count_100) compare
			-- payload (the new count) against row.threshold.
			if row.threshold then
				local count = type(payload) == "number" and payload or 0
				if count >= row.threshold then
					self:_grant(player, row)
				end
			else
				self:_grant(player, row)
			end
		end
	end
end

-- Public read-only state for UI surfaces. Returns the set of awarded ids
-- and the list of still-locked ids (in original config order).
function AchievementsService:GetState(player: Player)
	local profile = self._deps.DataService:Get(player)
	local awarded: { [string]: boolean } = {}
	if profile and profile.awardedAchievements then
		for id, v in pairs(profile.awardedAchievements) do
			if v then
				awarded[id] = true
			end
		end
	end
	local locked: { string } = {}
	for _, row in ipairs(Achievements.LIST) do
		if not awarded[row.id] then
			table.insert(locked, row.id)
		end
	end
	return { awarded = awarded, locked = locked }
end

function AchievementsService:Start()
	local Progression = self._deps.Progression
	local Race = self._deps.Race
	local Badge = self._deps.Badge
	local Monet = self._deps.Monetization
	local DeathTracker = self._deps.DeathTracker

	-- StageReached → first stage clear ever.
	if Progression and Progression.StageReached then
		Progression.StageReached:Connect(function(player: Player, _world: number, _stage: number, globalId: number)
			self:CheckAndGrant(player, "stage_first", globalId)
		end)
	end

	-- WorldCompleted → first world clear ever AND world_clear_N for the matching N.
	if Progression and Progression.WorldCompleted then
		Progression.WorldCompleted:Connect(function(player: Player, world: number)
			self:CheckAndGrant(player, "world_first", world)
			self:CheckAndGrant(player, "world_clear_" .. tostring(world), world)
		end)
	end

	-- Race.OnWin → first race win.
	if Race and Race.OnWin then
		Race.OnWin:Connect(function(winner: Player, _loser: Player, _world: number, _startStage: number)
			self:CheckAndGrant(winner, "race_win_first", nil)
		end)
	end

	-- Badge.SecretRoomEntered → first secret room.
	if Badge and Badge.SecretRoomEntered then
		Badge.SecretRoomEntered:Connect(function(player: Player)
			self:CheckAndGrant(player, "secret_first", nil)
		end)
	end

	-- Monetization.GamePassPurchased → VIP first purchase.
	if Monet and Monet.GamePassPurchased then
		Monet.GamePassPurchased:Connect(function(player: Player, passId: number)
			local vip = Monetization.GAMEPASSES.VIP
			if vip and vip.id ~= 0 and passId == vip.id then
				self:CheckAndGrant(player, "vip_purchase_first", passId)
			end
		end)
	end

	-- DeathTracker.OnDeath → 100-death badge.
	if DeathTracker and DeathTracker.OnDeath then
		DeathTracker.OnDeath:Connect(function(player: Player, newCount: number)
			self:CheckAndGrant(player, "death_count_100", newCount)
		end)
	end
end

return AchievementsService
