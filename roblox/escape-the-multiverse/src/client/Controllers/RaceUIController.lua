-- Race countdown overlay + win/lose banner.

local Shared = require(game:GetService("ReplicatedStorage").Shared)
local Net = Shared.Net

local RaceUI = {}

local function showBig(parent: Instance, text: string, color: Color3, ttl: number)
	local label = Instance.new("TextLabel")
	label.AnchorPoint = Vector2.new(0.5, 0.5)
	label.Position = UDim2.fromScale(0.5, 0.5)
	label.Size = UDim2.fromOffset(600, 140)
	label.BackgroundTransparency = 1
	label.Font = Enum.Font.GothamBlack
	label.TextSize = 80
	label.TextColor3 = color
	label.TextStrokeTransparency = 0.4
	label.Text = text
	label.ZIndex = 60
	label.Parent = parent
	task.delay(ttl, function()
		label:Destroy()
	end)
end

function RaceUI:Init(_state) end

function RaceUI:Start()
	Net.event("RaceCountdown").OnClientEvent:Connect(function(n: number)
		local UIController = require(script.Parent.UIController)
		local root = UIController.root
		if not root then
			return
		end
		if n == 0 then
			showBig(root, "GO!", Color3.fromRGB(0, 255, 80), 1.0)
		else
			showBig(root, tostring(n), Color3.fromRGB(255, 255, 255), 0.9)
		end
	end)
	Net.event("RaceResult").OnClientEvent:Connect(function(won: boolean)
		local UIController = require(script.Parent.UIController)
		local root = UIController.root
		if not root then
			return
		end
		if won then
			showBig(root, "WINNER", Color3.fromRGB(255, 220, 60), 3.0)
		else
			showBig(root, "Defeat", Color3.fromRGB(180, 60, 60), 3.0)
		end
	end)
end

return RaceUI
