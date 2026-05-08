-- Minimal Signal. Mirrors the Sleitnick/Signal API surface we use:
--   :Connect(fn) -> connection (with :Disconnect())
--   :Fire(...)
--   :Once(fn)
--   :Wait()
--   :Destroy()
-- Swap to wally `sleitnick/signal` later if wanted.

local Signal = {}
Signal.__index = Signal

type Connection = { Disconnect: (Connection) -> () }

function Signal.new()
	return setmetatable({ _slots = {} :: { [(...any) -> ()]: boolean } }, Signal)
end

function Signal:Connect(fn: (...any) -> ()): Connection
	self._slots[fn] = true
	local self_ = self
	return {
		Disconnect = function(_)
			self_._slots[fn] = nil
		end,
	}
end

function Signal:Once(fn: (...any) -> ()): Connection
	local conn: Connection
	conn = self:Connect(function(...)
		conn:Disconnect()
		fn(...)
	end)
	return conn
end

function Signal:Fire(...)
	for fn in pairs(self._slots) do
		task.spawn(fn, ...)
	end
end

function Signal:Wait(): ...any
	local thread = coroutine.running()
	local conn: Connection
	conn = self:Connect(function(...)
		conn:Disconnect()
		task.spawn(thread, ...)
	end)
	return coroutine.yield()
end

function Signal:Destroy()
	self._slots = {}
end

return Signal
