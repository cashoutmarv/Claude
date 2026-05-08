return function()
	local Pity = require(game:GetService("ReplicatedStorage").Shared.Modules.PityCalculator)

	describe("PityCalculator", function()
		it("legendary chance equals base before soft pity", function()
			local c = Pity.legendaryChanceWithPity(0)
			expect(math.abs(c - Pity.RATES_BASE.Legendary) < 1e-9).to.equal(true)
		end)

		it("hard pity guarantees legendary", function()
			-- pullsSinceLegendary + 1 >= 70 ⇒ p = 1
			expect(Pity.legendaryChanceWithPity(69)).to.equal(1)
			expect(Pity.legendaryChanceWithPity(120)).to.equal(1)
		end)

		it("soft pity ramps between 50 and 70", function()
			local before = Pity.legendaryChanceWithPity(48) -- not yet ramping
			local mid = Pity.legendaryChanceWithPity(58)
			local late = Pity.legendaryChanceWithPity(67)
			expect(before < mid).to.equal(true)
			expect(mid < late).to.equal(true)
			expect(late < 1).to.equal(true)
		end)

		it("ten-pull guarantee promotes to Rare when nothing Rare+ rolled", function()
			local results = { "Common", "Common", "Common", "Common", "Common", "Common", "Common", "Common", "Common", "Common" }
			Pity.applyTenPullGuarantee(results)
			expect(results[10]).to.equal("Rare")
		end)

		it("ten-pull guarantee leaves Rare+ alone", function()
			local results = { "Common", "Rare", "Common", "Common", "Common", "Common", "Common", "Common", "Common", "Uncommon" }
			Pity.applyTenPullGuarantee(results)
			expect(results[10]).to.equal("Uncommon")
		end)

		it("selector token costs match the Phaser repo (30/80/150)", function()
			expect(Pity.SELECTOR_COSTS.Rare).to.equal(30)
			expect(Pity.SELECTOR_COSTS.Epic).to.equal(80)
			expect(Pity.SELECTOR_COSTS.Legendary).to.equal(150)
		end)
	end)
end
