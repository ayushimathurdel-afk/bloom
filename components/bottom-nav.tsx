"use client"

import { CalendarDays, Dumbbell, LayoutList, TrendingUp, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

export type Screen = "log" | "exercises" | "splits" | "progress" | "settings"

const ITEMS: { key: Screen; label: string; icon: typeof CalendarDays }[] = [
  { key: "log", label: "Log", icon: CalendarDays },
  { key: "exercises", label: "Exercises", icon: Dumbbell },
  { key: "splits", label: "Splits", icon: LayoutList },
  { key: "progress", label: "Progress", icon: TrendingUp },
  { key: "settings", label: "Settings", icon: Settings },
]

export function BottomNav({ active, onChange }: { active: Screen; onChange: (s: Screen) => void }) {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = active === item.key
          return (
            <li key={item.key} className="flex-1">
              <button
                type="button"
                onClick={() => onChange(item.key)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex w-full flex-col items-center gap-1 rounded-lg px-2 py-2.5 text-xs font-medium transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-5" strokeWidth={isActive ? 2.4 : 1.8} aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
