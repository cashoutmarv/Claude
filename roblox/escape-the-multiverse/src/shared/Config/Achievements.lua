-- First-time milestone rewards. Each fires exactly once per player save and
-- grants hard currency on the first time a condition is hit. Modeled after
-- the Phaser repo's src/config/achievements.js: small drip of free hard
-- currency that bootstraps a new player's gacha pull pool, then naturally
-- tapers so IAP / Adventurer's Pass becomes the next progression step.
--
-- Triggers map to server-side Signals exposed by existing services:
--   "stage_first"        → Progression.StageReached  (any stage, first ever)
--   "world_first"        → Progression.WorldCompleted (any world, first ever)
--   "world_clear_N"      → Progression.WorldCompleted (specific world id, N=1..10)
--   "race_win_first"     → Race.OnWin                 (first race win ever)
--   "secret_first"       → Badge.SecretRoomEntered    (first time)
--   "vip_purchase_first" → Monetization.GamePassPurchased (VIP pass id)
--   "death_count_100"    → DeathTracker.OnDeath       (count >= 100)
--
-- Each row: { id, label, trigger, hardReward, oneShot }.
-- `oneShot` is always true for the v1 table (every grant is first-time only).

local Achievements = {}

Achievements.LIST = {
	-- ── Onboarding burst ────────────────────────────────────────────────
	{
		id = "stage_first",
		label = "First Steps",
		trigger = "stage_first",
		hardReward = 25, -- mirrors first_kill (25 gems) in Phaser achievements.js
		oneShot = true,
	},
	{
		id = "world_first",
		label = "Welcome to the Multiverse",
		trigger = "world_first",
		hardReward = 100, -- mirrors kills_100 (100 gems): first big milestone
		oneShot = true,
	},

	-- ── Per-world clears ────────────────────────────────────────────────
	-- Climbs roughly with difficulty. Sized so completing all 10 worlds
	-- yields ≈ 4,750 hard currency, which together with the bootstrap rows
	-- below totals close to the Phaser achievements.js ~9,000 budget.
	{
		id = "world_clear_1",
		label = "Glitch World Cleared",
		trigger = "world_clear_1",
		hardReward = 100,
		oneShot = true,
	},
	{
		id = "world_clear_2",
		label = "Candy Apocalypse Survived",
		trigger = "world_clear_2",
		hardReward = 150,
		oneShot = true,
	},
	{
		id = "world_clear_3",
		label = "Ancient Temple Conquered",
		trigger = "world_clear_3",
		hardReward = 200,
		oneShot = true,
	},
	{
		id = "world_clear_4",
		label = "Moon Base Escaped",
		trigger = "world_clear_4",
		hardReward = 300,
		oneShot = true,
	},
	{
		id = "world_clear_5",
		label = "Abyss Dweller",
		trigger = "world_clear_5",
		hardReward = 400,
		oneShot = true,
	},
	{
		id = "world_clear_6",
		label = "Kitchen Nightmare Ended",
		trigger = "world_clear_6",
		hardReward = 500,
		oneShot = true,
	},
	{
		id = "world_clear_7",
		label = "Cloud Surfer",
		trigger = "world_clear_7",
		hardReward = 500,
		oneShot = true,
	},
	{
		id = "world_clear_8",
		label = "Backrooms Mapper",
		trigger = "world_clear_8",
		hardReward = 500,
		oneShot = true,
	},
	{
		id = "world_clear_9",
		label = "Cyber Tokyo Drifter",
		trigger = "world_clear_9",
		hardReward = 500,
		oneShot = true,
	},
	{
		id = "world_clear_10",
		label = "Multiverse Escaper",
		trigger = "world_clear_10",
		hardReward = 1000, -- mirrors Phaser kills_10000 (1000 gems): cap reward
		oneShot = true,
	},

	-- ── Roblox-specific milestones ──────────────────────────────────────
	{
		id = "race_win_first",
		label = "First Race Win",
		trigger = "race_win_first",
		hardReward = 200, -- aligns with Phaser first_pull (200 gems): one-shot bonus
		oneShot = true,
	},
	{
		id = "secret_first",
		label = "Secret Found",
		trigger = "secret_first",
		hardReward = 500, -- aligns with Phaser first_legendary (500 gems): rare find
		oneShot = true,
	},
	{
		id = "vip_purchase_first",
		label = "VIP Activated",
		trigger = "vip_purchase_first",
		hardReward = 500, -- thank-you grant for first VIP purchase
		oneShot = true,
	},
	{
		id = "death_count_100",
		label = "Resilient",
		trigger = "death_count_100",
		hardReward = 50, -- mirrors Phaser first_death (50 gems): consolation
		oneShot = true,
		threshold = 100,
	},
}

-- Build a fast lookup by id (used by service + tests).
Achievements.BY_ID = {}
for _, row in ipairs(Achievements.LIST) do
	Achievements.BY_ID[row.id] = row
end

-- Trigger → list of achievement ids that listen on that trigger key.
Achievements.BY_TRIGGER = {}
for _, row in ipairs(Achievements.LIST) do
	local list = Achievements.BY_TRIGGER[row.trigger]
	if not list then
		list = {}
		Achievements.BY_TRIGGER[row.trigger] = list
	end
	table.insert(list, row.id)
end

-- Sanity total — useful for tuning. Sum across the whole table.
Achievements.HARD_REWARD_TOTAL = 0
for _, row in ipairs(Achievements.LIST) do
	Achievements.HARD_REWARD_TOTAL = Achievements.HARD_REWARD_TOTAL + row.hardReward
end

return Achievements
