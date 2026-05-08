-- Cosmetic catalog. Trails, auras, nameplates. Tiers Common→Legendary.
-- isStarter cosmetics are owned by every player and excluded from the gacha
-- pool. isFeaturedExclusive is included only on the matching featured banner.

local Cosmetics = {
	-- ─── Trails (4 starter types from the spawn kiosk) ───────────────────────
	{
		id = "trail_fire",
		kind = "Trail",
		tier = "Common",
		name = "Fire Trail",
		isStarter = true,
		colorA = Color3.fromRGB(255, 80, 0),
		colorB = Color3.fromRGB(255, 200, 0),
	},
	{
		id = "trail_ice",
		kind = "Trail",
		tier = "Common",
		name = "Ice Trail",
		colorA = Color3.fromRGB(180, 220, 255),
		colorB = Color3.fromRGB(255, 255, 255),
	},
	{
		id = "trail_rainbow",
		kind = "Trail",
		tier = "Uncommon",
		name = "Rainbow Trail",
		isRainbow = true,
	},
	{
		id = "trail_glitch",
		kind = "Trail",
		tier = "Rare",
		name = "Glitch Trail",
		isGlitch = true,
	},

	-- ─── Auras ───────────────────────────────────────────────────────────────
	{ id = "aura_spark", kind = "Aura", tier = "Common", name = "Spark Aura" },
	{ id = "aura_leaf", kind = "Aura", tier = "Common", name = "Leaf Aura" },
	{ id = "aura_flame", kind = "Aura", tier = "Uncommon", name = "Flame Aura" },
	{ id = "aura_frost", kind = "Aura", tier = "Uncommon", name = "Frost Aura" },
	{ id = "aura_thunder", kind = "Aura", tier = "Rare", name = "Thunder Aura" },
	{ id = "aura_void", kind = "Aura", tier = "Rare", name = "Void Aura" },
	{ id = "aura_starlight", kind = "Aura", tier = "Epic", name = "Starlight Aura" },
	{ id = "aura_nebula", kind = "Aura", tier = "Epic", name = "Nebula Aura" },
	{
		id = "aura_glitch_storm",
		kind = "Aura",
		tier = "Legendary",
		name = "Glitch Storm Aura",
		isFeaturedExclusive = true,
	},
	{ id = "aura_eternity", kind = "Aura", tier = "Legendary", name = "Eternity Aura" },

	-- ─── Nameplates ──────────────────────────────────────────────────────────
	{ id = "name_paper", kind = "Nameplate", tier = "Common", name = "Paper" },
	{ id = "name_wood", kind = "Nameplate", tier = "Common", name = "Wood" },
	{ id = "name_bronze", kind = "Nameplate", tier = "Uncommon", name = "Bronze" },
	{ id = "name_silver", kind = "Nameplate", tier = "Uncommon", name = "Silver" },
	{ id = "name_gold", kind = "Nameplate", tier = "Rare", name = "Gold" },
	{ id = "name_obsidian", kind = "Nameplate", tier = "Rare", name = "Obsidian" },
	{ id = "name_diamond", kind = "Nameplate", tier = "Epic", name = "Diamond" },
	{ id = "name_emerald", kind = "Nameplate", tier = "Epic", name = "Emerald" },
	{ id = "name_celestial", kind = "Nameplate", tier = "Legendary", name = "Celestial" },
}

local Catalog = {}
Catalog.All = Cosmetics

-- Indexed lookups
Catalog.byId = {}
for _, c in ipairs(Cosmetics) do
	Catalog.byId[c.id] = c
end

-- Pool grouped by tier (excludes starters and featured-exclusive).
function Catalog.standardPool(): { [string]: { string } }
	local pool = { Common = {}, Uncommon = {}, Rare = {}, Epic = {}, Legendary = {} }
	for _, c in ipairs(Cosmetics) do
		if not c.isStarter and not c.isFeaturedExclusive then
			table.insert(pool[c.tier], c.id)
		end
	end
	return pool
end

-- Featured banner pool: same as standard, plus the featured-exclusive at Legendary.
function Catalog.featuredPool(featuredId: string): { [string]: { string } }
	local pool = Catalog.standardPool()
	if featuredId and Catalog.byId[featuredId] then
		pool.Legendary = { featuredId }
	end
	return pool
end

-- Trails owned out-of-the-box from the spawn kiosk (player picks one of 4 free).
Catalog.SPAWN_KIOSK_TRAILS = { "trail_fire", "trail_ice", "trail_rainbow", "trail_glitch" }

return Catalog
