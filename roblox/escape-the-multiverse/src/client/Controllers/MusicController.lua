-- Switches ambient music when the player crosses world boundaries.

local Players = game:GetService("Players")
local SoundService = game:GetService("SoundService")
local RunService = game:GetService("RunService")
local Shared = require(game:GetService("ReplicatedStorage").Shared)
local Worlds = Shared.Config.Worlds

local Music = {}

local current = 0
local sound: Sound?

local function ensureSound(): Sound
	if sound then
		return sound
	end
	sound = Instance.new("Sound")
	sound.Name = "ETM_Music"
	sound.Volume = 0.4
	sound.Looped = true
	sound.Parent = SoundService
	return sound
end

local function applyWorld(worldId: number)
	if worldId == current then
		return
	end
	current = worldId
	local def = Worlds[worldId]
	if not def then
		return
	end
	local s = ensureSound()
	s:Stop()
	s.SoundId = def.music or ""
	if s.SoundId ~= "" then
		s:Play()
	end
	-- Set Lighting fog/ambient too.
	local Lighting = game:GetService("Lighting")
	Lighting.Ambient = def.ambient
	Lighting.FogColor = def.fogColor
	Lighting.FogEnd = def.fogEnd
end

function Music:Init(_state) end

function Music:Start()
	-- Crude detection: classify by player position X (each world is offset 2000 studs apart).
	local plr = Players.LocalPlayer
	RunService.Heartbeat:Connect(function()
		local char = plr.Character
		if not char then
			return
		end
		local hrp = char:FindFirstChild("HumanoidRootPart")
		if not (hrp and hrp:IsA("BasePart")) then
			return
		end
		local x = hrp.Position.X
		local idx = math.clamp(math.floor(x / 2000) + 1, 1, 10)
		applyWorld(idx)
	end)
end

return Music
