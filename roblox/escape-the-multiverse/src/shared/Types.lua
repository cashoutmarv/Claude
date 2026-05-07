--!strict

export type GimmickId = string

export type StageParams = {
	length: number,
	jumpAvg: number,
	jumpJitter: number,
	width: number,
	killBricks: number,
	gimmicks: { GimmickId },
	gimmickDensity: number,
	seed: number,
	skipGate: boolean?,
	portalAfter: boolean?,
	secretHook: string?,
}

export type StageDef = {
	globalId: number,
	world: number,
	stage: number,
	handcrafted: boolean,
	asset: string?,
	builder: string,
	params: StageParams,
}

export type CosmeticState = {
	count: number,
	shards: number,
	level: number,
}

export type Wallet = {
	soft: number,
	hard: number,
	selectorTokens: number,
}

export type PityState = {
	pullsSinceLegendary: number,
	pullsSinceEpic: number,
}

export type Profile = {
	schemaVersion: number,
	worldsCompleted: number,
	highestStage: number,
	checkpoints: { [string]: number },
	ownedTrails: { [string]: boolean },
	equippedTrail: string?,
	ownedCosmetics: { [string]: CosmeticState },
	equippedAura: string?,
	equippedNameplate: string?,
	currency: Wallet,
	pity: { standard: PityState, featured: PityState },
	badgesAwarded: { [string]: boolean },
	ownedGamePasses: { [string]: boolean },
	region: string,
}

export type Tier = "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary"

export type CosmeticDef = {
	id: string,
	tier: Tier,
	kind: "Trail" | "Aura" | "Nameplate",
	name: string,
}

export type RollResult = {
	cosmetic: CosmeticDef,
	tier: Tier,
	wasDupe: boolean,
	shardsAwarded: number,
	tokensAwarded: number,
}

return {}
