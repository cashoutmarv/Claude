-- Cyber Tokyo: train platform that interpolates back and forth in CFrame.
local M = {}
function M.apply(part: BasePart, offset: Vector3, time: number?)
	time = time or 6
	local startCF = part.CFrame
	task.spawn(function()
		local t0 = os.clock()
		while part.Parent do
			local cycle = ((os.clock() - t0) % time) / time
			-- 0..0.5 → forward, 0.5..1 → return.
			local p = if cycle < 0.5 then cycle * 2 else (1 - cycle) * 2
			part.CFrame = startCF:Lerp(startCF * CFrame.new(offset), p)
			task.wait()
		end
	end)
end
return M
