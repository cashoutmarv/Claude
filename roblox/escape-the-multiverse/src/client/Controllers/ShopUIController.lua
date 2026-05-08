-- Minimal shop UI: trigger gamepass / dev product prompts via server.

local Shared = require(game:GetService("ReplicatedStorage").Shared)
local Net = Shared.Net
local Monet = Shared.Config.Monetization

local Shop = {}

local function makeButton(parent: Frame, label: string, productKey: string, kind: string, y: number)
	local b = Instance.new("TextButton")
	b.Position = UDim2.fromOffset(20, y)
	b.Size = UDim2.fromOffset(280, 36)
	b.BackgroundColor3 = Color3.fromRGB(60, 80, 60)
	b.TextColor3 = Color3.new(1, 1, 1)
	b.Font = Enum.Font.Gotham
	b.TextSize = 16
	b.Text = label
	b.Parent = parent
	b.MouseButton1Click:Connect(function()
		Net.event("RequestPurchase"):FireServer(kind, productKey)
	end)
end

function Shop:Init(_state)
	local UIController = require(script.Parent.UIController)
	local root = UIController.root
	local frame = Instance.new("Frame")
	frame.AnchorPoint = Vector2.new(0.5, 0.5)
	frame.Position = UDim2.fromScale(0.5, 0.5)
	frame.Size = UDim2.fromOffset(320, 480)
	frame.BackgroundColor3 = Color3.fromRGB(20, 30, 20)
	frame.Visible = false
	frame.Parent = root
	self._frame = frame

	local title = Instance.new("TextLabel")
	title.BackgroundTransparency = 1
	title.Font = Enum.Font.GothamBlack
	title.TextSize = 24
	title.TextColor3 = Color3.new(1, 1, 1)
	title.Size = UDim2.new(1, 0, 0, 36)
	title.Text = "SHOP"
	title.Parent = frame

	local y = 50
	for key, p in pairs(Monet.DEV_PRODUCTS) do
		makeButton(frame, p.name .. "  (" .. p.priceRobux .. " R$)", key, "DevProduct", y)
		y += 44
	end
	makeButton(frame, "VIP Game Pass", "VIP", "GamePass", y)
end

function Shop:Start()
	Net.event("OpenShopUI").OnClientEvent:Connect(function()
		if self._frame then
			self._frame.Visible = not self._frame.Visible
		end
	end)
end

return Shop
