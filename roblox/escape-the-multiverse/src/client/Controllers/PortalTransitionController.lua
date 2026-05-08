-- World-transition cinematic. On Net.PortalCue: FOV punch (70→100, ease back),
-- fullscreen white flash, 2.5s lockout.

local TweenService = game:GetService("TweenService")
local Workspace = game:GetService("Workspace")
local Shared = require(game:GetService("ReplicatedStorage").Shared)
local Net = Shared.Net

local Portal = {}

local function flash(parent: ScreenGui, ms: number)
	local panel = Instance.new("Frame")
	panel.BackgroundColor3 = Color3.new(1, 1, 1)
	panel.BackgroundTransparency = 1
	panel.Size = UDim2.fromScale(1, 1)
	panel.ZIndex = 50
	panel.Parent = parent
	local fadeIn = TweenService:Create(panel, TweenInfo.new(0.18), { BackgroundTransparency = 0 })
	fadeIn:Play()
	fadeIn.Completed:Wait()
	task.wait(ms / 1000)
	local fadeOut = TweenService:Create(panel, TweenInfo.new(0.6), { BackgroundTransparency = 1 })
	fadeOut:Play()
	fadeOut.Completed:Wait()
	panel:Destroy()
end

function Portal:Init(_state) end

function Portal:Start()
	Net.event("PortalCue").OnClientEvent:Connect(function(toWorld: number)
		local cam = Workspace.CurrentCamera
		local UIController = require(script.Parent.UIController)
		local root = UIController.root
		local prevFov = cam.FieldOfView
		TweenService:Create(cam, TweenInfo.new(0.4), { FieldOfView = 100 }):Play()
		task.spawn(function()
			task.wait(0.5)
			TweenService:Create(cam, TweenInfo.new(2), { FieldOfView = prevFov }):Play()
		end)
		if root then
			task.spawn(flash, root, 1500)
		end
		-- Banner with the next world's name.
		if root then
			local label = Instance.new("TextLabel")
			label.AnchorPoint = Vector2.new(0.5, 0.5)
			label.Position = UDim2.fromScale(0.5, 0.5)
			label.Size = UDim2.fromOffset(700, 100)
			label.BackgroundTransparency = 1
			label.Font = Enum.Font.GothamBlack
			label.TextSize = 56
			label.TextColor3 = Color3.fromRGB(255, 255, 255)
			label.TextStrokeTransparency = 0.2
			label.ZIndex = 51
			label.Text = "ENTERING WORLD " .. toWorld
			label.TextTransparency = 1
			label.Parent = root
			TweenService:Create(label, TweenInfo.new(0.35), { TextTransparency = 0 }):Play()
			task.delay(2.0, function()
				TweenService:Create(label, TweenInfo.new(0.5), { TextTransparency = 1 }):Play()
				task.wait(0.6)
				label:Destroy()
			end)
		end
	end)
end

return Portal
