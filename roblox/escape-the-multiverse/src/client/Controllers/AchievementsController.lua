-- Listens for Net.AchievementUnlocked from the server and pops a small
-- 3-4 second toast over the UIController's root ScreenGui. Stacks toasts
-- if multiple unlocks land back-to-back so none are lost.

local Shared = require(game:GetService("ReplicatedStorage").Shared)
local Net = Shared.Net

local TOAST_LIFETIME = 3.5
local TOAST_HEIGHT = 56
local TOAST_WIDTH = 320

local AchievementsController = {}
AchievementsController._state = nil :: any
AchievementsController._stack = nil :: Frame?
AchievementsController._activeToasts = 0

function AchievementsController:Init(state)
	self._state = state
end

local function buildToast(parent: Instance, label: string, reward: number)
	local frame = Instance.new("Frame")
	frame.Name = "AchievementToast"
	frame.BackgroundColor3 = Color3.fromRGB(28, 28, 36)
	frame.BackgroundTransparency = 0.05
	frame.BorderSizePixel = 0
	frame.Size = UDim2.fromOffset(TOAST_WIDTH, TOAST_HEIGHT)
	frame.Parent = parent

	local stroke = Instance.new("UIStroke")
	stroke.Color = Color3.fromRGB(255, 215, 0)
	stroke.Thickness = 1.5
	stroke.Parent = frame

	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0, 6)
	corner.Parent = frame

	local title = Instance.new("TextLabel")
	title.Name = "Title"
	title.BackgroundTransparency = 1
	title.Text = "Achievement Unlocked: " .. tostring(label)
	title.Font = Enum.Font.GothamBold
	title.TextColor3 = Color3.fromRGB(255, 220, 80)
	title.TextSize = 16
	title.TextXAlignment = Enum.TextXAlignment.Left
	title.Position = UDim2.fromOffset(12, 6)
	title.Size = UDim2.fromOffset(TOAST_WIDTH - 24, 22)
	title.Parent = frame

	local sub = Instance.new("TextLabel")
	sub.Name = "Reward"
	sub.BackgroundTransparency = 1
	sub.Text = "+" .. tostring(reward) .. " hard currency"
	sub.Font = Enum.Font.Gotham
	sub.TextColor3 = Color3.fromRGB(220, 220, 220)
	sub.TextSize = 14
	sub.TextXAlignment = Enum.TextXAlignment.Left
	sub.Position = UDim2.fromOffset(12, 30)
	sub.Size = UDim2.fromOffset(TOAST_WIDTH - 24, 18)
	sub.Parent = frame

	return frame
end

function AchievementsController:_ensureStack()
	if self._stack and self._stack.Parent then
		return self._stack
	end
	local UIController = require(script.Parent.UIController)
	local root = UIController.root
	if not root then
		return nil
	end
	local stack = Instance.new("Frame")
	stack.Name = "AchievementToastStack"
	stack.BackgroundTransparency = 1
	stack.AnchorPoint = Vector2.new(1, 0)
	stack.Position = UDim2.new(1, -16, 0, 16)
	stack.Size = UDim2.fromOffset(TOAST_WIDTH, 400)
	stack.Parent = root

	local layout = Instance.new("UIListLayout")
	layout.FillDirection = Enum.FillDirection.Vertical
	layout.SortOrder = Enum.SortOrder.LayoutOrder
	layout.Padding = UDim.new(0, 8)
	layout.HorizontalAlignment = Enum.HorizontalAlignment.Right
	layout.Parent = stack

	self._stack = stack
	return stack
end

function AchievementsController:_showToast(payload: any)
	if type(payload) ~= "table" then
		return
	end
	local label = tostring(payload.label or payload.id or "Achievement")
	local reward = tonumber(payload.hardReward) or 0
	local stack = self:_ensureStack()
	if not stack then
		return
	end
	local toast = buildToast(stack, label, reward)
	self._activeToasts += 1
	task.delay(TOAST_LIFETIME, function()
		if toast and toast.Parent then
			toast:Destroy()
		end
		self._activeToasts = math.max(0, self._activeToasts - 1)
	end)
end

function AchievementsController:Start()
	Net.event("AchievementUnlocked").OnClientEvent:Connect(function(payload)
		self:_showToast(payload)
	end)
end

return AchievementsController
