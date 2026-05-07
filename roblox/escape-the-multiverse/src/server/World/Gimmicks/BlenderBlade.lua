-- Kitchen: spinning blade hinge. Touch = death.
local M = {}
function M.apply(parent: Instance, cf: CFrame)
	local pivot = Instance.new("Part")
	pivot.Anchored = true
	pivot.CanCollide = false
	pivot.Transparency = 1
	pivot.Size = Vector3.new(1, 1, 1)
	pivot.CFrame = cf
	pivot.Parent = parent

	local blade = Instance.new("Part")
	blade.Size = Vector3.new(10, 0.5, 1)
	blade.Material = Enum.Material.Metal
	blade.Color = Color3.fromRGB(200, 200, 220)
	blade.Anchored = false
	blade.Massless = true
	blade.CFrame = cf
	blade.Parent = parent

	local a0 = Instance.new("Attachment", pivot)
	local a1 = Instance.new("Attachment", blade)
	local hinge = Instance.new("HingeConstraint")
	hinge.Attachment0 = a0
	hinge.Attachment1 = a1
	hinge.ActuatorType = Enum.ActuatorType.Motor
	hinge.AngularVelocity = 25
	hinge.MotorMaxTorque = 1e7
	hinge.Parent = blade

	blade.Touched:Connect(function(hit)
		local hum = hit.Parent and hit.Parent:FindFirstChildOfClass("Humanoid")
		if hum then
			hum.Health = 0
		end
	end)
end
return M
