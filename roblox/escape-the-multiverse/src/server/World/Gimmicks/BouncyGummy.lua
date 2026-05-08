-- Candy: high bounce velocity on touch.
local M = {}
function M.apply(part: BasePart, velocity: number?)
	velocity = velocity or 80
	part.Touched:Connect(function(hit)
		local hrp = hit.Parent and hit.Parent:FindFirstChild("HumanoidRootPart")
		if hrp and hrp:IsA("BasePart") then
			hrp.AssemblyLinearVelocity = Vector3.new(hrp.AssemblyLinearVelocity.X, velocity, hrp.AssemblyLinearVelocity.Z)
		end
	end)
end
return M
