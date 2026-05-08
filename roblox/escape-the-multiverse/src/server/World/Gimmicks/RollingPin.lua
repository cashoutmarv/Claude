-- Kitchen: rolling pin that travels back and forth across a stage's width.
local Tween = require(game:GetService("ReplicatedStorage").Shared.Modules.Tween)

local M = {}
function M.apply(parent: Instance, cf: CFrame, travel: number?, time: number?)
	travel = travel or 14
	time = time or 2
	local pin = Instance.new("Part")
	pin.Shape = Enum.PartType.Cylinder
	pin.Size = Vector3.new(2, 1.5, 1.5) -- length on X
	pin.Material = Enum.Material.Wood
	pin.Color = Color3.fromRGB(190, 150, 90)
	pin.Anchored = true
	pin.CFrame = cf * CFrame.Angles(0, 0, math.rad(90))
	pin.Parent = parent
	local startCF = pin.CFrame
	task.spawn(function()
		while pin.Parent do
			Tween.run(pin, Tween.ease(time), { CFrame = startCF * CFrame.new(travel, 0, 0) })
			task.wait(time + 0.1)
			Tween.run(pin, Tween.ease(time), { CFrame = startCF })
			task.wait(time + 0.1)
		end
	end)
	pin.Touched:Connect(function(hit)
		local hum = hit.Parent and hit.Parent:FindFirstChildOfClass("Humanoid")
		if hum then
			hum.Health = 0
		end
	end)
end
return M
