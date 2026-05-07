-- Robux gamepass + developer product IDs. Replace with real IDs from
-- create.roblox.com before launch. Numeric placeholders are kept as 0 so
-- MonetizationService can refuse to call MarketplaceService until they're set.

local Monetization = {}

Monetization.GAMEPASSES = {
	VIP = { id = 0, name = "VIP Access", priceRobux = 499 },
	-- One per world (skip 15→16). 10 separate passes lets us per-world price.
	SkipW1 = { id = 0, name = "Skip Stage 15 — Glitch", priceRobux = 49 },
	SkipW2 = { id = 0, name = "Skip Stage 15 — Candy", priceRobux = 49 },
	SkipW3 = { id = 0, name = "Skip Stage 15 — Temple", priceRobux = 49 },
	SkipW4 = { id = 0, name = "Skip Stage 15 — Moon", priceRobux = 49 },
	SkipW5 = { id = 0, name = "Skip Stage 15 — Abyss", priceRobux = 49 },
	SkipW6 = { id = 0, name = "Skip Stage 15 — Kitchen", priceRobux = 49 },
	SkipW7 = { id = 0, name = "Skip Stage 15 — Cloud", priceRobux = 49 },
	SkipW8 = { id = 0, name = "Skip Stage 15 — Backrooms", priceRobux = 49 },
	SkipW9 = { id = 0, name = "Skip Stage 15 — Cyber", priceRobux = 49 },
	SkipW10 = { id = 0, name = "Skip Stage 15 — Void", priceRobux = 99 },
}

-- Developer products = consumables. Map directly to the Phaser repo's gem
-- packs in src/config/economy.js so prices stay aligned across both products.
Monetization.DEV_PRODUCTS = {
	GemPackS = { id = 0, name = "Gem Pack S", priceRobux = 79, hardCurrency = 100 },
	GemPackM = { id = 0, name = "Gem Pack M", priceRobux = 399, hardCurrency = 600 },
	GemPackL = { id = 0, name = "Gem Pack L", priceRobux = 799, hardCurrency = 1300 },
	GemPackXL = { id = 0, name = "Gem Pack XL", priceRobux = 3999, hardCurrency = 7500 },
	GemPackXXL = { id = 0, name = "Gem Pack XXL", priceRobux = 7999, hardCurrency = 16000 },
	GachaSingleHard = { id = 0, name = "Gacha Pull (1)", priceRobux = 99, hardCurrency = -100 },
	GachaTenHard = { id = 0, name = "Gacha Pull (10)", priceRobux = 899, hardCurrency = -900 },
}

-- Helper: resolve gamepass for a world's skip gate.
function Monetization.skipPassForWorld(world: number)
	local key = "SkipW" .. tostring(world)
	return Monetization.GAMEPASSES[key]
end

return Monetization
