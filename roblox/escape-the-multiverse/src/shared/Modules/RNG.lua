-- Seeded RNG wrapper. Roblox's Random already does this; this just gives us a
-- consistent shape used by gacha + procedural builders.

local RNG = {}
RNG.__index = RNG

function RNG.new(seed: number?)
	return setmetatable({ _r = Random.new(seed or os.time()) }, RNG)
end

function RNG:Float(): number
	return self._r:NextNumber()
end

function RNG:Range(lo: number, hi: number): number
	return self._r:NextNumber(lo, hi)
end

function RNG:Int(lo: number, hi: number): number
	return self._r:NextInteger(lo, hi)
end

function RNG:Pick<T>(t: { T }): T
	return t[self._r:NextInteger(1, #t)]
end

return RNG
