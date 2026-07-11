"use client"

import { Flower2, Dumbbell, Heart, Sparkles, Flame, Leaf } from "lucide-react"
import { cn } from "@/lib/utils"

export interface AppIconConfig {
  type: "preset" | "custom"
  value: string
}

export const DEFAULT_APP_ICON: AppIconConfig = { type: "preset", value: "flower" }

export const ICON_PRESETS = [
  { id: "flower", label: "Bloom", Icon: Flower2 },
  { id: "dumbbell", label: "Strength", Icon: Dumbbell },
  { id: "heart", label: "Heart", Icon: Heart },
  { id: "sparkles", label: "Glow", Icon: Sparkles },
  { id: "flame", label: "Burn", Icon: Flame },
  { id: "leaf", label: "Fresh", Icon: Leaf },
] as const

export function getPreset(id: string) {
  return ICON_PRESETS.find((p) => p.id === id) ?? ICON_PRESETS[0]
}

/** Renders the chosen app icon as a rounded tile, used in the header and settings. */
export function AppIcon({ config, size = 28 }: { config: AppIconConfig; size?: number }) {
  if (config.type === "custom" && config.value) {
    return (
      <img
        src={config.value || "/placeholder.svg"}
        alt="App icon"
        className="rounded-lg object-cover"
        style={{ width: size, height: size }}
      />
    )
  }

  const { Icon } = getPreset(config.value)
  return (
    <span
      className={cn("flex items-center justify-center rounded-lg bg-primary text-primary-foreground")}
      style={{ width: size, height: size }}
    >
      <Icon style={{ width: size * 0.6, height: size * 0.6 }} aria-hidden="true" />
    </span>
  )
}
