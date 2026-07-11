"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { calculateTotalVolume, formatDate, getVolumeProgression } from "@/lib/calculations"
import type { LogEntry } from "@/lib/types"
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentLog: LogEntry | null
  history: LogEntry[]
}

export function SessionComparison({ open, onOpenChange, currentLog, history }: Props) {
  const [comparisonDays, setComparisonDays] = useState(7) // Compare with 7 days ago

  const comparison = useMemo(() => {
    if (!currentLog) return null

    const currentVolume = calculateTotalVolume(currentLog.sets)

    // Find a session from comparisonDays ago
    const targetDate = new Date(currentLog.date)
    targetDate.setDate(targetDate.getDate() - comparisonDays)
    const targetDateStr = targetDate.toISOString().split("T")[0]

    const previousSession = history
      .filter((log) => new Date(log.date) <= targetDate)
      .sort((a, b) => b.date.localeCompare(a.date))[0]

    const previousVolume = previousSession ? calculateTotalVolume(previousSession.sets) : 0
    const progression = getVolumeProgression(currentVolume, previousVolume)

    return {
      currentDate: currentLog.date,
      currentVolume,
      currentSets: currentLog.sets.length,
      previousDate: previousSession?.date || null,
      previousVolume,
      previousSets: previousSession?.sets.length || 0,
      progression,
      daysAgo: comparisonDays,
    }
  }, [currentLog, history, comparisonDays])

  if (!comparison) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="fixed inset-0 top-0 left-0 translate-x-0 translate-y-0 w-screen h-dvh max-w-none max-h-none flex flex-col gap-0 rounded-none border-none p-0 ring-0 bg-background"
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle>Session Comparison</DialogTitle>
          <DialogDescription>Compare volume and performance over time</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Date selector */}
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setComparisonDays(Math.max(1, comparisonDays - 7))}
              disabled={comparisonDays <= 1}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Compare with</div>
              <div className="text-sm font-semibold">{comparisonDays} days ago</div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setComparisonDays(comparisonDays + 7)}
              disabled={comparisonDays > 180}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>

          {/* Comparison cards */}
          <div className="grid grid-cols-2 gap-3">
            {/* Today */}
            <div className="rounded-lg border border-border bg-card p-3">
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Today</div>
              <div className="mt-2 space-y-1">
                <div>
                  <div className="text-[10px] text-muted-foreground">Volume</div>
                  <div className="text-lg font-bold">{comparison.currentVolume.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground">Sets</div>
                  <div className="text-lg font-bold">{comparison.currentSets}</div>
                </div>
              </div>
            </div>

            {/* Previous session */}
            <div className="rounded-lg border border-border bg-card p-3">
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                {comparison.daysAgo}d Ago
              </div>
              {comparison.previousDate ? (
                <div className="mt-2 space-y-1">
                  <div>
                    <div className="text-[10px] text-muted-foreground">Volume</div>
                    <div className="text-lg font-bold">{comparison.previousVolume.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground">Sets</div>
                    <div className="text-lg font-bold">{comparison.previousSets}</div>
                  </div>
                </div>
              ) : (
                <div className="mt-2 text-xs text-muted-foreground">No session available</div>
              )}
            </div>
          </div>

          {/* Progression summary */}
          {comparison.previousDate && (
            <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-3">
              <div className="flex items-center gap-2">
                {comparison.progression.isIncrease ? (
                  <TrendingUp className="size-4 text-green-600" />
                ) : (
                  <TrendingDown className="size-4 text-red-600" />
                )}
                <div>
                  <div className="text-sm font-semibold">
                    {comparison.progression.isIncrease ? "Increased" : "Decreased"} by
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {Math.abs(comparison.progression.change).toLocaleString()} volume ({comparison.progression.percentChange > 0 ? "+" : ""}
                    {comparison.progression.percentChange}%)
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="flex justify-between border-t border-border pt-2 text-xs text-muted-foreground">
            <span>{formatDate(new Date(comparison.currentDate))}</span>
            <span>{comparison.previousDate ? formatDate(new Date(comparison.previousDate)) : "—"}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
