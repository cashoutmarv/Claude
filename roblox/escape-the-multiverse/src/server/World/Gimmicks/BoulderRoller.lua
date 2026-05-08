-- Temple: SphereParts traveling along a spline path.
local Spline = require(game:GetService("ReplicatedStorage").Shared.Modules.Spline)

local M = {}
function M.apply(parent: Instance, controlPoints: { Vector3 }, speed: number?)
	speed = speed or 14
	local boulder = Instance.new("Part")
	boulder.Shape = Enum.PartType.Ball
	boulder.Size = Vector3.new(6, 6, 6)
	boulder.Material = Enum.Material.Slate
	boulder.Color = Color3.fromRGB(120, 90, 60)
	boulder.Anchored = true
	boulder.CanCollide = true
	boulder.Parent = parent
	local sp = Spline.new(controlPoints)
	-- length approximation: sum of segment distances
	local length = 0
	for i = 1, #controlPoints - 1 do
		length += (controlPoints[i + 1] - controlPoints[i]).Magnitude
	end
	local duration = math.max(1, length / speed)
	task.spawn(function()
		while boulder.Parent do
			local t0 = os.clock()
			while boulder.Parent do
				local t = (os.clock() - t0) / duration
				if t >= 1 then
					break
				end
				boulder.Position = sp:SampleAt(t)
				task.wait()
			end
		end
	end)
	boulder.Touched:Connect(function(hit)
		local hum = hit.Parent and hit.Parent:FindFirstChildOfClass("Humanoid")
		if hum then
			hum.Health = 0
		end
	end)
end
return M
