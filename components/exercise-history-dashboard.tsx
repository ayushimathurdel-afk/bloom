"use client"

import { useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { LogEntry } from "@/lib/types"
import { calculateTotalVolume, estimateOneRepMax } from "@/lib/calculations"
import { Trophy, TrendingUp, Calendar, Zap } from "lucide-react"
import { formatLong, fromKey } from "@/lib/date"

interface ExerciseStats {
  id: string
  name: string
  maxWeight: number
  maxReps: number
  estimated1RM: number
  totalVolume: number
  totalSessions: number
  lastSession: string
  avgVolume: number
  unit: "kg" | "lbs"
}

interface Props {
  exercises: Map<string, LogEntry[]>
  exerciseNameMap: Map<string, string>
  onSelectExercise: (exerciseId: string) => void
}

export function ExerciseHistoryDashboard({ exercises, exerciseNameMap, onSelectExercise }: Props) {
  const stats = useMemo(() => {
    const result: ExerciseStats[] = []

    exercises.forEach((logs, exerciseId) => {
      if (logs.length === 0) return

      let maxWeight = 0
      let maxReps = 0
      let totalVolume = 0

      logs.forEach((log) => {
        const volume = calculateTotalVolume(log.sets)
        totalVolume += volume

        log.sets.forEach((set) => {
          const w = set.unit === "lbs" ? set.weight * 0.453592 : set.weight
          if (w > maxWeight) maxWeight = w
          if (set.reps > maxReps) maxReps = set.reps
        })
      })

      const estimated1RM = maxWeight > 0 && maxReps > 0 ? estimateOneRepMax(maxWeight, maxReps) : 0
      const avgVolume = Math.round(totalVolume / logs.length)
      const lastSession = logs[0].date
      const exerciseName = exerciseNameMap.get(exerciseId) || "Unknown"

      result.push({
        id: exerciseId,
        name: exerciseName,
        maxWeight: Math.round(maxWeight * 100) / 100,
        maxReps,
        estimated1RM: Math.round(estimated1RM * 100) / 100,
        totalVolume,
        totalSessions: logs.length,
        lastSession,
        avgVolume,
        unit: logs[0].sets[0]?.unit || "kg",
      })
    })

    // Sort by total volume (best first)
    return result.sort((a, b) => b.totalVolume - a.totalVolume)
  }, [exercises, exerciseNameMap])

  if (stats.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center">
        <Zap className="mx-auto mb-2 size-8 text-muted-foreground" />
        <p className="text-sm font-medium">No exercise history yet</p>
        <p className="text-xs text-muted-foreground">Log some sets to see your stats here</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold flex items-center gap-2">
        <Trophy className="size-4" />
        Exercise Summary
      </h2>
      <div className="grid gap-3">
        {stats.map((stat) => (
          <button
            key={stat.id}
            onClick={() => onSelectExercise(stat.id)}
            className="flex items-center justify-between rounded-lg border border-border bg-card p-3 hover:bg-accent/50 transition-colors text-left"
          >
            <div className="min-w-0 flex-1">
              <div className="font-medium truncate">{stat.name}</div>
              <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Trophy className="size-3" /> {stat.estimated1RM} {stat.unit}
                </span>
                <span className="flex items-center gap-1">
                  <TrendingUp className="size-3" /> {stat.totalVolume.toLocaleString()} vol
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="size-3" /> {stat.totalSessions}x
                </span>
              </div>
            </div>
            <div className="ml-2 text-right">
              <div className="text-xs text-muted-foreground">Last</div>
              <div className="text-xs font-medium">{stat.lastSession.split("-").slice(1).join("/")}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
