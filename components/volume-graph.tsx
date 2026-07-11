"use client"

import { useMemo } from "react"
import { calculateTotalVolume, formatDate } from "@/lib/calculations"
import type { LogEntry, WorkoutSet } from "@/lib/types"
import { TrendingUp } from "lucide-react"

interface Props {
  logs: LogEntry[]
  showDays?: number
}

export function VolumeGraph({ logs, showDays = 30 }: Props) {
  const volumeData = useMemo(() => {
    // Sort logs by date (most recent first) and calculate running volume
    const sorted = [...logs].sort((a, b) => {
      if (a.date === b.date) return b.createdAt - a.createdAt
      return b.date.localeCompare(a.date)
    })

    const data = sorted.map((log) => ({
      date: log.date,
      volume: calculateTotalVolume(log.sets),
    }))

    const totalVolume = data.reduce((sum, d) => sum + d.volume, 0)
    const maxVolume = Math.max(...data.map((d) => d.volume), 1)
    const avgVolume = totalVolume / (data.length || 1)

    return {
      data,
      totalVolume,
      maxVolume,
      avgVolume,
      count: data.length,
    }
  }, [logs])

  if (volumeData.data.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-muted/20 p-4 text-center">
        <p className="text-xs text-muted-foreground">No volume data available</p>
      </div>
    )
  }

  // Get recent entries for mini chart
  const recentData = volumeData.data.slice(0, 7).reverse()
  const maxHeight = volumeData.maxVolume || 1

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <TrendingUp className="size-4 text-blue-500" />
        <h3 className="text-sm font-semibold">Volume Progression</h3>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded bg-muted/50 p-2">
          <div className="text-[11px] text-muted-foreground">Total</div>
          <div className="text-sm font-semibold">{volumeData.totalVolume.toLocaleString()}</div>
        </div>
        <div className="rounded bg-muted/50 p-2">
          <div className="text-[11px] text-muted-foreground">Average</div>
          <div className="text-sm font-semibold">{Math.round(volumeData.avgVolume).toLocaleString()}</div>
        </div>
        <div className="rounded bg-muted/50 p-2">
          <div className="text-[11px] text-muted-foreground">Sessions</div>
          <div className="text-sm font-semibold">{volumeData.count}</div>
        </div>
      </div>

      {/* Mini chart */}
      <div className="flex h-24 items-end gap-1 rounded bg-muted/30 p-2">
        {recentData.map((item, idx) => {
          const heightPercent = (item.volume / maxHeight) * 100
          return (
            <div
              key={`${item.date}-${idx}`}
              className="flex-1 rounded-t bg-blue-500/60 hover:bg-blue-500 transition-colors"
              style={{ height: `${Math.max(heightPercent, 10)}%` }}
              title={`${item.date}: ${item.volume}`}
            />
          )
        })}
      </div>

      {/* Date labels */}
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{formatDate(new Date(recentData[0]?.date))}</span>
        <span>{formatDate(new Date(recentData[recentData.length - 1]?.date))}</span>
      </div>
    </div>
  )
}
