-- World 1 (Glitch) shakes the camera on landing. Listens to ScreenShake.

local Workspace = game:GetService("Workspace")
local RunService = game:GetService("RunService")
local Players = game:GetService("Players")
local Shared = require(game:GetService("ReplicatedStorage").Shared)
local Net = Shared.Net

local Shake = {}
local active = 0

local function startShake(strength: number, duration: number)
	active += 1
	local cam = Workspace.CurrentCamera
	local t0 = os.clock()
	local conn
	conn = RunService.RenderStepped:Connect(function()
		local t = os.clock() - t0
		if t >= duration or not cam then
			conn:Disconnect()
			active -= 1
			return
		end
		local fade = 1 - (t / duration)
		local x = (math.random() - 0.5) * 2 * strength * fade
		local y = (math.random() - 0.5) * 2 * strength * fade
		cam.CFrame = cam.CFrame * CFrame.new(x, y, 0)
	end)
end

local function bindCharacter(char: Model)
	local hum = char:WaitForChild("Humanoid", 5)
	if not hum then
		return
	end
	hum.StateChanged:Connect(function(_old, new)
		if new == Enum.HumanoidStateType.Landed then
			-- Shake only in World 1 zone (x in [-1000, 1000]).
			local hrp = char:FindFirstChild("HumanoidRootPart")
			if hrp and hrp:IsA("BasePart") then
				if math.abs(hrp.Position.X) < 1000 then
					startShake(0.4, 0.25)
				end
			end
		end
	end)
end

function Shake:Init(_state) end

function Shake:Start()
	local plr = Players.LocalPlayer
	if plr.Character then
		bindCharacter(plr.Character)
	end
	plr.CharacterAdded:Connect(bindCharacter)
	Net.event("ScreenShake").OnClientEvent:Connect(function(strength, duration)
		startShake(strength or 0.4, duration or 0.3)
	end)
end

return Shake
