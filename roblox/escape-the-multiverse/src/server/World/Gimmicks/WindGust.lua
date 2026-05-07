-- Cloud City: invisible zone that pushes the player.
local M = {}
function M.apply(part: BasePart, direction: Vector3, magnitude: number?)
	magnitude = magnitude or 60
	part.Touched:Connect(function(hit)
		local hrp = hit.Parent and hit.Parent:FindFirstChild("HumanoidRootPart")
		if hrp and hrp:IsA("BasePart") then
			hrp.AssemblyLinearVelocity = hrp.AssemblyLinearVelocity + direction.Unit * magnitude
		end
	end)
end
return M
