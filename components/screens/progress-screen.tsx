"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Dumbbell, Flame, Scale, TrendingUp, Trophy } from "lucide-react"
import { Card } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useData } from "@/components/data-provider"
import { getAllLogs, getBodyWeights } from "@/lib/db"
import type { BodyWeightEntry, LogEntry } from "@/lib/types"
import { addDays, fromKey, toKey, weekdayShort } from "@/lib/date"
import { ExerciseHistoryDashboard } from "@/components/exercise-history-dashboard"

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
]

function entryVolume(e: LogEntry): number {
  return e.sets.reduce((sum, s) => sum + (s.reps || 0) * (s.weight || 0), 0)
}
function entryReps(e: LogEntry): number {
  return e.sets.reduce((sum, s) => sum + (s.reps || 0), 0)
}
function topWeight(e: LogEntry): number {
  return e.sets.reduce((max, s) => Math.max(max, s.weight || 0), 0)
}

export function ProgressScreen() {
  const { exercises, muscleGroups, weightUnit } = useData()
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [bodyWeights, setBodyWeights] = useState<BodyWeightEntry[]>([])
  const [exerciseId, setExerciseId] = useState<string>("")

  useEffect(() => {
    getAllLogs().then((l) => setLogs(l))
    getBodyWeights().then((b) => setBodyWeights(b))
  }, [])

  const bodyWeightData = useMemo(
    () =>
      bodyWeights.map((b) => {
        const d = fromKey(b.date)
        return { label: `${d.getMonth() + 1}/${d.getDate()}`, weight: b.weight }
      }),
    [bodyWeights],
  )
  const latestWeight = bodyWeights.length ? bodyWeights[bodyWeights.length - 1].weight : null

  /* ---- Summary stats ---- */
  const stats = useMemo(() => {
    const days = new Set(logs.map((l) => l.date))
    const totalVolume = logs.reduce((s, l) => s + entryVolume(l), 0)
    const totalSets = logs.reduce((s, l) => s + l.sets.length, 0)
    // current streak of consecutive days ending today
    let streak = 0
    let cursor = new Date()
    while (days.has(toKey(cursor))) {
      streak++
      cursor = addDays(cursor, -1)
    }
    return { workouts: days.size, totalVolume, totalSets, streak }
  }, [logs])

  /* ---- Last 7 days volume ---- */
  const weekData = useMemo(() => {
    const today = new Date()
    return Array.from({ length: 7 }).map((_, i) => {
      const d = addDays(today, -(6 - i))
      const key = toKey(d)
      const vol = logs.filter((l) => l.date === key).reduce((s, l) => s + entryVolume(l), 0)
      return { day: weekdayShort(d), volume: Math.round(vol) }
    })
  }, [logs])

  /* ---- Muscle group distribution (by sets) ---- */
  const groupData = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const l of logs) {
      counts[l.muscleGroupId] = (counts[l.muscleGroupId] ?? 0) + l.sets.length
    }
    return muscleGroups
      .map((g) => ({ name: g.name, value: counts[g.id] ?? 0, color: g.color }))
      .filter((d) => d.value > 0)
  }, [logs, muscleGroups])

  /* ---- Per-exercise progression ---- */
  const exerciseOptions = useMemo(
    () => exercises.filter((e) => logs.some((l) => l.exerciseId === e.id)),
    [exercises, logs],
  )

  useEffect(() => {
    if (!exerciseId && exerciseOptions.length > 0) setExerciseId(exerciseOptions[0].id)
  }, [exerciseOptions, exerciseId])

  const progressionData = useMemo(() => {
    if (!exerciseId) return []
    const byDate: Record<string, LogEntry[]> = {}
    for (const l of logs.filter((l) => l.exerciseId === exerciseId)) {
      ;(byDate[l.date] ??= []).push(l)
    }
    return Object.keys(byDate)
      .sort()
      .map((date) => {
        const entries = byDate[date]
        const top = Math.max(...entries.map(topWeight))
        const vol = entries.reduce((s, e) => s + entryVolume(e), 0)
        const d = fromKey(date)
        return {
          label: `${d.getMonth() + 1}/${d.getDate()}`,
          weight: top,
          volume: Math.round(vol),
        }
      })
  }, [logs, exerciseId])

  const exerciseHistoryMap = useMemo(() => {
    const map = new Map<string, LogEntry[]>()
    logs.forEach((log) => {
      if (!map.has(log.exerciseId)) {
        map.set(log.exerciseId, [])
      }
      map.get(log.exerciseId)!.push(log)
    })
    return map
  }, [logs])

  const exerciseNameMap = useMemo(() => {
    const map = new Map<string, string>()
    exercises.forEach((ex) => {
      map.set(ex.id, ex.name)
    })
    return map
  }, [exercises])

  if (logs.length === 0 && bodyWeights.length === 0) {
    return (
      <div className="px-4 py-4 pb-24">
        <h1 className="text-pretty text-2xl font-semibold tracking-tight">Progress</h1>
        <Card className="mt-4 flex flex-col items-center gap-2 p-8 text-center text-muted-foreground">
          <TrendingUp className="size-7" aria-hidden="true" />
          <p className="text-sm">Log a few workouts to see your trends and analysis here.</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-5 px-4 py-4 pb-24">
      <div>
        <h1 className="text-pretty text-2xl font-semibold tracking-tight">Progress</h1>
        <p className="text-sm text-muted-foreground">Your training trends and analysis</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={<Dumbbell className="size-4" />} label="Workouts" value={String(stats.workouts)} />
        <StatCard icon={<Flame className="size-4" />} label="Day streak" value={String(stats.streak)} />
        <StatCard
          icon={<TrendingUp className="size-4" />}
          label="Total volume"
          value={
            stats.totalVolume >= 1000
              ? `${(stats.totalVolume / 1000).toFixed(1)}k`
              : String(Math.round(stats.totalVolume))
          }
        />
        <StatCard icon={<Trophy className="size-4" />} label="Total sets" value={String(stats.totalSets)} />
      </div>

      {/* Exercise history dashboard */}
      <Card className="p-4">
        <ExerciseHistoryDashboard
          exercises={exerciseHistoryMap}
          exerciseNameMap={exerciseNameMap}
          onSelectExercise={(exerciseId) => setExerciseId(exerciseId)}
        />
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 text-sm font-medium">Volume — last 7 days</h2>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={weekData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
            <YAxis
              tickLine={false}
              axisLine={false}
              fontSize={11}
              stroke="var(--muted-foreground)"
              width={48}
              tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : String(v))}
            />
            <Tooltip
              cursor={{ fill: "var(--muted)" }}
              contentStyle={{
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "var(--popover)",
                color: "var(--popover-foreground)",
                fontSize: 12,
              }}
            />
            <Bar dataKey="volume" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {bodyWeightData.length > 0 && (
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-1.5 text-sm font-medium">
              <Scale className="size-4 text-muted-foreground" aria-hidden="true" />
              Body weight
            </h2>
            {latestWeight !== null && (
              <span className="text-sm font-semibold tabular-nums">{latestWeight} {weightUnit}</span>
            )}
          </div>
          {bodyWeightData.length < 2 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Log your body weight on at least two days to see the trend.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={bodyWeightData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  stroke="var(--muted-foreground)"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  stroke="var(--muted-foreground)"
                  width={40}
                  domain={["dataMin - 1", "dataMax + 1"]}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--popover)",
                    color: "var(--popover-foreground)",
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="weight"
                  name={`Body weight (${weightUnit})`}
                  stroke="var(--chart-2)"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "var(--chart-2)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>
      )}

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium">Exercise progression</h2>
          <Select value={exerciseId} onValueChange={(v) => setExerciseId(v ?? "")}>
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue>
                {(value) => exercises.find((e) => e.id === value)?.name ?? "Select"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {exerciseOptions.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {progressionData.length < 2 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Log this exercise on at least two days to see progression.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={190}>
            <LineChart data={progressionData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
              <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" width={40} />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "var(--popover)",
                  color: "var(--popover-foreground)",
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="weight"
                name="Top weight"
                stroke="var(--chart-1)"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "var(--chart-1)" }}
              />
              <Line
                type="monotone"
                dataKey="volume"
                name="Volume"
                stroke="var(--chart-3)"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      {groupData.length > 0 && (
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-medium">Training focus</h2>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="50%" height={150}>
              <PieChart>
                <Pie data={groupData} dataKey="value" nameKey="name" innerRadius={36} outerRadius={64} paddingAngle={2}>
                  {groupData.map((d, i) => (
                    <Cell key={i} fill={CHART_COLORS[d.color % 5]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--popover)",
                    color: "var(--popover-foreground)",
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <ul className="flex-1 space-y-1.5">
              {groupData.map((d, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: CHART_COLORS[d.color % 5] }}
                    aria-hidden="true"
                  />
                  <span className="flex-1 truncate">{d.name}</span>
                  <span className="text-muted-foreground">{d.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      )}
    </div>
  )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
    </Card>
  )
}
