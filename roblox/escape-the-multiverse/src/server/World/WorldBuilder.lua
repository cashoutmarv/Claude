-- Server entry that wires builders into the registry, then loads all 200 stages.
-- Called once from src/server/init.server.lua.

local Registry = require(script.Parent.StageRegistry)

local function loadBuilders()
	local Builders = script.Parent.Builders
	for _, child in ipairs(Builders:GetChildren()) do
		if child:IsA("ModuleScript") and child.Name ~= "BaseBuilder" then
			local ok, builder = pcall(require, child)
			if ok and builder then
				Registry:Register(child.Name, builder)
			else
				warn("[WorldBuilder] Failed to load " .. child.Name .. ": " .. tostring(builder))
			end
		end
	end
end

local WorldBuilder = {}
WorldBuilder._deps = nil :: any

function WorldBuilder:Init(deps: any)
	self._deps = deps
	Registry:SetDeps(deps)
	loadBuilders()
end

function WorldBuilder:Start()
	Registry:LoadAll()
end

return WorldBuilder
