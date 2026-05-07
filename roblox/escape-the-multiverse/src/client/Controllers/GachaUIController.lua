-- Modal gacha screen + result reveal animation.

local Players = game:GetService("Players")
local TweenService = game:GetService("TweenService")
local Shared = require(game:GetService("ReplicatedStorage").Shared)
local Net = Shared.Net
local Gacha = Shared.Config.Gacha

local TIER_COLORS: { [string]: Color3 } = {
	Common = Color3.fromRGB(180, 180, 180),
	Uncommon = Color3.fromRGB(100, 200, 100),
	Rare = Color3.fromRGB(80, 160, 255),
	Epic = Color3.fromRGB(200, 100, 255),
	Legendary = Color3.fromRGB(255, 200, 60),
}

local GachaUI = {}
GachaUI._modal = nil :: Frame?

local function makeModal(root: Instance): Frame
	local f = Instance.new("Frame")
	f.Name = "GachaModal"
	f.AnchorPoint = Vector2.new(0.5, 0.5)
	f.Position = UDim2.fromScale(0.5, 0.5)
	f.Size = UDim2.fromOffset(640, 420)
	f.BackgroundColor3 = Color3.fromRGB(20, 20, 30)
	f.Visible = false
	f.Parent = root
	local title = Instance.new("TextLabel")
	title.BackgroundTransparency = 1
	title.Font = Enum.Font.GothamBlack
	title.TextSize = 28
	title.TextColor3 = Color3.new(1, 1, 1)
	title.Size = UDim2.new(1, 0, 0, 40)
	title.Text = "Gacha"
	title.Parent = f

	local close = Instance.new("TextButton")
	close.Text = "X"
	close.Font = Enum.Font.GothamBold
	close.TextSize = 22
	close.TextColor3 = Color3.new(1, 1, 1)
	close.BackgroundTransparency = 0.5
	close.AnchorPoint = Vector2.new(1, 0)
	close.Size = UDim2.fromOffset(36, 36)
	close.Position = UDim2.new(1, -8, 0, 8)
	close.Parent = f
	close.MouseButton1Click:Connect(function()
		f.Visible = false
	end)

	local function makeRollButton(label: string, banner: string, count: number, payment: string, y: number)
		local b = Instance.new("TextButton")
		b.AnchorPoint = Vector2.new(0.5, 0)
		b.Position = UDim2.new(0.5, 0, 0, y)
		b.Size = UDim2.fromOffset(280, 40)
		b.BackgroundColor3 = Color3.fromRGB(60, 60, 100)
		b.TextColor3 = Color3.new(1, 1, 1)
		b.Font = Enum.Font.GothamBold
		b.TextSize = 18
		b.Text = label
		b.Parent = f
		b.MouseButton1Click:Connect(function()
			Net.event("RollGacha"):FireServer(banner, count, payment)
		end)
	end

	makeRollButton("Standard ×1 (Soft)", Gacha.STANDARD_BANNER.id, 1, "soft", 60)
	makeRollButton("Standard ×10 (Soft)", Gacha.STANDARD_BANNER.id, 10, "soft", 110)
	makeRollButton("Standard ×1 (Hard)", Gacha.STANDARD_BANNER.id, 1, "hard", 160)
	makeRollButton("Featured ×10 (Hard)", Gacha.FEATURED_BANNER.id, 10, "hard", 210)
	return f
end

local function showResults(root: Instance, results: { any })
	local frame = Instance.new("Frame")
	frame.AnchorPoint = Vector2.new(0.5, 0.5)
	frame.Position = UDim2.fromScale(0.5, 0.5)
	frame.Size = UDim2.fromOffset(720, 320)
	frame.BackgroundColor3 = Color3.fromRGB(10, 10, 15)
	frame.ZIndex = 30
	frame.Parent = root
	for i, r in ipairs(results) do
		local tile = Instance.new("Frame")
		tile.Size = UDim2.fromOffset(60, 90)
		tile.Position = UDim2.fromOffset(20 + (i - 1) * 70, 80)
		tile.BackgroundColor3 = TIER_COLORS[r.tier] or Color3.new(0.5, 0.5, 0.5)
		tile.ZIndex = 31
		tile.Parent = frame
		tile.BackgroundTransparency = 1
		TweenService
			:Create(tile, TweenInfo.new(0.25, Enum.EasingStyle.Quad, Enum.EasingDirection.Out, 0, false, i * 0.1), { BackgroundTransparency = 0 })
			:Play()
		local lbl = Instance.new("TextLabel")
		lbl.BackgroundTransparency = 1
		lbl.Size = UDim2.fromScale(1, 1)
		lbl.Font = Enum.Font.GothamBold
		lbl.TextSize = 12
		lbl.TextColor3 = Color3.new(0, 0, 0)
		lbl.TextWrapped = true
		lbl.ZIndex = 32
		lbl.Text = string.format("%s\n%s%s", r.cosmetic.name, r.tier, r.wasDupe and "  (dupe)" or "")
		lbl.Parent = tile
	end
	task.delay(5, function()
		frame:Destroy()
	end)
end

function GachaUI:Init(_state)
	local UIController = require(script.Parent.UIController)
	self._modal = makeModal(UIController.root)
end

function GachaUI:Start()
	Net.event("OpenGachaUI").OnClientEvent:Connect(function()
		if self._modal then
			self._modal.Visible = true
		end
	end)
	Net.event("GachaResult").OnClientEvent:Connect(function(results)
		local UIController = require(script.Parent.UIController)
		showResults(UIController.root, results)
	end)
end

return GachaUI
