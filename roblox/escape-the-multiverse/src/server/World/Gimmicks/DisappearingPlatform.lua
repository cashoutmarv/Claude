-- Glitch World: platforms phase in/out on a timer.
local M = {}
function M.apply(part: BasePart, period: number?)
	period = period or 1.5
	task.spawn(function()
		while part.Parent do
			task.wait(period)
			part.Transparency = 1
			part.CanCollide = false
			task.wait(period * 0.5)
			part.Transparency = 0
			part.CanCollide = true
		end
	end)
end
return M
