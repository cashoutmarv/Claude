-- Trail equip + persistence. Glitch trail color-cycles on a server task that
-- mutates the Trail.Color ColorSequence every 0.15s.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = require(ReplicatedStorage.Shared)
local Net = Shared.Net
local Cosmetics = Shared.Config.Cosmetics
local Validate = Shared.Modules.Validate

local TrailService = {}
TrailService._deps = nil :: any

local activeTrails: { [Player]: Trail } = {}
local glitchTickers: { [Player]: thread } = {}

function TrailService:Init(deps: any)
	self._deps = deps
end

local function buildTrail(def): Trail
	local trail = Instance.new("Trail")
	trail.Lifetime = 0.6
	trail.MinLength = 0.05
	if def.isRainbow then
		trail.Color = ColorSequence.new({
			ColorSequenceKeypoint.new(0, Color3.fromRGB(255, 0, 0)),
			ColorSequenceKeypoint.new(0.16, Color3.fromRGB(255, 200, 0)),
			ColorSequenceKeypoint.new(0.33, Color3.fromRGB(0, 255, 0)),
			ColorSequenceKeypoint.new(0.5, Color3.fromRGB(0, 200, 255)),
			ColorSequenceKeypoint.new(0.66, Color3.fromRGB(0, 0, 255)),
			ColorSequenceKeypoint.new(0.83, Color3.fromRGB(180, 0, 255)),
			ColorSequenceKeypoint.new(1, Color3.fromRGB(255, 0, 200)),
		})
	elseif def.isGlitch then
		trail.Color = ColorSequence.new(Color3.fromRGB(255, 0, 200), Color3.fromRGB(0, 255, 200))
	else
		trail.Color = ColorSequence.new(def.colorA or Color3.new(1, 1, 1), def.colorB or Color3.new(1, 1, 1))
	end
	return trail
end

local function ensureAttachments(char: Model): (Attachment, Attachment)?
	local hrp = char:FindFirstChild("HumanoidRootPart")
	if not (hrp and hrp:IsA("BasePart")) then
		return nil
	end
	local a0 = hrp:FindFirstChild("ETM_TrailA0") :: Attachment?
	local a1 = hrp:FindFirstChild("ETM_TrailA1") :: Attachment?
	if not a0 then
		a0 = Instance.new("Attachment")
		a0.Name = "ETM_TrailA0"
		a0.Position = Vector3.new(-0.5, -2, 0)
		a0.Parent = hrp
	end
	if not a1 then
		a1 = Instance.new("Attachment")
		a1.Name = "ETM_TrailA1"
		a1.Position = Vector3.new(0.5, -2, 0)
		a1.Parent = hrp
	end
	return a0, a1
end

local function applyTrail(self, player: Player, trailId: string)
	-- Tear down any prior trail.
	if activeTrails[player] then
		activeTrails[player]:Destroy()
		activeTrails[player] = nil
	end
	if glitchTickers[player] then
		task.cancel(glitchTickers[player])
		glitchTickers[player] = nil
	end

	local def = Cosmetics.byId[trailId]
	if not def or def.kind ~= "Trail" then
		return
	end
	local char = player.Character
	if not char then
		return
	end
	local a0, a1 = ensureAttachments(char)
	if not (a0 and a1) then
		return
	end
	local trail = buildTrail(def)
	trail.Attachment0 = a0
	trail.Attachment1 = a1
	trail.Parent = a0.Parent
	activeTrails[player] = trail

	if def.isGlitch then
		glitchTickers[player] = task.spawn(function()
			while trail.Parent do
				local r = math.random(0, 255)
				local g = math.random(0, 255)
				local b = math.random(0, 255)
				trail.Color = ColorSequence.new(
					Color3.fromRGB(r, g, b),
					Color3.fromRGB(255 - r, 255 - g, 255 - b)
				)
				task.wait(0.15)
			end
		end)
	end
end

function TrailService:Start()
	local function onChar(player, profile)
		if not profile then
			return
		end
		local trailId = profile.equippedTrail
		if trailId then
			-- Wait briefly for HRP.
			task.wait(0.2)
			applyTrail(self, player, trailId)
		end
	end

	local function bindPlayer(player: Player)
		local profile = self._deps.DataService:Get(player)
		if player.Character then
			onChar(player, profile)
		end
		player.CharacterAdded:Connect(function()
			onChar(player, self._deps.DataService:Get(player))
		end)
	end

	for _, plr in ipairs(Players:GetPlayers()) do
		bindPlayer(plr)
	end
	Players.PlayerAdded:Connect(bindPlayer)
	Players.PlayerRemoving:Connect(function(plr)
		if glitchTickers[plr] then
			task.cancel(glitchTickers[plr])
			glitchTickers[plr] = nil
		end
		activeTrails[plr] = nil
	end)

	Net.event("SelectTrail").OnServerEvent:Connect(function(player, trailId)
		if not Validate.string(trailId, 64) then
			self._deps.AntiExploit:Flag(player, "SelectTrail bad arg", 1)
			return
		end
		if not Validate.rateOk(player, "SelectTrail", 0.5) then
			return
		end
		local profile = self._deps.DataService:Get(player)
		if not profile or not profile.ownedTrails[trailId] then
			-- Spawn-kiosk trails are free for everyone.
			local Catalog = Cosmetics
			local isFree = false
			for _, kid in ipairs(Catalog.SPAWN_KIOSK_TRAILS) do
				if kid == trailId then
					isFree = true
					break
				end
			end
			if isFree then
				self._deps.DataService:Update(player, function(p)
					p.ownedTrails[trailId] = true
				end)
			else
				return
			end
		end
		self._deps.DataService:Update(player, function(p)
			p.equippedTrail = trailId
		end)
		applyTrail(self, player, trailId)
	end)
end

return TrailService
