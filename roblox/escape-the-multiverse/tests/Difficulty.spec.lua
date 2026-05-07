-- TestEZ-style spec. Run via TestEZ plugin in Studio or `lune` headless.

return function()
	local Difficulty = require(game:GetService("ReplicatedStorage").Shared.Config.Difficulty)

	describe("Difficulty", function()
		it("globalStage is monotonic", function()
			expect(Difficulty.globalStage(1, 1)).to.equal(1)
			expect(Difficulty.globalStage(1, 20)).to.equal(20)
			expect(Difficulty.globalStage(2, 1)).to.equal(21)
			expect(Difficulty.globalStage(10, 20)).to.equal(200)
		end)

		it("jumpDistance is non-decreasing across globalStage", function()
			local prev = -math.huge
			for w = 1, 10 do
				for s = 1, 20 do
					local v = Difficulty.jumpDistance(w, s)
					expect(v >= prev).to.equal(true)
					prev = v
				end
			end
		end)

		it("W1S1 is gentle, W10S20 is brutal", function()
			expect(Difficulty.jumpDistance(1, 1) <= 8.5).to.equal(true)
			expect(Difficulty.jumpDistance(10, 20) >= 22).to.equal(true)
		end)

		it("platformWidth never falls below MIN_PLATFORM_WIDTH", function()
			for w = 1, 10 do
				for s = 1, 20 do
					expect(Difficulty.platformWidth(w, s) >= Difficulty.MIN_PLATFORM_WIDTH).to.equal(true)
				end
			end
		end)

		it("killBrickCount is non-negative", function()
			for w = 1, 10 do
				for s = 1, 20 do
					expect(Difficulty.killBrickCount(w, s) >= 0).to.equal(true)
				end
			end
		end)
	end)
end
