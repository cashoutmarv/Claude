-- Catmull-Rom spline. Used by BoulderRoller in World 3.
-- Pass a list of control points. SampleAt(t) with t in [0,1] returns a point.

local Spline = {}
Spline.__index = Spline

local function cr(p0: Vector3, p1: Vector3, p2: Vector3, p3: Vector3, t: number): Vector3
	local t2 = t * t
	local t3 = t2 * t
	return 0.5
		* ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
end

function Spline.new(points: { Vector3 })
	assert(#points >= 2, "Spline needs at least 2 points")
	return setmetatable({ _pts = points }, Spline)
end

function Spline:SampleAt(t: number): Vector3
	t = math.clamp(t, 0, 1)
	local pts = self._pts
	local segs = #pts - 1
	local scaled = t * segs
	local i = math.floor(scaled) + 1
	if i >= #pts then
		return pts[#pts]
	end
	local local_t = scaled - (i - 1)
	local p0 = pts[math.max(i - 1, 1)]
	local p1 = pts[i]
	local p2 = pts[i + 1]
	local p3 = pts[math.min(i + 2, #pts)]
	return cr(p0, p1, p2, p3, local_t)
end

return Spline
