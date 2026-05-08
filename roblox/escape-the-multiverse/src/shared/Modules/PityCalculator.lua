-- Pure logic for gacha rolls. Mirrors Phaser src/config/banners.js semantics:
--   - softPityFrom 50: legendary chance ramps linearly to hardPity
--   - hardPity 70: guaranteed legendary
--   - 10-pull: guaranteed Rare-or-better in the 10th if no Rare+ rolled in the
--     prior 9
-- Region "BE"/"NL" forbid hard-currency pulls (caller responsibility).

local PityCalculator = {}

local RATES_BASE = {
	Common = 0.65,
	Uncommon = 0.21,
	Rare = 0.10,
	Epic = 0.035,
	Legendary = 0.005,
}

local TIER_ORDER = { "Common", "Uncommon", "Rare", "Epic", "Legendary" }
local SOFT_PITY_FROM = 50
local HARD_PITY = 70

PityCalculator.RATES_BASE = RATES_BASE
PityCalculator.SOFT_PITY_FROM = SOFT_PITY_FROM
PityCalculator.HARD_PITY = HARD_PITY
PityCalculator.SELECTOR_COSTS = { Rare = 30, Epic = 80, Legendary = 150 }

local function legendaryChanceWithPity(pullsSinceLegendary: number): number
	if pullsSinceLegendary + 1 >= HARD_PITY then
		return 1
	end
	if pullsSinceLegendary + 1 < SOFT_PITY_FROM then
		return RATES_BASE.Legendary
	end
	-- ramp linearly from softPityFrom..hardPity
	local span = HARD_PITY - SOFT_PITY_FROM
	local progress = ((pullsSinceLegendary + 1) - SOFT_PITY_FROM) / span
	return RATES_BASE.Legendary + (1 - RATES_BASE.Legendary) * progress
end

PityCalculator.legendaryChanceWithPity = legendaryChanceWithPity

-- pullsSinceLegendary is the # of *prior* non-legendary pulls.
-- rng is a function returning [0,1).
function PityCalculator.rollTier(pullsSinceLegendary: number, rng: () -> number): string
	local legChance = legendaryChanceWithPity(pullsSinceLegendary)
	local r = rng()
	if r < legChance then
		return "Legendary"
	end
	-- Renormalize the remaining tiers across (1 - legChance).
	local remaining = 1 - RATES_BASE.Legendary
	local rolled = rng() * remaining
	local cum = 0
	for _, tier in ipairs({ "Common", "Uncommon", "Rare", "Epic" }) do
		cum += RATES_BASE[tier]
		if rolled < cum then
			return tier
		end
	end
	return "Epic"
end

-- Apply 10-pull guarantee: if none of the 9 results so far are Rare-or-better,
-- force the 10th to Rare (or keep the higher result if already Rare+).
function PityCalculator.applyTenPullGuarantee(results: { string }): { string }
	assert(#results == 10, "applyTenPullGuarantee expects exactly 10 results")
	local hasRarePlus = false
	for i = 1, 9 do
		local t = results[i]
		if t == "Rare" or t == "Epic" or t == "Legendary" then
			hasRarePlus = true
			break
		end
	end
	if not hasRarePlus then
		local last = results[10]
		if last == "Common" or last == "Uncommon" then
			results[10] = "Rare"
		end
	end
	return results
end

PityCalculator.TIER_ORDER = TIER_ORDER

return PityCalculator
