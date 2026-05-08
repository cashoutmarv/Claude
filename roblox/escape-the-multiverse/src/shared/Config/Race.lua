local Race = {
	queueMin = 2,
	stagesPerRace = 10,
	timerSeconds = 60,
	-- Worlds eligible for a race section. Void excluded for fairness.
	eligibleWorlds = { 1, 2, 3, 4, 5, 6, 7, 8, 9 },
	-- Reward on win (loser gets 1/4 to soften the sting).
	winnerSoft = 500,
	loserSoft = 125,
	-- Where private arena clones live in Workspace, offset apart by this stride.
	arenaStride = Vector3.new(5000, 1000, 0),
	parentName = "RaceArenas",
}

return Race
