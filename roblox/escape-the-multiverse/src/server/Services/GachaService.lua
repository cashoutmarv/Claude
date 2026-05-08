-- Gacha rolling. Uses Modules/PityCalculator for tier rolls and
-- Config/Cosmetics for per-tier item pools. Persists pity in profile.

local Shared = require(game:GetService("ReplicatedStorage").Shared)
local Net = Shared.Net
local Gacha = Shared.Config.Gacha
local Cosmetics = Shared.Config.Cosmetics
local Monetization = Shared.Config.Monetization
local Validate = Shared.Modules.Validate
local Pity = Shared.Modules.PityCalculator
local RNG = Shared.Modules.RNG

local GachaService = {}
GachaService._deps = nil :: any

function GachaService:Init(deps: any)
	self._deps = deps
end

local function bannerById(id: string)
	for _, b in ipairs(Gacha.BANNERS) do
		if b.id == id then
			return b
		end
	end
	return nil
end

local function poolFor(banner): { [string]: { string } }
	if banner.id == Gacha.STANDARD_BANNER.id then
		return Cosmetics.standardPool()
	end
	return Cosmetics.featuredPool(banner.rateUpLegendary)
end

local function pickFromTier(rng, pool: { [string]: { string } }, tier: string): string
	local list = pool[tier]
	if not list or #list == 0 then
		-- Fall back to next-lower tier so a roll never returns nil.
		local order = { "Legendary", "Epic", "Rare", "Uncommon", "Common" }
		local startIdx = 1
		for i, t in ipairs(order) do
			if t == tier then
				startIdx = i
				break
			end
		end
		for i = startIdx + 1, #order do
			list = pool[order[i]]
			if list and #list > 0 then
				break
			end
		end
	end
	return list[rng:Int(1, #list)]
end

local function awardOne(self, player: Player, profile, banner, tier: string, cosmeticId: string)
	local owned = profile.ownedCosmetics[cosmeticId]
	local wasDupe = owned ~= nil
	local shards = 0
	if wasDupe then
		shards = Gacha.SHARDS_PER_DUPE[tier] or 1
	end
	self._deps.DataService:Update(player, function(p)
		local rec = p.ownedCosmetics[cosmeticId]
		if not rec then
			p.ownedCosmetics[cosmeticId] = { count = 1, shards = 0, level = 1 }
		else
			rec.count += 1
			rec.shards += shards
			while rec.shards >= 30 and rec.level < Gacha.MAX_LEVEL do
				rec.shards -= 30
				rec.level += 1
			end
		end
		-- Selector tokens: 1 per pull.
		p.currency.selectorTokens = (p.currency.selectorTokens or 0) + 1
	end)
	return {
		cosmetic = Cosmetics.byId[cosmeticId],
		tier = tier,
		wasDupe = wasDupe,
		shardsAwarded = shards,
		tokensAwarded = 1,
	}
end

-- Performs `count` rolls (1 or 10). Returns a list of RollResult.
function GachaService:Roll(player: Player, bannerId: string, count: number, payment: string): { any }?
	if count ~= 1 and count ~= 10 then
		return nil
	end
	local banner = bannerById(bannerId)
	if not banner then
		return nil
	end
	local profile = self._deps.DataService:Get(player)
	if not profile then
		return nil
	end
	-- Region restriction: hard-currency banned in BE/NL.
	if Gacha.RESTRICTED_REGIONS[profile.region] and payment == "hard" then
		return nil
	end
	-- Featured banner: hard-only.
	if banner.id == Gacha.FEATURED_BANNER.id and payment == "soft" then
		return nil
	end
	-- Cost.
	local kind: string, amount: number
	if payment == "soft" then
		amount = (count == 10) and banner.costSoftTen or banner.costSoft
		kind = "soft"
	elseif payment == "hard" then
		amount = (count == 10) and banner.costHardTen or banner.costHard
		kind = "hard"
	else
		return nil
	end
	if not amount then
		return nil
	end
	if not self._deps.Currency:Spend(player, kind, amount) then
		return nil
	end

	local pityState = (banner.id == Gacha.FEATURED_BANNER.id) and profile.pity.featured or profile.pity.standard
	local pool = poolFor(banner)
	local rng = RNG.new(os.time() + player.UserId + math.random(1, 1e6))
	local tiers = {}
	for i = 1, count do
		local function rngFn()
			return rng:Float()
		end
		local tier = Pity.rollTier(pityState.pullsSinceLegendary, rngFn)
		if tier == "Legendary" then
			pityState.pullsSinceLegendary = 0
		else
			pityState.pullsSinceLegendary += 1
		end
		tiers[i] = tier
	end
	if count == 10 then
		Pity.applyTenPullGuarantee(tiers)
	end
	-- Persist updated pity.
	self._deps.DataService:Update(player, function(p)
		if banner.id == Gacha.FEATURED_BANNER.id then
			p.pity.featured = pityState
		else
			p.pity.standard = pityState
		end
	end)
	-- Resolve cosmetics + award.
	local results = {}
	for i, tier in ipairs(tiers) do
		local id
		if tier == "Legendary" and banner.rateUpLegendary then
			id = banner.rateUpLegendary
		else
			id = pickFromTier(rng, pool, tier)
		end
		results[i] = awardOne(self, player, profile, banner, tier, id)
	end
	Net.event("GachaResult"):FireClient(player, results)
	return results
end

-- Selector token spend: pick any item of a tier (Rare/Epic/Legendary).
function GachaService:Redeem(player: Player, tier: string, cosmeticId: string): boolean
	if tier ~= "Rare" and tier ~= "Epic" and tier ~= "Legendary" then
		return false
	end
	local def = Cosmetics.byId[cosmeticId]
	if not def or def.tier ~= tier or def.isStarter then
		return false
	end
	local cost = Gacha.SELECTOR_COSTS[tier]
	if not self._deps.Currency:Spend(player, "selectorTokens", cost) then
		return false
	end
	self._deps.DataService:Update(player, function(p)
		local rec = p.ownedCosmetics[cosmeticId]
		if rec then
			rec.shards += Gacha.SHARDS_PER_DUPE[tier] or 1
		else
			p.ownedCosmetics[cosmeticId] = { count = 1, shards = 0, level = 1 }
		end
	end)
	return true
end

function GachaService:AwardSpecific(player: Player, cosmeticId: string)
	local def = Cosmetics.byId[cosmeticId]
	if not def then
		return
	end
	self._deps.DataService:Update(player, function(p)
		local rec = p.ownedCosmetics[cosmeticId]
		if rec then
			rec.shards += Gacha.SHARDS_PER_DUPE[def.tier] or 1
		else
			p.ownedCosmetics[cosmeticId] = { count = 1, shards = 0, level = 1 }
		end
	end)
end

function GachaService:Start()
	-- Wire DevProducts that buy hard-currency pulls.
	local single = Monetization.DEV_PRODUCTS.GachaSingleHard
	if single and single.id ~= 0 then
		self._deps.Monetization:RegisterDevProduct(single.id, function(player)
			-- Effectively gifts 100 hard then deducts during Roll.
			self._deps.Currency:Add(player, "hard", math.abs(single.hardCurrency))
			self:Roll(player, Gacha.STANDARD_BANNER.id, 1, "hard")
			return Enum.ProductPurchaseDecision.PurchaseGranted
		end)
	end
	Net.event("RollGacha").OnServerEvent:Connect(function(player, bannerId, count, payment)
		if not (Validate.string(bannerId, 64) and Validate.intInRange(count, 1, 10) and Validate.string(payment, 16)) then
			self._deps.AntiExploit:Flag(player, "RollGacha bad args", 1)
			return
		end
		if not Validate.rateOk(player, "RollGacha", 0.5) then
			return
		end
		self:Roll(player, bannerId, count, payment)
	end)
end

return GachaService
