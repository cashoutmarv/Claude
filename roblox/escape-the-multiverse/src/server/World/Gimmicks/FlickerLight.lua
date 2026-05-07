-- Backrooms: PointLight + Beam that flickers on a jittery interval.
local M = {}
function M.apply(parent: Instance, cf: CFrame)
	local lamp = Instance.new("Part")
	lamp.Size = Vector3.new(2, 0.4, 2)
	lamp.Material = Enum.Material.Neon
	lamp.Color = Color3.fromRGB(255, 230, 130)
	lamp.Anchored = true
	lamp.CanCollide = false
	lamp.CFrame = cf
	lamp.Parent = parent
	local light = Instance.new("PointLight")
	light.Brightness = 6
	light.Range = 20
	light.Color = Color3.fromRGB(255, 220, 100)
	light.Parent = lamp
	task.spawn(function()
		while lamp.Parent do
			task.wait(math.random() * 1.2 + 0.2)
			light.Enabled = not light.Enabled
			lamp.Material = light.Enabled and Enum.Material.Neon or Enum.Material.SmoothPlastic
		end
	end)
end
return M
