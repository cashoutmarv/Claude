-- Void: starts invisible (Transparency=1), reveals briefly when touched, then
-- fades back to invisible. The Void's signature mechanic.
local M = {}
function M.apply(part: BasePart)
	part.Transparency = 1
	part.Material = Enum.Material.Neon
	-- Outline highlight so players have *some* hint while standing on a discovered tile.
	local highlight = Instance.new("SelectionBox")
	highlight.Adornee = part
	highlight.LineThickness = 0.05
	highlight.Color3 = Color3.fromRGB(180, 0, 220)
	highlight.SurfaceTransparency = 1
	highlight.Visible = false
	highlight.Parent = part
	part.Touched:Connect(function(hit)
		local hum = hit.Parent and hit.Parent:FindFirstChildOfClass("Humanoid")
		if not hum then
			return
		end
		part.Transparency = 0.1
		highlight.Visible = true
		task.delay(1.2, function()
			if part.Parent then
				part.Transparency = 1
				highlight.Visible = false
			end
		end)
	end)
end
return M
