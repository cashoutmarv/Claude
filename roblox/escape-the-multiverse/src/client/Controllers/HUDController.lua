-- Top-left HUD: World N · Stage S · Soft / Hard / Selector tokens · session deaths.

local Players = game:GetService("Players")
local Shared = require(game:GetService("ReplicatedStorage").Shared)
local Net = Shared.Net

local HUDController = {}
HUDController._state = nil :: any
HUDController._frame = nil :: Frame?
HUDController._labels = {} :: any

local function makeLabel(parent: Frame, name: string, y: number)
	local lbl = Instance.new("TextLabel")
	lbl.Name = name
	lbl.BackgroundTransparency = 0.5
	lbl.BackgroundColor3 = Color3.new(0, 0, 0)
	lbl.TextColor3 = Color3.new(1, 1, 1)
	lbl.Font = Enum.Font.GothamBold
	lbl.TextSize = 18
	lbl.TextXAlignment = Enum.TextXAlignment.Left
	lbl.Position = UDim2.fromOffset(12, y)
	lbl.Size = UDim2.fromOffset(220, 24)
	lbl.Parent = parent
	return lbl
end

function HUDController:Init(state)
	self._state = state
	local UIController = require(script.Parent.UIController)
	local frame = Instance.new("Frame")
	frame.Name = "HUD"
	frame.BackgroundTransparency = 1
	frame.Position = UDim2.fromOffset(12, 12)
	frame.Size = UDim2.fromOffset(240, 200)
	frame.Parent = UIController.root
	self._frame = frame

	self._labels.stage = makeLabel(frame, "Stage", 0)
	self._labels.soft = makeLabel(frame, "Soft", 28)
	self._labels.hard = makeLabel(frame, "Hard", 56)
	self._labels.tokens = makeLabel(frame, "Tokens", 84)
	self._labels.deaths = makeLabel(frame, "Deaths", 112)
end

local function fmt(n: number?): string
	return tostring(n or 0)
end

function HUDController:_render()
	local p = self._state.profile
	if not p then
		return
	end
	local g = p.highestStage or 0
	local nextG = math.min(200, g + 1)
	local world = math.floor((nextG - 1) / 20) + 1
	local stage = ((nextG - 1) % 20) + 1
	self._labels.stage.Text = string.format("World %d  ·  Stage %d", world, stage)
	self._labels.soft.Text = "Soft: " .. fmt(p.currency and p.currency.soft)
	self._labels.hard.Text = "Hard: " .. fmt(p.currency and p.currency.hard)
	self._labels.tokens.Text = "Selector: " .. fmt(p.currency and p.currency.selectorTokens)
end

function HUDController:Start()
	Net.event("ProfileSync").OnClientEvent:Connect(function()
		task.defer(function()
			self:_render()
		end)
	end)
	Net.event("CurrencyChanged").OnClientEvent:Connect(function(kind, value)
		local p = self._state.profile
		if not p then
			return
		end
		p.currency = p.currency or {}
		p.currency[kind] = value
		self:_render()
	end)
	Net.event("DeathCountChanged").OnClientEvent:Connect(function(userId, count)
		if userId == Players.LocalPlayer.UserId then
			self._labels.deaths.Text = "Deaths: " .. count
		end
	end)
	-- Initial render after ProfileSync arrives.
	task.spawn(function()
		while not self._state.profile do
			task.wait(0.5)
		end
		self:_render()
	end)
end

return HUDController
