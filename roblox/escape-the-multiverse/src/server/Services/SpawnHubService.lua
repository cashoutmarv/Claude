-- Builds the social-hub spawn island procedurally on server boot:
--   SpawnLocation, Leaderboard sign, Hall of Fame avatar wall, Trail kiosk,
--   Shop kiosk, Race portal. All kept in Workspace under standard names so
--   client controllers can find them without Rojo .rbxmx files.

local Workspace = game:GetService("Workspace")
local CollectionService = game:GetService("CollectionService")

local Shared = require(game:GetService("ReplicatedStorage").Shared)
local Cosmetics = Shared.Config.Cosmetics

local SpawnHub = {}
SpawnHub._deps = nil :: any

local function makePart(name: string, parent: Instance, props: { [string]: any }): BasePart
	local p = Instance.new("Part")
	p.Name = name
	p.Anchored = true
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	for k, v in pairs(props or {}) do
		(p :: any)[k] = v
	end
	p.Parent = parent
	return p
end

local function buildSpawn(parent: Folder)
	local pad = Instance.new("SpawnLocation")
	pad.Name = "MainSpawn"
	pad.Anchored = true
	pad.Size = Vector3.new(20, 1, 20)
	pad.Material = Enum.Material.Neon
	pad.Color = Color3.fromRGB(80, 220, 255)
	pad.Position = Vector3.new(0, 5, 60)
	pad.Parent = parent
	-- Floor
	makePart("Floor", parent, {
		Size = Vector3.new(120, 1, 120),
		Material = Enum.Material.SmoothPlastic,
		Color = Color3.fromRGB(40, 40, 60),
		Position = Vector3.new(0, 4.5, 60),
	})
end

local function buildLeaderboardSign(parent: Folder)
	local sign = makePart("LeaderboardSign", parent, {
		Size = Vector3.new(24, 14, 1),
		Material = Enum.Material.SmoothPlastic,
		Color = Color3.fromRGB(20, 20, 30),
		Position = Vector3.new(-30, 12, 80),
	})
	local sg = Instance.new("SurfaceGui")
	sg.Face = Enum.NormalId.Front
	sg.AlwaysOnTop = true
	sg.PixelsPerStud = 50
	sg.Parent = sign
	local title = Instance.new("TextLabel")
	title.BackgroundTransparency = 1
	title.Size = UDim2.new(1, 0, 0, 60)
	title.Font = Enum.Font.GothamBlack
	title.TextSize = 36
	title.TextColor3 = Color3.fromRGB(255, 255, 255)
	title.Text = "🏆 TOP MULTIVERSE ESCAPERS 🏆"
	title.Parent = sg
	local list = Instance.new("Frame")
	list.Name = "List"
	list.BackgroundTransparency = 1
	list.Position = UDim2.new(0, 16, 0, 64)
	list.Size = UDim2.new(1, -32, 1, -64)
	list.Parent = sg
end

local function buildHallOfFame(parent: Folder)
	local hof = Instance.new("Folder")
	hof.Name = "HallOfFame"
	hof.Parent = Workspace
	local wall = makePart("Wall", hof, {
		Size = Vector3.new(40, 14, 1),
		Material = Enum.Material.SmoothPlastic,
		Color = Color3.fromRGB(60, 40, 20),
		Position = Vector3.new(30, 12, 80),
	})
	local sg = Instance.new("SurfaceGui")
	sg.Face = Enum.NormalId.Front
	sg.PixelsPerStud = 50
	sg.Parent = wall
	for i = 1, 10 do
		local slot = Instance.new("Frame")
		slot.Name = "Slot" .. i
		slot.BackgroundTransparency = 1
		slot.Size = UDim2.new(0.1, -2, 0.6, 0)
		slot.Position = UDim2.new(0.1 * (i - 1), 1, 0.2, 0)
		slot.Parent = sg
	end
end

local function buildTrailKiosk(parent: Folder)
	local kiosk = Instance.new("Folder")
	kiosk.Name = "TrailKiosk"
	kiosk.Parent = Workspace
	local base = makePart("Base", kiosk, {
		Size = Vector3.new(16, 1, 4),
		Material = Enum.Material.Marble,
		Color = Color3.fromRGB(180, 180, 200),
		Position = Vector3.new(0, 5.5, 40),
	})
	for i, trailId in ipairs(Cosmetics.SPAWN_KIOSK_TRAILS) do
		local btn = makePart("TrailButton_" .. trailId, kiosk, {
			Size = Vector3.new(3, 4, 3),
			Material = Enum.Material.Neon,
			Color = ({
				Color3.fromRGB(255, 80, 0),
				Color3.fromRGB(180, 220, 255),
				Color3.fromRGB(180, 80, 220),
				Color3.fromRGB(0, 255, 200),
			})[i] or Color3.new(1, 1, 1),
			Position = Vector3.new(-6 + (i - 1) * 4, 8, 40),
		})
		btn:SetAttribute("TrailId", trailId)
		CollectionService:AddTag(btn, "TrailButton")
		local bb = Instance.new("BillboardGui")
		bb.Size = UDim2.fromOffset(120, 30)
		bb.StudsOffset = Vector3.new(0, 3, 0)
		bb.AlwaysOnTop = true
		bb.Parent = btn
		local txt = Instance.new("TextLabel")
		txt.BackgroundTransparency = 1
		txt.Size = UDim2.fromScale(1, 1)
		txt.Font = Enum.Font.GothamBold
		txt.TextSize = 16
		txt.TextColor3 = Color3.new(1, 1, 1)
		txt.TextStrokeTransparency = 0.4
		txt.Text = ({ "Fire", "Ice", "Rainbow", "Glitch" })[i] or trailId
		txt.Parent = bb
	end
end

local function buildRacePortal(parent: Folder)
	local portal = makePart("RacePortal", parent, {
		Size = Vector3.new(8, 12, 1),
		Material = Enum.Material.Neon,
		Color = Color3.fromRGB(100, 220, 100),
		Transparency = 0.3,
		Position = Vector3.new(20, 11, 70),
		CanCollide = false,
	})
	CollectionService:AddTag(portal, "RacePortal")
end

function SpawnHub:Init(deps: any)
	self._deps = deps
end

function SpawnHub:Start()
	local spawnFolder = Workspace:FindFirstChild("Spawn")
	if not spawnFolder then
		spawnFolder = Instance.new("Folder")
		spawnFolder.Name = "Spawn"
		spawnFolder.Parent = Workspace
	end
	buildSpawn(spawnFolder)
	buildLeaderboardSign(spawnFolder)
	buildHallOfFame(spawnFolder)
	buildTrailKiosk(spawnFolder)
	buildRacePortal(spawnFolder)
end

return SpawnHub
