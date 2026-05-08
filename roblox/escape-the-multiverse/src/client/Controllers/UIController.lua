-- Owns the root ScreenGui that other controllers parent their sub-UIs into.

local Players = game:GetService("Players")

local UIController = {}
UIController.root = nil :: ScreenGui?

function UIController:Init(_state)
	local pg = Players.LocalPlayer:WaitForChild("PlayerGui")
	local root = Instance.new("ScreenGui")
	root.Name = "ETM_Root"
	root.ResetOnSpawn = false
	root.IgnoreGuiInset = true
	root.Parent = pg
	self.root = root
end

function UIController:Start() end

return UIController
