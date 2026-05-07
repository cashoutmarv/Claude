return function()
	local StageTable = require(game:GetService("ReplicatedStorage").Shared.Config.StageTable)

	describe("StageTable", function()
		it("has exactly 200 rows", function()
			expect(#StageTable).to.equal(200)
		end)

		it("each world has 20 stages", function()
			local counts = {}
			for _, row in ipairs(StageTable) do
				counts[row.world] = (counts[row.world] or 0) + 1
			end
			for w = 1, 10 do
				expect(counts[w]).to.equal(20)
			end
		end)

		it("milestone count = 40 (stages 1, 10, 15, 20)", function()
			local count = 0
			for _, row in ipairs(StageTable) do
				if row.handcrafted then
					count += 1
				end
			end
			expect(count).to.equal(40)
		end)

		it("seeds are unique", function()
			local seen = {}
			for _, row in ipairs(StageTable) do
				expect(seen[row.params.seed]).to.equal(nil)
				seen[row.params.seed] = true
			end
		end)

		it("stage 15 of every world has skipGate=true", function()
			for w = 1, 10 do
				local row = StageTable[(w - 1) * 20 + 15]
				expect(row.params.skipGate).to.equal(true)
			end
		end)

		it("World 5 stage 8 carries the secret hook", function()
			local row = StageTable[(5 - 1) * 20 + 8]
			expect(row.params.secretHook).to.equal("AbyssSecretS8")
		end)
	end)
end
