-- Moon: HingeConstraint-rotated platform.
local M = {}
function M.apply(parent: Instance, cf: CFrame, size: Vector3, rps: number?)
	rps = rps or 0.4
	local pivot = Instance.new("Part")
	pivot.Anchored = true
	pivot.CanCollide = false
	pivot.Transparency = 1
	pivot.Size = Vector3.new(1, 1, 1)
	pivot.CFrame = cf
	pivot.Parent = parent

	local plat = Instance.new("Part")
	plat.Anchored = false
	plat.Massless = true
	plat.Size = size
	plat.Material = Enum.Material.Metal
	plat.Color = Color3.fromRGB(180, 180, 200)
	plat.CFrame = cf
	plat.Parent = parent

	local a0 = Instance.new("Attachment", pivot)
	a0.Orientation = Vector3.new(0, 90, 0)
	local a1 = Instance.new("Attachment", plat)
	a1.Orientation = Vector3.new(0, 90, 0)

	local hinge = Instance.new("HingeConstraint")
	hinge.Attachment0 = a0
	hinge.Attachment1 = a1
	hinge.ActuatorType = Enum.ActuatorType.Motor
	hinge.AngularVelocity = rps * math.pi * 2
	hinge.MotorMaxTorque = 1e6
	hinge.Parent = plat
end
return M
