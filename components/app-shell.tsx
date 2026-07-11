"use client"

import { useCallback, useEffect, useState } from "react"
import { BottomNav, type Screen } from "@/components/bottom-nav"
import { LogScreen } from "@/components/screens/log-screen"
import { ExercisesScreen } from "@/components/screens/exercises-screen"
import { SplitsScreen } from "@/components/screens/splits-screen"
import { ProgressScreen } from "@/components/screens/progress-screen"
import { SettingsScreen } from "@/components/screens/settings-screen"
import { AppIcon } from "@/components/app-icon"
import { useData } from "@/components/data-provider"
import { ConfirmProvider } from "@/components/confirm-dialog"

const DEFAULT_SCREEN: Screen = "log"

export function AppShell() {
  const { ready, goal, appName, appIcon } = useData()
  const [screen, setScreen] = useState<Screen>(DEFAULT_SCREEN)

  // Prevent browser back button from leaving the app
  useEffect(() => {
    // Push a state so back button doesn't exit
    window.history.pushState(null, "", window.location.href)
    
    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault()
      // Keep the user in the app by pushing state again
      window.history.pushState(null, "", window.location.href)
    }
    
    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

  // Simple navigation without back button history management
  const navigate = useCallback((next: Screen) => {
    setScreen(next)
  }, [])

  return (
    <ConfirmProvider>
      <div className="flex h-dvh flex-col bg-background">
        {/* Header Tab */}
        <header className="border-b border-border bg-background px-4 py-3">
          <div className="flex items-center gap-2">
            <AppIcon config={appIcon} size={28} />
            <span className="truncate text-lg font-semibold tracking-tight text-primary">{appName}</span>
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
        <main className="flex-1 overflow-y-auto px-4 py-4">
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
              {screen === "settings" && <SettingsScreen />}
            </>
          )}
        </main>

        {/* Bottom Nav Tab */}
        <BottomNav active={screen} onChange={navigate} />
      </div>
    </ConfirmProvider>
  )
}
