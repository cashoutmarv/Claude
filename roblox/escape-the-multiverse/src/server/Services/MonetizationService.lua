-- Sole owner of MarketplaceService callbacks. Other services route purchase
-- requests here; this module dispatches to handlers based on product/pass id.

local MarketplaceService = game:GetService("MarketplaceService")

local Shared = require(game:GetService("ReplicatedStorage").Shared)
local Signal = Shared.Modules.Signal

local Monet = {}
Monet._deps = nil :: any

local ownsCache: { [Player]: { [number]: { value: boolean, t: number } } } = {}
local OWNS_TTL = 300 -- 5 min

local devProductHandlers: { [number]: (Player) -> Enum.ProductPurchaseDecision } = {}
local gamePassHandlers: { [number]: (Player) -> () } = {}

function Monet:Init(deps: any)
	self._deps = deps
	self.GamePassPurchased = Signal.new()
end

function Monet:Start()
	MarketplaceService.ProcessReceipt = function(info)
		local plr = game.Players:GetPlayerByUserId(info.PlayerId)
		if not plr then
			return Enum.ProductPurchaseDecision.NotProcessedYet
		end
		local handler = devProductHandlers[info.ProductId]
		if not handler then
			return Enum.ProductPurchaseDecision.NotProcessedYet
		end
		local ok, result = pcall(handler, plr)
		if ok and result == Enum.ProductPurchaseDecision.PurchaseGranted then
			return Enum.ProductPurchaseDecision.PurchaseGranted
		end
		return Enum.ProductPurchaseDecision.NotProcessedYet
	end
	MarketplaceService.PromptGamePassPurchaseFinished:Connect(function(player, passId, purchased)
		if not purchased then
			return
		end
		ownsCache[player] = ownsCache[player] or {}
		ownsCache[player][passId] = { value = true, t = os.clock() }
		self.GamePassPurchased:Fire(player, passId)
		local handler = gamePassHandlers[passId]
		if handler then
			task.spawn(handler, player)
		end
	end)
	game.Players.PlayerRemoving:Connect(function(plr)
		ownsCache[plr] = nil
	end)
end

function Monet:OwnsGamePass(player: Player, passId: number): boolean
	if passId == 0 then
		return false
	end
	local rec = ownsCache[player] and ownsCache[player][passId]
	if rec and (os.clock() - rec.t) < OWNS_TTL then
		return rec.value
	end
	local ok, result = pcall(function()
		return MarketplaceService:UserOwnsGamePassAsync(player.UserId, passId)
	end)
	if not ok then
		return false
	end
	ownsCache[player] = ownsCache[player] or {}
	ownsCache[player][passId] = { value = result, t = os.clock() }
	return result
end

function Monet:PromptGamePass(player: Player, passId: number)
	if passId == 0 then
		return
	end
	pcall(function()
		MarketplaceService:PromptGamePassPurchase(player, passId)
	end)
end

function Monet:PromptDevProduct(player: Player, productId: number)
	if productId == 0 then
		return
	end
	pcall(function()
		MarketplaceService:PromptProductPurchase(player, productId)
	end)
end

function Monet:RegisterDevProduct(productId: number, handler: (Player) -> Enum.ProductPurchaseDecision)
	if productId == 0 then
		return
	end
	devProductHandlers[productId] = handler
end

function Monet:RegisterGamePass(passId: number, handler: (Player) -> ())
	if passId == 0 then
		return
	end
	gamePassHandlers[passId] = handler
end

return Monet
