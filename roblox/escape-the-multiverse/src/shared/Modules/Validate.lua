-- Server-side bounds checks + rate limiter. All Net handlers funnel through here
-- so AntiExploitService can centrally tally flags.

local Validate = {}

local lastCalls: { [Player]: { [string]: number } } = {}

function Validate.distance(playerPos: Vector3, target: Vector3, maxStuds: number): boolean
	return (playerPos - target).Magnitude <= maxStuds
end

function Validate.intInRange(v: any, lo: number, hi: number): boolean
	return type(v) == "number" and v == math.floor(v) and v >= lo and v <= hi
end

function Validate.string(v: any, maxLen: number?): boolean
	if type(v) ~= "string" then
		return false
	end
	if maxLen and #v > maxLen then
		return false
	end
	return true
end

-- Returns true if the call is allowed, false if rate-limited.
-- minIntervalSec is the floor between calls per (player, key).
function Validate.rateOk(player: Player, key: string, minIntervalSec: number): boolean
	local now = os.clock()
	local p = lastCalls[player]
	if not p then
		p = {}
		lastCalls[player] = p
	end
	local last = p[key]
	if last and (now - last) < minIntervalSec then
		return false
	end
	p[key] = now
	return true
end

function Validate.cleanup(player: Player)
	lastCalls[player] = nil
end

return Validate
