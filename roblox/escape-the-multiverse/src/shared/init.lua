-- Re-exports the most-used shared modules so callers can do
--   local Shared = require(ReplicatedStorage.Shared)
--   Shared.Net.event("StageReached")

local Shared = {}

Shared.Net = require(script.Net)
Shared.Types = require(script.Types)
Shared.Config = {
	Worlds = require(script.Config.Worlds),
	Difficulty = require(script.Config.Difficulty),
	StageTable = require(script.Config.StageTable),
	Gacha = require(script.Config.Gacha),
	Cosmetics = require(script.Config.Cosmetics),
	Monetization = require(script.Config.Monetization),
	Badges = require(script.Config.Badges),
	Race = require(script.Config.Race),
	DataStore = require(script.Config.DataStore),
	RemoteNames = require(script.Config.RemoteNames),
}
Shared.Modules = {
	Signal = require(script.Modules.Signal),
	Maid = require(script.Modules.Maid),
	RNG = require(script.Modules.RNG),
	Tween = require(script.Modules.Tween),
	Spline = require(script.Modules.Spline),
	Schema = require(script.Modules.Schema),
	Validate = require(script.Modules.Validate),
	PityCalculator = require(script.Modules.PityCalculator),
}

return Shared
