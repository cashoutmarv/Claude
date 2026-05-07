-- Candy: WalkSpeed slowed inside the zone.
local M = {}
function M.apply(part: BasePart, slowFactor: number?)
	slowFactor = slowFactor or 0.4
	local affected: { [Humanoid]: number } = {}
	part.Touched:Connect(function(hit)
		local hum = hit.Parent and hit.Parent:FindFirstChildOfClass("Humanoid")
		if hum and not affected[hum] then
			affected[hum] = hum.WalkSpeed
			hum.WalkSpeed = hum.WalkSpeed * slowFactor
		end
	end)
	part.TouchEnded:Connect(function(hit)
		local hum = hit.Parent and hit.Parent:FindFirstChildOfClass("Humanoid")
		if hum and affected[hum] then
			hum.WalkSpeed = affected[hum]
			affected[hum] = nil
		end
	end)
end
return M
