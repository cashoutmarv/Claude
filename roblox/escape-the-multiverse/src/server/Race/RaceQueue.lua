local Players = game:GetService("Players")

local Queue = {}
Queue._waiting = {} :: { Player }
Queue._listeners = {} :: { (Player, Player) -> () }

function Queue:OnPair(fn: (Player, Player) -> ())
	table.insert(self._listeners, fn)
end

local function tryPair(self)
	while #self._waiting >= 2 do
		local a = table.remove(self._waiting, 1)
		local b = table.remove(self._waiting, 1)
		if a and b and a.Parent and b.Parent then
			for _, fn in ipairs(self._listeners) do
				task.spawn(fn, a, b)
			end
		end
	end
end

function Queue:Add(player: Player)
	for _, p in ipairs(self._waiting) do
		if p == player then
			return
		end
	end
	table.insert(self._waiting, player)
	tryPair(self)
end

function Queue:Remove(player: Player)
	for i, p in ipairs(self._waiting) do
		if p == player then
			table.remove(self._waiting, i)
			return
		end
	end
end

Players.PlayerRemoving:Connect(function(plr)
	Queue:Remove(plr)
end)

return Queue
