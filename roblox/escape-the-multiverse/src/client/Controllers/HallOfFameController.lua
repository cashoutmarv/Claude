-- Renders top-10 avatar headshots into Workspace.HallOfFame.Wall surface frames.

local Workspace = game:GetService("Workspace")
local Players = game:GetService("Players")
local Shared = require(game:GetService("ReplicatedStorage").Shared)
local Net = Shared.Net

local HOF = {}

local function findFrames(): { Frame }
	local list = {}
	local hof = Workspace:FindFirstChild("HallOfFame")
	if not hof then
		return list
	end
	local wall = hof:FindFirstChild("Wall")
	if not wall then
		return list
	end
	local sg = wall:FindFirstChildWhichIsA("SurfaceGui")
	if not sg then
		return list
	end
	for i = 1, 10 do
		local f = sg:FindFirstChild("Slot" .. i)
		if f and f:IsA("Frame") then
			table.insert(list, f)
		end
	end
	return list
end

local function getThumb(userId: number): string
	local ok, content = pcall(function()
		return Players:GetUserThumbnailAsync(userId, Enum.ThumbnailType.HeadShot, Enum.ThumbnailSize.Size420x420)
	end)
	if ok then
		return content
	end
	return ""
end

local function render(list)
	local frames = findFrames()
	for i, frame in ipairs(frames) do
		local entry = list[i]
		local img = frame:FindFirstChildWhichIsA("ImageLabel")
		if not img then
			img = Instance.new("ImageLabel")
			img.BackgroundTransparency = 1
			img.Size = UDim2.fromScale(1, 1)
			img.Parent = frame
		end
		if entry then
			img.Image = getThumb(entry.userId)
		else
			img.Image = ""
		end
	end
end

function HOF:Init(_state) end
function HOF:Start()
	Net.event("LeaderboardUpdate").OnClientEvent:Connect(render)
end

return HOF
