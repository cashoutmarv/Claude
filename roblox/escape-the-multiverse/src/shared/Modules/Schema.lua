-- Profile schema migrations. DataService calls Schema.migrate(profile) before
-- handing the profile back to other services.

local Schema = {}

Schema.CURRENT_VERSION = 1

-- A brand-new profile.
function Schema.default(): any
	return {
		schemaVersion = Schema.CURRENT_VERSION,
		worldsCompleted = 0,
		highestStage = 0,
		checkpoints = {},
		ownedTrails = { Fire = true }, -- Fire trail is the free starter
		equippedTrail = "Fire",
		ownedCosmetics = {},
		equippedAura = nil,
		equippedNameplate = nil,
		currency = { soft = 0, hard = 0, selectorTokens = 0 },
		pity = {
			standard = { pullsSinceLegendary = 0, pullsSinceEpic = 0 },
			featured = { pullsSinceLegendary = 0, pullsSinceEpic = 0 },
		},
		badgesAwarded = {},
		ownedGamePasses = {},
		region = "GLOBAL",
	}
end

-- Migrations from older versions. Each entry mutates a profile in place from
-- version (i) to (i+1). Add new versions here.
local MIGRATIONS: { [number]: (any) -> () } = {}

function Schema.migrate(profile: any): any
	if type(profile) ~= "table" then
		return Schema.default()
	end
	profile.schemaVersion = profile.schemaVersion or 0
	while profile.schemaVersion < Schema.CURRENT_VERSION do
		local step = MIGRATIONS[profile.schemaVersion]
		if not step then
			break
		end
		step(profile)
		profile.schemaVersion += 1
	end
	-- Backfill any missing top-level keys (cheap insurance against partial saves).
	local def = Schema.default()
	for k, v in pairs(def) do
		if profile[k] == nil then
			profile[k] = v
		end
	end
	profile.schemaVersion = Schema.CURRENT_VERSION
	return profile
end

return Schema
