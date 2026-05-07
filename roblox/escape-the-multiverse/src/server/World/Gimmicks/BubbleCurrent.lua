-- Abyss: zone that pushes Humanoid sideways via VectorForce.
local M = {}
function M.apply(part: BasePart, direction: Vector3, magnitude: number?)
	magnitude = magnitude or 80
	local active: { [BasePart]: VectorForce } = {}
	part.Touched:Connect(function(hit)
		local hrp = hit.Parent and hit.Parent:FindFirstChild("HumanoidRootPart")
		if not (hrp and hrp:IsA("BasePart")) then
			return
		end
		if active[hrp] then
			return
		end
		local att = Instance.new("Attachment", hrp)
		local f = Instance.new("VectorForce")
		f.Attachment0 = att
		f.RelativeTo = Enum.ActuatorRelativeTo.World
		f.ApplyAtCenterOfMass = true
		f.Force = direction.Unit * magnitude * hrp.AssemblyMass
		f.Parent = hrp
		active[hrp] = f
		task.delay(1.2, function()
			if active[hrp] then
				f:Destroy()
				att:Destroy()
				active[hrp] = nil
			end
		end)
	end)
end
return M
