-- Common stage primitives used by every WorldBuilder. Builds a Folder for a
-- stage with: StartAnchor, EndAnchor, EndPart (tagged "StageReached"), a row
-- of platforms with kill bricks, and an optional skip door.

local CollectionService = game:GetService("CollectionService")

local Shared = require(game:GetService("ReplicatedStorage").Shared)
local RNG = Shared.Modules.RNG

local BaseBuilder = {}

local function part(name: string, parent: Instance): Part
	local p = Instance.new("Part")
	p.Name = name
	p.Anchored = true
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	p.Parent = parent
	return p
end

function BaseBuilder.makeStartAnchor(parent: Instance, cf: CFrame): BasePart
	local p = part("StartAnchor", parent)
	p.Size = Vector3.new(8, 1, 8)
	p.Material = Enum.Material.SmoothPlastic
	p.Color = Color3.fromRGB(120, 200, 120)
	p.CFrame = cf
	return p
end

function BaseBuilder.makeEndAnchor(parent: Instance, cf: CFrame, world: number, stage: number): BasePart
	local p = part("EndAnchor", parent)
	p.Size = Vector3.new(8, 1, 8)
	p.Material = Enum.Material.Neon
	p.Color = Color3.fromRGB(255, 220, 0)
	p.CFrame = cf
	p:SetAttribute("World", world)
	p:SetAttribute("Stage", stage)
	-- Clones an EndPart sensor sitting just above for the StageReached touch.
	local sensor = part("EndPart", parent)
	sensor.Size = Vector3.new(8, 4, 8)
	sensor.Transparency = 1
	sensor.CanCollide = false
	sensor.CFrame = cf + Vector3.new(0, 2.5, 0)
	sensor:SetAttribute("World", world)
	sensor:SetAttribute("Stage", stage)
	CollectionService:AddTag(sensor, "StageReached")
	return p
end

function BaseBuilder.makePlatform(parent: Instance, cf: CFrame, size: Vector3, color: Color3?): BasePart
	local p = part("Platform", parent)
	p.Size = size
	p.Material = Enum.Material.SmoothPlastic
	p.Color = color or Color3.fromRGB(160, 160, 170)
	p.CFrame = cf
	return p
end

function BaseBuilder.makeKillBrick(parent: Instance, cf: CFrame, size: Vector3): BasePart
	local p = part("KillBrick", parent)
	p.Size = size
	p.Material = Enum.Material.Neon
	p.Color = Color3.fromRGB(220, 30, 30)
	p.CFrame = cf
	p.Touched:Connect(function(hit)
		local hum = hit.Parent and hit.Parent:FindFirstChildOfClass("Humanoid")
		if hum then
			hum.Health = 0
		end
	end)
	return p
end

function BaseBuilder.makeSkipDoor(parent: Instance, cf: CFrame, world: number)
	local door = part("SkipDoor", parent)
	door.Size = Vector3.new(6, 8, 1)
	door.Material = Enum.Material.Neon
	door.Color = Color3.fromRGB(255, 200, 0)
	door.Transparency = 0.3
	door.CanCollide = false
	door.CFrame = cf

	local label = Instance.new("BillboardGui")
	label.Size = UDim2.fromOffset(120, 40)
	label.StudsOffset = Vector3.new(0, 5, 0)
	label.AlwaysOnTop = true
	label.Parent = door
	local txt = Instance.new("TextLabel")
	txt.BackgroundTransparency = 1
	txt.Size = UDim2.fromScale(1, 1)
	txt.Text = "SKIP →"
	txt.Font = Enum.Font.GothamBold
	txt.TextScaled = true
	txt.TextColor3 = Color3.fromRGB(20, 10, 0)
	txt.Parent = label

	door:SetAttribute("World", world)
	CollectionService:AddTag(door, "SkipDoor")
	return door
end

-- Try to load and clone a hand-crafted milestone stage. Returns true if used.
function BaseBuilder.tryHandcrafted(stageFolder: Instance, originCF: CFrame, row: any): boolean
	if not row.handcrafted or not row.asset then
		return false
	end
	local Workspace = game:GetService("Workspace")
	local milestones = Workspace:FindFirstChild("MilestoneStages")
	local asset = milestones and milestones:FindFirstChild(row.asset)
	if not asset then
		return false
	end
	local clone = asset:Clone()
	if clone:IsA("Model") then
		clone:PivotTo(originCF)
	end
	clone.Parent = stageFolder
	return true
end

-- Lays a straight row of `len` platforms forward (-Z). Returns a table of CFrames
-- for caller customization (e.g. swap some to gimmicks).
function BaseBuilder.layRow(stageFolder: Instance, originCF: CFrame, params: any, color: Color3?): { CFrame }
	local rng = RNG.new(params.seed)
	local platforms: { CFrame } = {}
	local cf = originCF
	for i = 1, params.length do
		local jitter = rng:Range(-params.jumpJitter, params.jumpJitter)
		local jump = params.jumpAvg + jitter
		cf = cf * CFrame.new(0, 0, -jump - params.width / 2)
		BaseBuilder.makePlatform(stageFolder, cf, Vector3.new(params.width, 1, params.width), color)
		table.insert(platforms, cf)
	end
	-- Sprinkle kill bricks beside random platforms.
	for i = 1, params.killBricks do
		local idx = rng:Int(2, math.max(2, #platforms - 1))
		local at = platforms[idx]
		local side = rng:Pick({ -1, 1 })
		local kbCF = at * CFrame.new(side * (params.width / 2 + 1.5), 0, 0)
		BaseBuilder.makeKillBrick(stageFolder, kbCF, Vector3.new(2, 1, params.width))
	end
	return platforms
end

-- Iterates over the platforms placed in a stage folder.
function BaseBuilder.eachPlatform(stageFolder: Instance, fn: (BasePart, number) -> ())
	local idx = 0
	for _, c in ipairs(stageFolder:GetChildren()) do
		if c.Name == "Platform" and c:IsA("BasePart") then
			idx += 1
			fn(c, idx)
		end
	end
end

-- Common stage finalization: end anchor + skip door if marked.
function BaseBuilder.finalize(stageFolder: Instance, cfs: { CFrame }, row: any)
	if #cfs == 0 then
		return
	end
	local endCF = cfs[#cfs] * CFrame.new(0, 0, -row.params.jumpAvg - row.params.width / 2)
	BaseBuilder.makeEndAnchor(stageFolder, endCF, row.world, row.stage)
	if row.params.skipGate then
		BaseBuilder.makeSkipDoor(stageFolder, cfs[#cfs] * CFrame.new(row.params.width / 2 + 4, 0, 0), row.world)
	end
end

-- Standard build: handcrafted try → start anchor → row → eachPlatform decorator → finalize.
function BaseBuilder.standardBuild(stageFolder: Instance, originCF: CFrame, row: any, color: Color3?, decorate: (BasePart, number, any) -> ())
	if BaseBuilder.tryHandcrafted(stageFolder, originCF, row) then
		return
	end
	BaseBuilder.makeStartAnchor(stageFolder, originCF)
	local cfs = BaseBuilder.layRow(stageFolder, originCF, row.params, color)
	if decorate then
		BaseBuilder.eachPlatform(stageFolder, function(plat, i)
			decorate(plat, i, cfs[i])
		end)
	end
	BaseBuilder.finalize(stageFolder, cfs, row)
end

return BaseBuilder
