local TweenService = game:GetService("TweenService")

local Tween = {}

function Tween.run(inst: Instance, info: TweenInfo, props: { [string]: any })
	local t = TweenService:Create(inst, info, props)
	t:Play()
	return t
end

function Tween.linear(time: number)
	return TweenInfo.new(time, Enum.EasingStyle.Linear)
end

function Tween.ease(time: number, style: Enum.EasingStyle?, dir: Enum.EasingDirection?)
	return TweenInfo.new(
		time,
		style or Enum.EasingStyle.Quad,
		dir or Enum.EasingDirection.Out
	)
end

function Tween.loop(time: number, style: Enum.EasingStyle?)
	return TweenInfo.new(
		time,
		style or Enum.EasingStyle.Sine,
		Enum.EasingDirection.InOut,
		-1,
		true
	)
end

return Tween
