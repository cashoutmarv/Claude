-- Watches the two finish flags + a deadline. Fires onResult(winner, loser).

local Scorer = {}

function Scorer.run(arena: any, playerA: Player, playerB: Player, timerSec: number, onResult: (Player, Player) -> ())
	local finished = false
	local function finalize(winner: Player, loser: Player)
		if finished then
			return
		end
		finished = true
		onResult(winner, loser)
	end

	arena.flagA.Touched:Connect(function(hit)
		if game.Players:GetPlayerFromCharacter(hit.Parent) == playerA then
			finalize(playerA, playerB)
		end
	end)
	arena.flagB.Touched:Connect(function(hit)
		if game.Players:GetPlayerFromCharacter(hit.Parent) == playerB then
			finalize(playerB, playerA)
		end
	end)

	task.delay(timerSec, function()
		if finished then
			return
		end
		-- Timer expired: pick whoever progressed further by Z-distance from origin.
		local function zProgress(plr: Player): number
			local hrp = plr.Character and plr.Character:FindFirstChild("HumanoidRootPart")
			if not (hrp and hrp:IsA("BasePart")) then
				return -math.huge
			end
			return -(hrp.Position - arena.origin.Position).Z
		end
		local pa = zProgress(playerA)
		local pb = zProgress(playerB)
		if pa >= pb then
			finalize(playerA, playerB)
		else
			finalize(playerB, playerA)
		end
	end)
end

return Scorer
