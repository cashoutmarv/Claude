-- Listens for ClickDetectors on Workspace.TrailKiosk.<TrailId> parts. Click
-- → Net.SelectTrail. Server validates ownership / spawn-kiosk free pool.

local Workspace = game:GetService("Workspace")
local CollectionService = game:GetService("CollectionService")
local Shared = require(game:GetService("ReplicatedStorage").Shared)
local Net = Shared.Net

local TrailSelector = {}

local function bindButton(part: BasePart)
	local trailId = part:GetAttribute("TrailId")
	if not trailId then
		return
	end
	local cd = part:FindFirstChildOfClass("ClickDetector")
	if not cd then
		cd = Instance.new("ClickDetector")
		cd.MaxActivationDistance = 16
		cd.Parent = part
	end
	cd.MouseClick:Connect(function()
		Net.event("SelectTrail"):FireServer(trailId)
	end)
end

function TrailSelector:Init(_state) end

function TrailSelector:Start()
	-- Tagged buttons.
	for _, p in ipairs(CollectionService:GetTagged("TrailButton")) do
		if p:IsA("BasePart") then
			bindButton(p)
		end
	end
	CollectionService:GetInstanceAddedSignal("TrailButton"):Connect(function(p)
		if p:IsA("BasePart") then
			bindButton(p)
		end
	end)
	-- Also fall back to scanning the TrailKiosk model.
	local kiosk = Workspace:FindFirstChild("TrailKiosk")
	if kiosk then
		for _, child in ipairs(kiosk:GetDescendants()) do
			if child:IsA("BasePart") and child:GetAttribute("TrailId") then
				bindButton(child)
			end
		end
	end
end

return TrailSelector
