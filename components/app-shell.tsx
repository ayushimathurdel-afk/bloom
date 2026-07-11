"use client"

import { useCallback, useState } from "react"
import { Settings } from "lucide-react"
import { BottomNav, type Screen } from "@/components/bottom-nav"
import { LogScreen } from "@/components/screens/log-screen"
import { ExercisesScreen } from "@/components/screens/exercises-screen"
import { SplitsScreen } from "@/components/screens/splits-screen"
import { ProgressScreen } from "@/components/screens/progress-screen"
import { SettingsDialog } from "@/components/settings-dialog"
import { AppIcon } from "@/components/app-icon"
import { Button } from "@/components/ui/button"
import { useData } from "@/components/data-provider"
import { ConfirmProvider } from "@/components/confirm-dialog"

const DEFAULT_SCREEN: Screen = "log"

export function AppShell() {
  const { ready, goal, appName, appIcon } = useData()
  const [screen, setScreen] = useState<Screen>(DEFAULT_SCREEN)

  // Simple navigation without back button history management
  const navigate = useCallback((next: Screen) => {
    setScreen(next)
  }, [])

  return (
    <ConfirmProvider>
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <AppIcon config={appIcon} size={28} />
            <span className="truncate text-lg font-semibold tracking-tight text-primary">{appName}</span>
          </div>
          <SettingsDialog>
            <Button variant="ghost" size="icon" className="size-9 shrink-0 text-muted-foreground" aria-label="Settings">
              <Settings className="size-5" />
            </Button>
          </SettingsDialog>
        </div>
        {goal.trim() && (
          <div className="mt-1.5">
            <span className="inline-block text-balance rounded-xl bg-accent px-2.5 py-1 text-sm font-medium text-accent-foreground">
              {goal}
            </span>
          </div>
        )}
      </header>

      <main className="flex-1 px-4 pb-24 pt-4">
        {!ready ? (
          <div className="flex h-[60vh] items-center justify-center">
            <p className="text-sm text-muted-foreground">Loading your workouts…</p>
          </div>
        ) : (
          <>
            {screen === "log" && <LogScreen />}
            {screen === "exercises" && <ExercisesScreen />}
            {screen === "splits" && <SplitsScreen />}
            {screen === "progress" && <ProgressScreen />}
          </>
        )}
      </main>

      <BottomNav active={screen} onChange={navigate} />
    </div>
    </ConfirmProvider>
  )
}
