-- Wraps BadgeService:AwardBadge. Listens to WorldCompleted + SecretRoomEntered.

local BadgeService_Roblox = game:GetService("BadgeService")

local Shared = require(game:GetService("ReplicatedStorage").Shared)
local Badges = Shared.Config.Badges
local Signal = Shared.Modules.Signal

local BadgeService = {}
BadgeService._deps = nil :: any

function BadgeService:Init(deps: any)
	self._deps = deps
	self.SecretRoomEntered = Signal.new()
end

local function tryAward(player: Player, badgeId: number)
	if badgeId == 0 then
		return -- placeholder; ID not yet configured
	end
	local ok, owns = pcall(function()
		return BadgeService_Roblox:UserHasBadgeAsync(player.UserId, badgeId)
	end)
	if ok and owns then
		return
	end
	pcall(function()
		BadgeService_Roblox:AwardBadge(player.UserId, badgeId)
	end)
end

function BadgeService:Start()
	self._deps.Progression.WorldCompleted:Connect(function(player: Player, world: number)
		local id = Badges.byWorld(world)
		tryAward(player, id)
		if world == 10 then
			tryAward(player, Badges.MultiverseEscape)
		end
		self._deps.DataService:Update(player, function(profile)
			profile.badgesAwarded["world_" .. world] = true
		end)
	end)
	self.SecretRoomEntered:Connect(function(player: Player)
		tryAward(player, Badges.AbyssSecretRoom)
		self._deps.DataService:Update(player, function(profile)
			profile.badgesAwarded.secret_abyss = true
		end)
		Shared.Net.event("SecretRoomFound"):FireClient(player)
	end)
end

return BadgeService
