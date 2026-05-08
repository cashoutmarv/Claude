-- Two wallets: soft (in-game), hard (Robux). Persists via DataService, fires
-- CurrencyChanged to the affected player.

local Shared = require(game:GetService("ReplicatedStorage").Shared)
local Net = Shared.Net

local CurrencyService = {}
CurrencyService._deps = nil :: any

function CurrencyService:Init(deps: any)
	self._deps = deps
end

function CurrencyService:Start() end

local function clampNonNeg(n: number): number
	return n < 0 and 0 or n
end

function CurrencyService:Get(player: Player, kind: string): number
	local profile = self._deps.DataService:Get(player)
	if not profile then
		return 0
	end
	return profile.currency[kind] or 0
end

function CurrencyService:Add(player: Player, kind: string, amount: number)
	if amount == 0 then
		return
	end
	self._deps.DataService:Update(player, function(profile)
		profile.currency[kind] = clampNonNeg((profile.currency[kind] or 0) + amount)
	end)
	local profile = self._deps.DataService:Get(player)
	Net.event("CurrencyChanged"):FireClient(player, kind, profile.currency[kind])
end

-- Returns true on success. Atomic: if the player can't afford, no change.
function CurrencyService:Spend(player: Player, kind: string, amount: number): boolean
	if amount <= 0 then
		return false
	end
	local profile = self._deps.DataService:Get(player)
	if not profile then
		return false
	end
	if (profile.currency[kind] or 0) < amount then
		return false
	end
	self._deps.DataService:Update(player, function(p)
		p.currency[kind] = (p.currency[kind] or 0) - amount
	end)
	Net.event("CurrencyChanged"):FireClient(player, kind, profile.currency[kind])
	return true
end

return CurrencyService
