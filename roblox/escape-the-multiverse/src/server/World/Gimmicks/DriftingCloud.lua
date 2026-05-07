-- Cloud City: cloud platform that tweens back and forth.
local Tween = require(game:GetService("ReplicatedStorage").Shared.Modules.Tween)

local M = {}
function M.apply(part: BasePart, offset: Vector3, time: number?)
	time = time or 3
	local startCF = part.CFrame
	task.spawn(function()
		while part.Parent do
			Tween.run(part, Tween.loop(time, Enum.EasingStyle.Sine), { CFrame = startCF * CFrame.new(offset) })
			task.wait(time * 2)
		end
	end)
end
return M
