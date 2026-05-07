-- Updates the SurfaceGui leaderboard at spawn from Net.LeaderboardUpdate.
-- Looks for a Workspace.Spawn.LeaderboardSign with a SurfaceGui inside.

local Workspace = game:GetService("Workspace")
local Players = game:GetService("Players")
local Shared = require(game:GetService("ReplicatedStorage").Shared)
local Net = Shared.Net

local LB = {}

local function findFrame(): Frame?
	local spawnFolder = Workspace:FindFirstChild("Spawn")
	if not spawnFolder then
		return nil
	end
	local sign = spawnFolder:FindFirstChild("LeaderboardSign")
	if not sign then
		return nil
	end
	local gui = sign:FindFirstChildWhichIsA("SurfaceGui")
	if not gui then
		return nil
	end
	return gui:FindFirstChild("List", true) :: Frame?
end

local function ensureRowFrame(parent: Frame, i: number): Frame
	local existing = parent:FindFirstChild("Row" .. i)
	if existing and existing:IsA("Frame") then
		return existing
	end
	local row = Instance.new("Frame")
	row.Name = "Row" .. i
	row.BackgroundTransparency = 1
	row.Size = UDim2.new(1, 0, 0, 32)
	row.Position = UDim2.new(0, 0, 0, (i - 1) * 36)
	row.Parent = parent

	local rank = Instance.new("TextLabel")
	rank.Name = "Rank"
	rank.BackgroundTransparency = 1
	rank.Size = UDim2.fromOffset(40, 32)
	rank.Font = Enum.Font.GothamBlack
	rank.TextSize = 22
	rank.TextColor3 = Color3.new(1, 1, 1)
	rank.Text = "#" .. i
	rank.Parent = row

	local name = Instance.new("TextLabel")
	name.Name = "PlayerName"
	name.BackgroundTransparency = 1
	name.Position = UDim2.fromOffset(48, 0)
	name.Size = UDim2.new(1, -120, 0, 32)
	name.Font = Enum.Font.Gotham
	name.TextSize = 18
	name.TextColor3 = Color3.new(1, 1, 1)
	name.TextXAlignment = Enum.TextXAlignment.Left
	name.Parent = row

	local score = Instance.new("TextLabel")
	score.Name = "Score"
	score.BackgroundTransparency = 1
	score.AnchorPoint = Vector2.new(1, 0)
	score.Position = UDim2.new(1, -8, 0, 0)
	score.Size = UDim2.fromOffset(80, 32)
	score.Font = Enum.Font.GothamBold
	score.TextSize = 18
	score.TextColor3 = Color3.fromRGB(255, 220, 80)
	score.TextXAlignment = Enum.TextXAlignment.Right
	score.Parent = row

	return row
end

local function render(list: { any })
	local frame = findFrame()
	if not frame then
		return
	end
	for i = 1, 10 do
		local row = ensureRowFrame(frame, i)
		local entry = list[i]
		if entry then
			row.PlayerName.Text = (function()
				local ok, name = pcall(function()
					return Players:GetNameFromUserIdAsync(entry.userId)
				end)
				return ok and name or ("user_" .. entry.userId)
			end)()
			row.Score.Text = "World " .. entry.score
		else
			row.PlayerName.Text = "—"
			row.Score.Text = ""
		end
	end
end

function LB:Init(_state) end

function LB:Start()
	Net.event("LeaderboardUpdate").OnClientEvent:Connect(function(list)
		render(list)
	end)
end

return LB
