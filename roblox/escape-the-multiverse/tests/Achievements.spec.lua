return function()
	local Achievements = require(game:GetService("ReplicatedStorage").Shared.Config.Achievements)
	local Schema = require(game:GetService("ReplicatedStorage").Shared.Modules.Schema)

	describe("Achievements config", function()
		it("exposes a non-empty LIST", function()
			expect(type(Achievements.LIST)).to.equal("table")
			expect(#Achievements.LIST > 0).to.equal(true)
		end)

		it("includes all 10 world_clear_N rows (N=1..10)", function()
			for n = 1, 10 do
				local id = "world_clear_" .. tostring(n)
				expect(Achievements.BY_ID[id] ~= nil).to.equal(true)
			end
		end)

		it("has no duplicate ids", function()
			local seen = {}
			for _, row in ipairs(Achievements.LIST) do
				expect(seen[row.id]).to.equal(nil)
				seen[row.id] = true
			end
		end)

		it("every row has a positive integer hardReward", function()
			for _, row in ipairs(Achievements.LIST) do
				expect(type(row.hardReward)).to.equal("number")
				expect(row.hardReward > 0).to.equal(true)
				expect(row.hardReward == math.floor(row.hardReward)).to.equal(true)
			end
		end)

		it("every row has a label and a trigger", function()
			for _, row in ipairs(Achievements.LIST) do
				expect(type(row.label)).to.equal("string")
				expect(type(row.trigger)).to.equal("string")
				expect(row.oneShot).to.equal(true)
			end
		end)

		it("BY_TRIGGER buckets reference real ids", function()
			for trigger, ids in pairs(Achievements.BY_TRIGGER) do
				expect(type(trigger)).to.equal("string")
				expect(#ids > 0).to.equal(true)
				for _, id in ipairs(ids) do
					expect(Achievements.BY_ID[id] ~= nil).to.equal(true)
				end
			end
		end)

		-- Pinning the rewards that mirror the Phaser src/config/achievements.js
		-- table. If the Phaser file shifts these numbers we want to know.
		it("pins Phaser-equivalent rewards", function()
			expect(Achievements.BY_ID.stage_first.hardReward).to.equal(25) -- = first_kill (25 gems)
			expect(Achievements.BY_ID.world_first.hardReward).to.equal(100) -- = kills_100 (100 gems)
			expect(Achievements.BY_ID.world_clear_10.hardReward).to.equal(1000) -- = kills_10000 (1000 gems)
			expect(Achievements.BY_ID.race_win_first.hardReward).to.equal(200) -- = first_pull (200 gems)
			expect(Achievements.BY_ID.secret_first.hardReward).to.equal(500) -- = first_legendary (500 gems)
			expect(Achievements.BY_ID.death_count_100.hardReward).to.equal(50) -- = first_death (50 gems)
		end)

		it("death_count_100 row carries threshold = 100", function()
			expect(Achievements.BY_ID.death_count_100.threshold).to.equal(100)
		end)

		it("HARD_REWARD_TOTAL matches summed rewards", function()
			local sum = 0
			for _, row in ipairs(Achievements.LIST) do
				sum = sum + row.hardReward
			end
			expect(Achievements.HARD_REWARD_TOTAL).to.equal(sum)
		end)
	end)

	describe("Schema migration v2", function()
		it("CURRENT_VERSION is 2", function()
			expect(Schema.CURRENT_VERSION).to.equal(2)
		end)

		it("default profile carries an awardedAchievements table", function()
			local p = Schema.default()
			expect(type(p.awardedAchievements)).to.equal("table")
			-- new profile starts empty
			local n = 0
			for _ in pairs(p.awardedAchievements) do
				n = n + 1
			end
			expect(n).to.equal(0)
		end)

		it("migrates a v1 profile to v2 without losing data", function()
			local v1 = {
				schemaVersion = 1,
				worldsCompleted = 3,
				highestStage = 60,
				checkpoints = { [1] = 20 },
				ownedTrails = { Fire = true },
				equippedTrail = "Fire",
				ownedCosmetics = {},
				currency = { soft = 123, hard = 0, selectorTokens = 0 },
				pity = {
					standard = { pullsSinceLegendary = 5, pullsSinceEpic = 2 },
					featured = { pullsSinceLegendary = 0, pullsSinceEpic = 0 },
				},
				badgesAwarded = { world_1 = true },
				ownedGamePasses = {},
				region = "GLOBAL",
			}
			local migrated = Schema.migrate(v1)
			expect(migrated.schemaVersion).to.equal(2)
			expect(migrated.worldsCompleted).to.equal(3)
			expect(migrated.highestStage).to.equal(60)
			expect(migrated.currency.soft).to.equal(123)
			expect(migrated.badgesAwarded.world_1).to.equal(true)
			expect(type(migrated.awardedAchievements)).to.equal("table")
		end)
	end)
end
