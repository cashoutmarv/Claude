-- Studio-only chat console for fast playtest traversal. Listens to
-- player.Chatted and dispatches a small set of slash commands. Not active in
-- live games — `RunService:IsStudio()` early-returns.
--
-- Replies are emitted via Chat:Chat() (chat bubble above the player's head)
-- AND `print` to the server output, so a tester running Test → Local Server
-- can see what happened either way without standing up a custom UI panel.

local RunService = game:GetService("RunService")
if not RunService:IsStudio() then
	return
end

local Players = game:GetService("Players")
local ServerScriptService = game:GetService("ServerScriptService")
local Workspace = game:GetService("Workspace")
local Chat = game:GetService("Chat")

-- Dependencies are sourced from the running services. We require the same
-- modules the boot script does — these are singletons in Roblox so we get
-- the live, :Init()'d instances.
local Server = ServerScriptService:WaitForChild("Server")
local Services = Server:WaitForChild("Services")

local CurrencyService = require(Services.CurrencyService)
local CheckpointService = require(Services.CheckpointService)
local DataService = require(Services.DataService)
local Diagnostics = require(Server:WaitForChild("Diagnostics"))

local CURRENCY_GIVE_CAP = 100000
local WORLD_OFFSET_X = 2000 -- StageRegistry uses (worldId-1)*2000 on X.

-- ─── Reply helpers ────────────────────────────────────────────────────────

local function reply(player: Player, msg: string)
	print(string.format("[ETM Chat → %s] %s", player.Name, msg))
	local char = player.Character
	local head = char and char:FindFirstChild("Head")
	if head then
		pcall(function()
			Chat:Chat(head, msg, Enum.ChatColor.Blue)
		end)
	end
end

-- ─── Command implementations ──────────────────────────────────────────────

local function cmdDiagnose(player: Player)
	local report = Diagnostics:Check()
	reply(player, string.format("Diagnostics: %d/%d OK", report.okCount, report.total))
	for _, r in ipairs(report.results) do
		if not r.ok then
			reply(player, "  FAIL: " .. r.label .. " — " .. tostring(r.detail or ""))
		end
	end
end

local function cmdWhere(player: Player)
	local char = player.Character
	local hrp = char and char:FindFirstChild("HumanoidRootPart")
	if not hrp or not hrp:IsA("BasePart") then
		reply(player, "Where: no character found.")
		return
	end
	-- Each world's local origin is at (w-1)*2000 on X, with stages running
	-- forward on -Z. Map X back to world id.
	local x = hrp.Position.X
	local world = math.clamp(math.floor((x + WORLD_OFFSET_X / 2) / WORLD_OFFSET_X) + 1, 1, 10)
	-- Best-effort stage = nearest StartAnchor in that world by Z.
	local worldFolder = Workspace:FindFirstChild("Worlds") and Workspace.Worlds:FindFirstChild("W" .. world)
	local stage = "?"
	if worldFolder then
		local bestStage, bestDist = nil, math.huge
		for s = 1, 20 do
			local sFolder = worldFolder:FindFirstChild("S" .. s)
			local anchor = sFolder and sFolder:FindFirstChild("StartAnchor")
			if anchor and anchor:IsA("BasePart") then
				local d = (anchor.Position - hrp.Position).Magnitude
				if d < bestDist then
					bestDist = d
					bestStage = s
				end
			end
		end
		if bestStage then
			stage = tostring(bestStage)
		end
	end
	reply(player, string.format("Where: world %d, stage ~%s (X=%.1f Z=%.1f)", world, stage, hrp.Position.X, hrp.Position.Z))
end

local function cmdGive(player: Player, args: { string })
	local amount = tonumber(args[1])
	if not amount then
		reply(player, "Usage: /give <amount>  (soft currency, capped at 100k)")
		return
	end
	amount = math.floor(math.clamp(amount, 1, CURRENCY_GIVE_CAP))
	CurrencyService:Add(player, "soft", amount)
	reply(player, string.format("Granted %d soft currency.", amount))
end

local function teleportTo(player: Player, world: number, stage: number): (boolean, string)
	local worlds = Workspace:FindFirstChild("Worlds")
	local wFolder = worlds and worlds:FindFirstChild("W" .. world)
	local sFolder = wFolder and wFolder:FindFirstChild("S" .. stage)
	local anchor = sFolder and sFolder:FindFirstChild("StartAnchor")
	if not (anchor and anchor:IsA("BasePart")) then
		return false, string.format("No StartAnchor found at W%d.S%d", world, stage)
	end
	local char = player.Character
	local hrp = char and char:FindFirstChild("HumanoidRootPart")
	if not (hrp and hrp:IsA("BasePart")) then
		return false, "No HumanoidRootPart on character"
	end
	hrp.CFrame = anchor.CFrame + Vector3.new(0, 4, 0)
	return true, string.format("Teleported to W%d.S%d.", world, stage)
end

local function cmdTeleport(player: Player, args: { string })
	local w = tonumber(args[1])
	local s = tonumber(args[2])
	if not w or not s or w < 1 or w > 10 or s < 1 or s > 20 or w ~= math.floor(w) or s ~= math.floor(s) then
		reply(player, "Usage: /teleport <world 1..10> <stage 1..20>")
		return
	end
	local ok, msg = teleportTo(player, w, s)
	reply(player, msg)
	if not ok then
		return
	end
end

local function cmdSetWorld(player: Player, args: { string })
	local n = tonumber(args[1])
	if not n or n < 1 or n > 10 or n ~= math.floor(n) then
		reply(player, "Usage: /setworld <1..10>")
		return
	end
	local ok, msg = teleportTo(player, n, 1)
	reply(player, msg)
end

local function cmdSkipOnce(player: Player)
	local profile = DataService:Get(player)
	if not profile then
		reply(player, "skiponce: no profile loaded yet.")
		return
	end
	local cur = profile.highestStage or 0
	local newGlobal = math.clamp(cur + 1, 1, 200)
	DataService:Update(player, function(p)
		p.highestStage = math.max(p.highestStage or 0, newGlobal)
	end)
	local world = math.floor((newGlobal - 1) / 20) + 1
	local stage = ((newGlobal - 1) % 20) + 1
	CheckpointService:Set(player, world, stage)
	reply(player, string.format("skiponce: highestStage = %d (W%d.S%d).", newGlobal, world, stage))
end

-- ─── Dispatch ─────────────────────────────────────────────────────────────

local DISPATCH: { [string]: (Player, { string }) -> () } = {
	["/diagnose"] = function(p, _)
		cmdDiagnose(p)
	end,
	["/where"] = function(p, _)
		cmdWhere(p)
	end,
	["/give"] = cmdGive,
	["/teleport"] = cmdTeleport,
	["/setworld"] = cmdSetWorld,
	["/skiponce"] = function(p, _)
		cmdSkipOnce(p)
	end,
}

local function onChatted(player: Player, message: string)
	if not message or message:sub(1, 1) ~= "/" then
		return
	end
	-- Split on whitespace.
	local parts: { string } = {}
	for token in message:gmatch("%S+") do
		table.insert(parts, token)
	end
	if #parts == 0 then
		return
	end
	local cmd = parts[1]:lower()
	local handler = DISPATCH[cmd]
	if not handler then
		return
	end
	local args = {}
	for i = 2, #parts do
		table.insert(args, parts[i])
	end
	local ok, err = pcall(handler, player, args)
	if not ok then
		warn(string.format("[ETM ChatCommands] %s failed: %s", cmd, tostring(err)))
		reply(player, string.format("Command %s errored: %s", cmd, tostring(err)))
	end
end

local function bind(player: Player)
	player.Chatted:Connect(function(message)
		onChatted(player, message)
	end)
end

for _, p in ipairs(Players:GetPlayers()) do
	bind(p)
end
Players.PlayerAdded:Connect(bind)

print("[ETM ChatCommands] ready (Studio only). Commands: /diagnose /where /give /teleport /setworld /skiponce")
