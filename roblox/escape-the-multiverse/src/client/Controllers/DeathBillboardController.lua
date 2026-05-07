-- Maintains a BillboardGui above each player's head bound to their death count.

local Players = game:GetService("Players")
local Shared = require(game:GetService("ReplicatedStorage").Shared)
local Net = Shared.Net

local DeathBillboardController = {}
local counts: { [number]: number } = {}
local guis: { [Player]: BillboardGui } = {}

local function ensureGui(player: Player)
	if guis[player] then
		return guis[player]
	end
	local char = player.Character
	if not char then
		return nil
	end
	local head = char:FindFirstChild("Head")
	if not head then
		return nil
	end
	local bb = Instance.new("BillboardGui")
	bb.Name = "ETM_DeathTag"
	bb.Adornee = head
	bb.Size = UDim2.fromOffset(120, 30)
	bb.StudsOffset = Vector3.new(0, 2.4, 0)
	bb.AlwaysOnTop = true
	bb.Parent = head
	local lbl = Instance.new("TextLabel")
	lbl.BackgroundTransparency = 1
	lbl.Size = UDim2.fromScale(1, 1)
	lbl.Font = Enum.Font.GothamBold
	lbl.TextSize = 18
	lbl.TextStrokeTransparency = 0.5
	lbl.TextColor3 = Color3.fromRGB(255, 80, 80)
	lbl.Text = "💀 0"
	lbl.Parent = bb
	guis[player] = bb
	return bb
end

local function setCount(player: Player, n: number)
	local bb = ensureGui(player)
	if not bb then
		return
	end
	local lbl = bb:FindFirstChildWhichIsA("TextLabel")
	if lbl then
		lbl.Text = "💀 " .. n
	end
end

local function bindPlayer(player: Player)
	player.CharacterAdded:Connect(function()
		task.wait(0.5)
		setCount(player, counts[player.UserId] or 0)
	end)
end

function DeathBillboardController:Init(_state) end

function DeathBillboardController:Start()
	for _, plr in ipairs(Players:GetPlayers()) do
		bindPlayer(plr)
	end
	Players.PlayerAdded:Connect(bindPlayer)
	Players.PlayerRemoving:Connect(function(plr)
		guis[plr] = nil
	end)
	Net.event("DeathCountChanged").OnClientEvent:Connect(function(userId, count)
		counts[userId] = count
		local plr = Players:GetPlayerByUserId(userId)
		if plr then
			setCount(plr, count)
		end
	end)
end

return DeathBillboardController
