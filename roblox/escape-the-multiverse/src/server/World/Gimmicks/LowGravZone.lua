-- Moon: zone that swaps gravity by giving entrants a BodyForce that cancels
-- most of the world gravity.
local M = {}
function M.apply(part: BasePart, gravityFactor: number?)
	gravityFactor = gravityFactor or 0.25
	local active: { [BasePart]: VectorForce } = {}
	part.Touched:Connect(function(hit)
		local hrp = hit.Parent and hit.Parent:FindFirstChild("HumanoidRootPart")
		if not (hrp and hrp:IsA("BasePart")) then
			return
		end
		if active[hrp] then
			return
		end
		local f = Instance.new("VectorForce")
		local att = Instance.new("Attachment", hrp)
		f.Attachment0 = att
		f.RelativeTo = Enum.ActuatorRelativeTo.World
		f.ApplyAtCenterOfMass = true
		f.Force = Vector3.new(0, hrp.AssemblyMass * workspace.Gravity * (1 - gravityFactor), 0)
		f.Parent = hrp
		active[hrp] = f
		task.delay(2, function()
			if active[hrp] then
				f:Destroy()
				att:Destroy()
				active[hrp] = nil
			end
		end)
	end)
end
return M
