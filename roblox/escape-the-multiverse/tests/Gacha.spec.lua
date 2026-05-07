return function()
	local Gacha = require(game:GetService("ReplicatedStorage").Shared.Config.Gacha)
	local Cosmetics = require(game:GetService("ReplicatedStorage").Shared.Config.Cosmetics)

	describe("Gacha config", function()
		it("matches Phaser banners.js base rates exactly", function()
			expect(Gacha.RATES_BASE.Common).to.equal(0.65)
			expect(Gacha.RATES_BASE.Uncommon).to.equal(0.21)
			expect(Gacha.RATES_BASE.Rare).to.equal(0.10)
			expect(Gacha.RATES_BASE.Epic).to.equal(0.035)
			expect(Gacha.RATES_BASE.Legendary).to.equal(0.005)
		end)

		it("pity numbers match Phaser banners.js", function()
			expect(Gacha.PITY.softPityFrom).to.equal(50)
			expect(Gacha.PITY.hardPity).to.equal(70)
		end)

		it("BE/NL are restricted regions", function()
			expect(Gacha.RESTRICTED_REGIONS.BE).to.equal(true)
			expect(Gacha.RESTRICTED_REGIONS.NL).to.equal(true)
		end)
	end)

	describe("Cosmetics catalog", function()
		it("has at least one item per tier in the standard pool", function()
			local pool = Cosmetics.standardPool()
			for _, tier in ipairs({ "Common", "Uncommon", "Rare", "Epic", "Legendary" }) do
				expect(#pool[tier] >= 1).to.equal(true)
			end
		end)

		it("starter trails are owned out of the box", function()
			expect(#Cosmetics.SPAWN_KIOSK_TRAILS >= 4).to.equal(true)
		end)
	end)
end
