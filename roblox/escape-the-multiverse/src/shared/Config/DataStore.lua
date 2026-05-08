local DataStore = {
	profileStore = "ETM_Profiles_v1",
	leaderboardStore = "ETM_WorldsCompleted_v1",
	-- Throttle/Retry policy.
	writeMinInterval = 6, -- seconds between profile writes per player
	retries = 3,
	retryBackoffBase = 2, -- 2^n seconds: 1, 2, 4
	-- Top-N to display on the spawn leaderboard.
	leaderboardSize = 10,
	leaderboardRefreshInterval = 60,
}

return DataStore
