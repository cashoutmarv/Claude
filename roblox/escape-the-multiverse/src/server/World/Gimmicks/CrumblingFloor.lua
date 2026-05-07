-- Temple: platform despawns shortly after first touch.
local M = {}
function M.apply(part: BasePart, despawnDelay: number?)
	despawnDelay = despawnDelay or 0.4
	local triggered = false
	part.Touched:Connect(function(hit)
		if triggered then
			return
		end
		local hum = hit.Parent and hit.Parent:FindFirstChildOfClass("Humanoid")
		if not hum then
			return
		end
		triggered = true
		task.delay(despawnDelay, function()
			if part.Parent then
				part.Transparency = 1
				part.CanCollide = false
			end
		end)
	end)
end
return M
