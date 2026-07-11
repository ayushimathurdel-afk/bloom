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
import { BackButtonProvider, useBackButton } from "@/components/back-button-provider"

const DEFAULT_SCREEN: Screen = "log"

function AppShellContent() {
  const { ready, goal, appName, appIcon } = useData()
  const [screen, setScreen] = useState<Screen>(DEFAULT_SCREEN)
  const [settingsOpen, setSettingsOpen] = useState(false)

  // Register back button handler for settings
  useBackButton(
    useCallback(() => {
      if (settingsOpen) {
        setSettingsOpen(false)
        return
      }
    }, [settingsOpen])
  )

  // Register back button handler for tab navigation
  useBackButton(
    useCallback(() => {
      if (screen !== DEFAULT_SCREEN) {
        setScreen(DEFAULT_SCREEN)
        return
      }
    }, [screen])
  )

  // Simple navigation
  const navigate = useCallback((next: Screen) => {
    setScreen(next)
  }, [])

  return (
    <div className="flex h-dvh flex-col bg-background">
        {/* Header Tab */}
        <header className="border-b border-border bg-background px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <AppIcon config={appIcon} size={28} />
              <span className="truncate text-lg font-semibold tracking-tight text-primary">{appName}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-9 shrink-0 text-muted-foreground"
              onClick={() => setSettingsOpen(true)}
              aria-label="Settings"
            >
              <Settings className="size-5" />
            </Button>
          </div>
          {goal.trim() && (
            <div className="mt-1.5">
              <span className="inline-block text-balance rounded-xl bg-accent px-2.5 py-1 text-sm font-medium text-accent-foreground">
                {goal}
              </span>
            </div>
          )}
        </header>

        {/* Content Area - grows to fill remaining space */}
        <main className="flex-1 overflow-y-auto px-4 py-4 pb-24">
          {!ready ? (
            <div className="flex h-full items-center justify-center">
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

        {/* Bottom Nav Tab */}
        <BottomNav active={screen} onChange={navigate} />

        {/* Settings Dialog - Fullscreen */}
        <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      </div>
  )
}

export function AppShell() {
  return (
    <BackButtonProvider>
      <ConfirmProvider>
        <AppShellContent />
      </ConfirmProvider>
    </BackButtonProvider>
  )
}
