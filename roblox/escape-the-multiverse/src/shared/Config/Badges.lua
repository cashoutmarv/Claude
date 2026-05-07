-- Badge IDs. Replace 0s with real Badge IDs from create.roblox.com before
-- enabling BadgeService.

local Badges = {
	-- World clears (one per world).
	World1Cleared = 0,
	World2Cleared = 0,
	World3Cleared = 0,
	World4Cleared = 0,
	World5Cleared = 0,
	World6Cleared = 0,
	World7Cleared = 0,
	World8Cleared = 0,
	World9Cleared = 0,
	World10Cleared = 0,

	-- Hidden secret room in World 5 (precise jump on stage 8).
	AbyssSecretRoom = 0,

	-- 200-stage full clear.
	MultiverseEscape = 0,

	-- Race wins.
	FirstRaceWin = 0,

	-- 100 deaths in one session — comedic.
	HundredDeaths = 0,
}

function Badges.byWorld(world: number): number
	return Badges["World" .. tostring(world) .. "Cleared"] or 0
end

return Badges
