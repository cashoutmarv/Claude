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

-- ─── Layout helpers (additive — used by per-world builders for distinctive
-- structural shapes). All return { CFrame } so finalize() can drop the
-- EndAnchor at the last platform of the path.

-- Vertical drop column: each platform sits below the previous one with a
-- small forward step. Used by Moon for "drop between low-grav zones".
function BaseBuilder.layColumn(stageFolder: Instance, originCF: CFrame, params: any, color: Color3?): { CFrame }
	local rng = RNG.new((params.seed or 0) + 7777)
	local platforms: { CFrame } = {}
	local cf = originCF
	local drop = math.max(6, params.jumpAvg * 0.75)
	for _ = 1, params.length do
		local jitter = rng:Range(-params.jumpJitter, params.jumpJitter)
		cf = cf * CFrame.new(0, -drop, -(params.width + 2) - jitter * 0.3)
		BaseBuilder.makePlatform(stageFolder, cf, Vector3.new(params.width, 1, params.width), color)
		table.insert(platforms, cf)
	end
	for i = 1, params.killBricks do
		local idx = rng:Int(2, math.max(2, #platforms - 1))
		local at = platforms[idx]
		local side = rng:Pick({ -1, 1 })
		BaseBuilder.makeKillBrick(stageFolder, at * CFrame.new(side * (params.width / 2 + 1.5), 0, 0), Vector3.new(2, 1, params.width))
	end
	return platforms
end

-- Zig-zag forward path: alternates left/right by `amplitude` while marching -Z.
-- Used by Cyber and Void for serpentine layouts.
function BaseBuilder.layZigZag(stageFolder: Instance, originCF: CFrame, params: any, color: Color3?, amplitude: number?): { CFrame }
	amplitude = amplitude or (params.width * 1.4)
	local rng = RNG.new((params.seed or 0) + 9999)
	local platforms: { CFrame } = {}
	local cf = originCF
	for i = 1, params.length do
		local jitter = rng:Range(-params.jumpJitter, params.jumpJitter)
		local jump = params.jumpAvg + jitter
		local sideOffset = ((i % 2 == 0) and amplitude) or -amplitude
		cf = cf * CFrame.new(0, 0, -jump - params.width / 2)
		local placed = cf * CFrame.new(sideOffset, 0, 0)
		BaseBuilder.makePlatform(stageFolder, placed, Vector3.new(params.width, 1, params.width), color)
		table.insert(platforms, placed)
	end
	for i = 1, params.killBricks do
		local idx = rng:Int(2, math.max(2, #platforms - 1))
		local at = platforms[idx]
		local side = rng:Pick({ -1, 1 })
		BaseBuilder.makeKillBrick(stageFolder, at * CFrame.new(side * (params.width / 2 + 1.5), 0, 0), Vector3.new(2, 1, params.width))
	end
	return platforms
end

-- Branching path: splits into two parallel rows that rejoin at the end. Used
-- by Backrooms for forced-choice "dead-end vs path" stages. Returns the
-- canonical (left) branch CFrames for finalize.
function BaseBuilder.layBranching(stageFolder: Instance, originCF: CFrame, params: any, color: Color3?): { CFrame }
	local rng = RNG.new((params.seed or 0) + 3131)
	local fork = math.max(3, math.floor(params.length / 3))
	local rejoin = params.length - fork
	local cf = originCF
	-- Pre-fork: shared spine.
	local spine: { CFrame } = {}
	for _ = 1, fork do
		local jitter = rng:Range(-params.jumpJitter, params.jumpJitter)
		cf = cf * CFrame.new(0, 0, -(params.jumpAvg + jitter) - params.width / 2)
		BaseBuilder.makePlatform(stageFolder, cf, Vector3.new(params.width, 1, params.width), color)
		table.insert(spine, cf)
	end
	-- Branch: left (real) + right (dead-end). Both run in parallel.
	local leftStart = cf
	local rightStart = cf
	local left: { CFrame } = {}
	local right: { CFrame } = {}
	local sep = params.width * 1.6
	for i = 1, math.max(2, math.floor(rejoin / 2)) do
		local jitter = rng:Range(-params.jumpJitter, params.jumpJitter)
		local jump = params.jumpAvg + jitter
		leftStart = leftStart * CFrame.new(-sep * (if i == 1 then 1 else 0), 0, -jump - params.width / 2)
		rightStart = rightStart * CFrame.new(sep * (if i == 1 then 1 else 0), 0, -jump - params.width / 2)
		BaseBuilder.makePlatform(stageFolder, leftStart, Vector3.new(params.width, 1, params.width), color)
		BaseBuilder.makePlatform(stageFolder, rightStart, Vector3.new(params.width, 1, params.width), color)
		table.insert(left, leftStart)
		table.insert(right, rightStart)
	end
	-- The right branch terminates in a kill brick → genuine dead-end.
	if #right > 0 then
		local tail = right[#right]
		BaseBuilder.makeKillBrick(stageFolder, tail * CFrame.new(0, 0, -params.jumpAvg), Vector3.new(params.width, 1, params.width))
	end
	-- Rejoin from the left branch to the spine continuation.
	cf = left[#left] or cf
	for _ = #left + 1, rejoin do
		local jitter = rng:Range(-params.jumpJitter, params.jumpJitter)
		cf = cf * CFrame.new(sep * 0.5, 0, -(params.jumpAvg + jitter) - params.width / 2)
		BaseBuilder.makePlatform(stageFolder, cf, Vector3.new(params.width, 1, params.width), color)
		table.insert(left, cf)
	end
	-- Combined "main path" = spine + left branch.
	local out: { CFrame } = {}
	for _, c in ipairs(spine) do
		table.insert(out, c)
	end
	for _, c in ipairs(left) do
		table.insert(out, c)
	end
	for i = 1, params.killBricks do
		local idx = rng:Int(2, math.max(2, #out - 1))
		local at = out[idx]
		local side = rng:Pick({ -1, 1 })
		BaseBuilder.makeKillBrick(stageFolder, at * CFrame.new(side * (params.width / 2 + 1.5), 0, 0), Vector3.new(2, 1, params.width))
	end
	return out
end

-- Small grid maze: N rows × M cols, with corridors carved from the (1,1)
-- cell to (N, M). The path is the returned CFrame list. Backrooms uses this.
function BaseBuilder.layMaze(stageFolder: Instance, originCF: CFrame, params: any, color: Color3?): { CFrame }
	local rng = RNG.new((params.seed or 0) + 4242)
	local cell = math.max(params.width + 2, 8)
	-- Modest size so we don't blow up stage budgets.
	local cols = math.max(3, math.min(5, math.floor(params.length / 3)))
	local rows = math.max(3, math.min(6, math.floor(params.length / 2)))
	local chosen: { { number } } = {}
	-- Greedy random walk from (1,1) to (rows,cols), monotone along forward axis.
	local r, c = 1, 1
	table.insert(chosen, { r, c })
	while r < rows or c < cols do
		local options = {}
		if r < rows then table.insert(options, { 1, 0 }) end
		if c < cols then table.insert(options, { 0, 1 }) end
		if c > 1 and rng:Float() < 0.15 then table.insert(options, { 0, -1 }) end
		local step = options[rng:Int(1, #options)]
		r += step[1]
		c += step[2]
		table.insert(chosen, { r, c })
	end
	-- Walls (decorative) along outer perimeter so a player feels enclosed.
	local platforms: { CFrame } = {}
	for _, cell2 in ipairs(chosen) do
		local cf = originCF * CFrame.new((cell2[2] - 1) * cell, 0, -(cell2[1] - 1) * cell)
		BaseBuilder.makePlatform(stageFolder, cf, Vector3.new(params.width, 1, params.width), color)
		table.insert(platforms, cf)
	end
	-- Add a couple of dead-end stubs.
	for i = 1, math.min(3, math.floor(rng:Range(1, 3))) do
		local idx = rng:Int(2, math.max(2, #platforms - 1))
		local stub = platforms[idx] * CFrame.new(rng:Pick({ -cell, cell }), 0, 0)
		local p = BaseBuilder.makePlatform(stageFolder, stub, Vector3.new(params.width, 1, params.width), color)
		p.Name = "DeadEndPlatform"
	end
	for i = 1, params.killBricks do
		local idx = rng:Int(2, math.max(2, #platforms - 1))
		local at = platforms[idx]
		local side = rng:Pick({ -1, 1 })
		BaseBuilder.makeKillBrick(stageFolder, at * CFrame.new(side * (params.width / 2 + 1.5), 0, 0), Vector3.new(2, 1, params.width))
	end
	return platforms
end

-- Decorative pillar (non-collidable scenery). Rectangular by default; pass
-- shape="Cylinder" for round candy/lollipop pillars.
function BaseBuilder.makeDecorPillar(parent: Instance, cf: CFrame, height: number, color: Color3?, material: Enum.Material?, shape: string?): BasePart
	local p = part("DecorPillar", parent)
	p.Size = Vector3.new(2, height, 2)
	p.Material = material or Enum.Material.SmoothPlastic
	p.Color = color or Color3.fromRGB(180, 180, 180)
	p.CanCollide = false
	p.CFrame = cf * CFrame.new(0, height / 2, 0)
	if shape == "Cylinder" then
		p.Shape = Enum.PartType.Cylinder
		-- Cylinder length on X by default; orient pillar vertically.
		p.CFrame = cf * CFrame.new(0, height / 2, 0) * CFrame.Angles(0, 0, math.rad(90))
		p.Size = Vector3.new(height, 2, 2)
	elseif shape == "Ball" then
		p.Shape = Enum.PartType.Ball
		p.Size = Vector3.new(height, height, height)
		p.CFrame = cf * CFrame.new(0, height / 2, 0)
	end
	return p
end

-- Decorative arch spanning `span` studs across the path. Two legs + a top beam.
function BaseBuilder.makeArch(parent: Instance, cf: CFrame, span: number, color: Color3?): Folder
	local archFolder = Instance.new("Folder")
	archFolder.Name = "Arch"
	archFolder.Parent = parent
	local height = math.max(8, span * 0.8)
	local legL = part("ArchLeg", archFolder)
	legL.Size = Vector3.new(1.4, height, 1.4)
	legL.Material = Enum.Material.SmoothPlastic
	legL.Color = color or Color3.fromRGB(160, 130, 90)
	legL.CanCollide = false
	legL.CFrame = cf * CFrame.new(-span / 2, height / 2, 0)
	local legR = part("ArchLeg", archFolder)
	legR.Size = Vector3.new(1.4, height, 1.4)
	legR.Material = Enum.Material.SmoothPlastic
	legR.Color = color or Color3.fromRGB(160, 130, 90)
	legR.CanCollide = false
	legR.CFrame = cf * CFrame.new(span / 2, height / 2, 0)
	local top = part("ArchTop", archFolder)
	top.Size = Vector3.new(span + 1.4, 1.2, 1.4)
	top.Material = Enum.Material.SmoothPlastic
	top.Color = color or Color3.fromRGB(160, 130, 90)
	top.CanCollide = false
	top.CFrame = cf * CFrame.new(0, height + 0.6, 0)
	return archFolder
end

-- Decorative wall panel (non-collidable). Used by Backrooms / Temple corridor walls.
function BaseBuilder.makeDecorWall(parent: Instance, cf: CFrame, length: number, height: number, color: Color3?, material: Enum.Material?): BasePart
	local p = part("DecorWall", parent)
	p.Size = Vector3.new(0.5, height, length)
	p.Material = material or Enum.Material.Plastic
	p.Color = color or Color3.fromRGB(200, 180, 100)
	p.CanCollide = false
	p.CFrame = cf
	return p
end

return BaseBuilder
