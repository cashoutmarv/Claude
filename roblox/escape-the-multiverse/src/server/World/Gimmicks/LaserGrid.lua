-- Cyber Tokyo / Void: damage-on-touch laser. Pulses on a duty cycle so players
-- can time their crossing.
local M = {}
function M.apply(parent: Instance, cf: CFrame, length: number?, period: number?)
	length = length or 12
	period = period or 1.4
	local laser = Instance.new("Part")
	laser.Size = Vector3.new(0.4, 8, length)
	laser.Material = Enum.Material.Neon
	laser.Color = Color3.fromRGB(255, 0, 60)
	laser.Anchored = true
	laser.CanCollide = false
	laser.Transparency = 0.3
	laser.CFrame = cf
	laser.Parent = parent
	task.spawn(function()
		while laser.Parent do
			laser.Transparency = 0.3
			laser.CanTouch = true
			task.wait(period * 0.7)
			laser.Transparency = 0.95
			laser.CanTouch = false
			task.wait(period * 0.3)
		end
	end)
	laser.Touched:Connect(function(hit)
		if not laser.CanTouch then
			return
		end
		local hum = hit.Parent and hit.Parent:FindFirstChildOfClass("Humanoid")
		if hum then
			hum.Health = 0
		end
	end)
end
return M
