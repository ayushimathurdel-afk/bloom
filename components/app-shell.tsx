"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Settings } from "lucide-react"
import { toast } from "sonner"
import { BottomNav, type Screen } from "@/components/bottom-nav"
import { initBackButton, registerBackLayer, removeBackLayer } from "@/hooks/use-back-button"
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
  // Id of the single back-stack layer representing "we're off the default tab".
  const tabLayerRef = useRef<number | null>(null)

  // Being on a non-default tab registers ONE back-stack layer, so the hardware
  // back button returns to the default (Log) tab before ever leaving the app.
  const navigate = useCallback((next: Screen) => {
    if (next !== DEFAULT_SCREEN && tabLayerRef.current === null) {
      tabLayerRef.current = registerBackLayer(() => {
        tabLayerRef.current = null
        setScreen(DEFAULT_SCREEN)
      })
    } else if (next === DEFAULT_SCREEN && tabLayerRef.current !== null) {
      // Returned to default via the UI — drop the layer we added.
      const id = tabLayerRef.current
      tabLayerRef.current = null
      removeBackLayer(id)
    }
    setScreen(next)
  }, [])

  // Prime the hardware/browser back-button protection once on mount. A single
  // back press navigates within the app; when nothing is left to dismiss, the
  // first back warns and only a second back (or Home) leaves the app.
  useEffect(() => {
    return initBackButton(() => {
      toast("Press back again to exit", { id: "exit-hint", duration: 1800 })
    })
  }, [])

  // When an input/textarea is focused (e.g. the keyboard opens on mobile), scroll
  // it into view so the user can see what they're typing.
  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null
      if (!target) return
      if (target.matches("input, textarea, select, [contenteditable='true']")) {
        // Delay so the on-screen keyboard has begun resizing the viewport.
        setTimeout(() => {
          target.scrollIntoView({ block: "center", behavior: "smooth" })
        }, 300)
      }
    }
    window.addEventListener("focusin", onFocusIn)
    return () => window.removeEventListener("focusin", onFocusIn)
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
