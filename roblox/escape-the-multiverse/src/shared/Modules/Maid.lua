-- Minimal Maid. Holds tasks; :Destroy disposes them.

local Maid = {}
Maid.__index = Maid

function Maid.new()
	return setmetatable({ _tasks = {} :: { any } }, Maid)
end

function Maid:Add(t: any)
	table.insert(self._tasks, t)
	return t
end

function Maid:Destroy()
	local tasks = self._tasks
	self._tasks = {}
	for i = #tasks, 1, -1 do
		local t = tasks[i]
		if typeof(t) == "function" then
			pcall(t)
		elseif typeof(t) == "RBXScriptConnection" then
			t:Disconnect()
		elseif typeof(t) == "Instance" then
			t:Destroy()
		elseif typeof(t) == "table" and typeof(t.Destroy) == "function" then
			pcall(t.Destroy, t)
		elseif typeof(t) == "table" and typeof(t.Disconnect) == "function" then
			pcall(t.Disconnect, t)
		end
	end
end

return Maid
