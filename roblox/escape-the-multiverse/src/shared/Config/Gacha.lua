-- Gacha banners. Mirrors /home/user/Claude/src/config/banners.js exactly:
-- same rates (65/21/10/3.5/0.5), same pity (soft 50, hard 70), same selector
-- token costs (30/80/150). The Roblox skin replaces weapons/relics with
-- cosmetic trails/auras/nameplates.

local Gacha = {}

Gacha.RATES_BASE = {
	Common = 0.65,
	Uncommon = 0.21,
	Rare = 0.10,
	Epic = 0.035,
	Legendary = 0.005,
}

Gacha.PITY = {
	softPityFrom = 50,
	hardPity = 70,
	tenPullGuaranteeTier = "Rare",
}

Gacha.SELECTOR_COSTS = { Rare = 30, Epic = 80, Legendary = 150 }

-- Regions where paid loot boxes are restricted; gacha is gold-only there.
Gacha.RESTRICTED_REGIONS = { BE = true, NL = true }

-- Standard banner: hard- AND soft-currency pulls. Pool = every cosmetic
-- whose isStarter == false and isFeaturedExclusive ~= true.
Gacha.STANDARD_BANNER = {
	id = "standard",
	name = "Standard Banner",
	costHard = 100,
	costHardTen = 900,
	costSoft = 500,
	costSoftTen = 4500,
	allowSoftCurrency = true,
}

-- Featured banner: hard-only, rate-up Legendary changes every rotation.
Gacha.FEATURED_BANNER = {
	id = "featured_glitch_aura",
	name = "Glitch Aura Rate-Up",
	costHard = 100,
	costHardTen = 900,
	allowSoftCurrency = false,
	-- Legendary rolls on this banner force this id (rate-up).
	rateUpLegendary = "aura_glitch_storm",
}

Gacha.BANNERS = { Gacha.STANDARD_BANNER, Gacha.FEATURED_BANNER }

-- Dupe → shard conversion table (per tier).
Gacha.SHARDS_PER_DUPE = {
	Common = 1,
	Uncommon = 2,
	Rare = 5,
	Epic = 12,
	Legendary = 30,
}

-- Levels go from 1 (just rolled) to 30 (max).
Gacha.MAX_LEVEL = 30

return Gacha
