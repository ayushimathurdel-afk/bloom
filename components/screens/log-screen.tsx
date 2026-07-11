"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Pencil, Play, Plus, Trash2, Trophy, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MonthCalendar } from "@/components/month-calendar"
import { BodyWeightCard } from "@/components/body-weight-card"
import { InlineFormVideo } from "@/components/inline-form-video"
import { LogEntryDialog } from "@/components/log-entry-dialog"
import { useData } from "@/components/data-provider"
import { useConfirm } from "@/components/confirm-dialog"
import { deleteLog, getAllLogs, getSetting, putLog, setSetting } from "@/lib/db"
import type { LogEntry, WeightUnit } from "@/lib/types"
import { formatLong, toKey, todayKey } from "@/lib/date"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

export function LogScreen() {
  const { muscleGroups, exercises, splits, activeSplitId, weightUnit, skipGroupWhenSplit } = useData()
  const confirm = useConfirm()
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [selected, setSelected] = useState<Date>(new Date())
  const [month, setMonth] = useState<Date>(new Date())
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<LogEntry | null>(null)
  const [openVideoId, setOpenVideoId] = useState<string | null>(null)
  // Per-date chosen split day (e.g. "today is Leg Day"). Set once, edit anytime.
  const [splitDayByDate, setSplitDayByDate] = useState<Record<string, string>>({})
  // Remembered preference: show the calendar as a compact single row or the full month.
  const [calendarCollapsed, setCalendarCollapsed] = useState(false)

  const reload = async () => setLogs(await getAllLogs())
  
  const openAdd = useCallback(() => {
    setEditing(null)
    setDialogOpen(true)
  }, [])
  
  useEffect(() => {
    reload()
    getSetting<Record<string, string>>("splitDayByDate").then((v) => {
      if (v) setSplitDayByDate(v)
    })
    getSetting<boolean>("calendarCollapsed").then((v) => {
      if (typeof v === "boolean") setCalendarCollapsed(v)
    })
  }, [])

  const toggleCalendarCollapsed = async () => {
    const next = !calendarCollapsed
    setCalendarCollapsed(next)
    await setSetting("calendarCollapsed", next)
  }

  const loggedDates = useMemo(() => new Set(logs.map((l) => l.date)), [logs])
  const selectedKey = toKey(selected)

  // Non-rest days of the active split become optional "split day" choices.
  const splitDays = useMemo(() => {
    const active = splits.find((s) => s.id === activeSplitId)
    return (active?.days ?? []).filter((d) => !d.isRest)
  }, [splits, activeSplitId])

  const selectedSplitDayId = splitDayByDate[selectedKey] ?? ""
  const selectedSplitDay = useMemo(
    () => splitDays.find((d) => d.id === selectedSplitDayId) ?? null,
    [splitDays, selectedSplitDayId],
  )
  const restrictMuscleGroupIds = useMemo(
    () => (selectedSplitDay?.muscleGroupIds?.length ? selectedSplitDay.muscleGroupIds : null),
    [selectedSplitDay],
  )
  const restrictedExerciseIds = useMemo(
    () => (selectedSplitDay?.exerciseIds?.length ? selectedSplitDay.exerciseIds : null),
    [selectedSplitDay],
  )

  const setSplitDay = async (dayId: string) => {
    const next = { ...splitDayByDate }
    if (dayId) next[selectedKey] = dayId
    else delete next[selectedKey]
    setSplitDayByDate(next)
    await setSetting("splitDayByDate", next)
  }
  const dayLogs = useMemo(
    () => logs.filter((l) => l.date === selectedKey).sort((a, b) => a.createdAt - b.createdAt),
    [logs, selectedKey],
  )

  const exById = (id: string) => exercises.find((e) => e.id === id)
  const exName = (id: string) => exById(id)?.name ?? "Exercise"
  const mgName = (id: string) => muscleGroups.find((m) => m.id === id)?.name ?? ""
  const exHasDemo = (id: string) => {
    const e = exById(id)
    return !!(e?.hasVideo || e?.videoUrl)
  }
  const exIsBodyweight = (id: string) => !!exById(id)?.bodyweight

  const totalSets = dayLogs.reduce((acc, l) => acc + l.sets.length, 0)
  // Volume is shown in the unit chosen in Settings, converting any sets that were
  // logged in the other unit so the total is consistent (never a mix of kg & lbs).
  const KG_PER_LB = 0.453592
  const toDisplayUnit = (weight: number, from: WeightUnit) => {
    if (from === weightUnit) return weight
    return from === "kg" ? weight / KG_PER_LB : weight * KG_PER_LB
  }
  const totalVolume = dayLogs.reduce(
    (acc, l) => acc + l.sets.reduce((s, set) => s + set.reps * toDisplayUnit(set.weight, set.unit ?? "kg"), 0),
    0,
  )

  // Award a trophy to any set that beats the prior best weight or reps for that exercise.
  // Keyed by `${logId}:${setIndex}` -> which record(s) were broken.
  const prBySet = useMemo(() => {
    const map = new Map<string, { weight: boolean; reps: boolean }>()
    const toKg = (w: number, unit?: string) => (unit === "lbs" ? w * 0.453592 : w)
    const chrono = [...logs].sort((a, b) => a.createdAt - b.createdAt)
    const bestByExercise = new Map<string, { weight: number; reps: number }>()
    for (const log of chrono) {
      log.sets.forEach((set, i) => {
        const best = bestByExercise.get(log.exerciseId) ?? { weight: -Infinity, reps: -Infinity }
        const w = toKg(set.weight, set.unit)
        const flags = { weight: false, reps: false }
        if (set.weight > 0 && best.weight !== -Infinity && w > best.weight) flags.weight = true
        if (best.reps !== -Infinity && set.reps > best.reps) flags.reps = true
        if (flags.weight || flags.reps) map.set(`${log.id}:${i}`, flags)
        bestByExercise.set(log.exerciseId, {
          weight: set.weight > 0 ? Math.max(best.weight, w) : best.weight,
          reps: Math.max(best.reps, set.reps),
        })
      })
    }
    return map
  }, [logs])

  const openEdit = (entry: LogEntry) => {
    setEditing(entry)
    setDialogOpen(true)
  }
  const handleDelete = async (entry: LogEntry) => {
    const ok = await confirm({
      title: "Delete this exercise?",
      description: `${exName(entry.exerciseId)} will be removed from this day's log.`,
      confirmLabel: "Delete",
      destructive: true,
    })
    if (!ok) return
    await deleteLog(entry.id)
    reload()
    toast.success(`${exName(entry.exerciseId)} deleted`, {
      action: {
        label: "Undo",
        onClick: async () => {
          await putLog(entry)
          reload()
        },
      },
    })
  }

  const isToday = selectedKey === todayKey()

  return (
    <div className="space-y-5 pb-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {isToday ? "Today" : "Selected day"}
          </p>
          <h1 className="text-pretty text-2xl font-semibold">{formatLong(selected)}</h1>
        </div>
        <Button size="lg" className="h-12 shrink-0 gap-2 px-7 text-lg font-semibold" onClick={openAdd}>
          <Plus className="size-6" /> Log
        </Button>
      </div>

      {splitDays.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-xs font-medium text-muted-foreground">Split day</span>
          <Select value={selectedSplitDayId || "none"} onValueChange={(v) => setSplitDay(!v || v === "none" ? "" : v)}>
            <SelectTrigger className="h-9 flex-1" aria-label="Split day for this date">
              <SelectValue>
                {(value) =>
                  !value || value === "none"
                    ? "All muscle groups"
                    : (splitDays.find((d) => d.id === value)?.name ?? "All muscle groups")
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">All muscle groups</SelectItem>
              {splitDays.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <MonthCalendar
        month={month}
        selected={selected}
        loggedDates={loggedDates}
        collapsed={calendarCollapsed}
        onMonthChange={setMonth}
        onSelect={(d) => {
          setSelected(d)
          if (d.getMonth() !== month.getMonth()) setMonth(d)
        }}
        onToday={() => {
          const t = new Date()
          setSelected(t)
          setMonth(t)
        }}
        onToggleCollapsed={toggleCalendarCollapsed}
      />

      <BodyWeightCard date={selectedKey} />

      {dayLogs.length > 0 && (
        <div className="flex gap-3">
          <div className="flex-1 rounded-xl border border-border bg-card p-3 text-center">
            <p className="text-xl font-semibold">{dayLogs.length}</p>
            <p className="text-xs text-muted-foreground">Exercises</p>
          </div>
          <div className="flex-1 rounded-xl border border-border bg-card p-3 text-center">
            <p className="text-xl font-semibold">{totalSets}</p>
            <p className="text-xs text-muted-foreground">Sets</p>
          </div>
          <div className="flex-1 rounded-xl border border-border bg-card p-3 text-center">
            <p className="text-xl font-semibold">{Math.round(totalVolume).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Volume ({weightUnit})</p>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Workout</h2>
          <Button size="sm" className="gap-1" onClick={openAdd}>
            <Plus className="size-4" /> Add
          </Button>
        </div>

        {dayLogs.length === 0 ? (
          <button
            type="button"
            onClick={openAdd}
            className="w-full rounded-2xl border border-dashed border-border bg-card/50 px-4 py-10 text-center hover:bg-card/70 transition-colors"
          >
            <p className="text-sm font-medium">No exercises logged{isToday ? " yet today" : ""}.</p>
            <p className="mt-1 text-sm text-muted-foreground">Tap "Add" to record your sets, reps and weights.</p>
          </button>
        ) : (
          <ul className="space-y-3">
            {dayLogs.map((log) => (
              <li
                key={log.id}
                className="rounded-2xl border border-border bg-card p-4 cursor-pointer hover:bg-card/80 transition-colors"
                onClick={() => openEdit(log)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-medium">{exName(log.exerciseId)}</h3>
                    </div>
                    <Badge variant="secondary" className="mt-1 font-normal">
                      {mgName(log.muscleGroupId)}
                    </Badge>
                  </div>
                  <div className="flex shrink-0 gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground"
                      aria-label="Edit entry"
                      onClick={() => openEdit(log)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground"
                      aria-label="Delete entry"
                      onClick={() => handleDelete(log)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {log.sets.map((s, i) => {
                    const pr = prBySet.get(`${log.id}:${i}`)
                    const prLabel = pr
                      ? `Personal record: ${[pr.weight && "weight", pr.reps && "reps"].filter(Boolean).join(" & ")}`
                      : undefined
                    return (
                      <span
                        key={i}
                        title={prLabel}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium tabular-nums",
                          pr
                            ? "bg-primary/10 text-primary ring-1 ring-primary/30"
                            : "bg-muted text-foreground",
                        )}
                      >
                        {exIsBodyweight(log.exerciseId) ? `${s.reps} reps` : `${s.reps} × ${s.weight}${s.unit ?? "kg"}`}
                        {pr && (
                          <Trophy className="size-3.5 shrink-0" aria-label={prLabel} />
                        )}
                      </span>
                    )
                  })}
                </div>

                {log.note && <p className="mt-3 text-sm text-muted-foreground">{log.note}</p>}

                {exHasDemo(log.exerciseId) && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 h-8 gap-1.5 px-2 text-primary hover:text-primary"
                      onClick={() => setOpenVideoId((cur) => (cur === log.id ? null : log.id))}
                    >
                      {openVideoId === log.id ? (
                        <>
                          <X className="size-4" /> Hide form media
                        </>
                      ) : (
                        <>
                          <Play className="size-4" /> View form media
                        </>
                      )}
                    </Button>
                    {openVideoId === log.id && (
                      <InlineFormVideo
                        exerciseId={log.exerciseId}
                        hasVideo={exById(log.exerciseId)?.hasVideo}
                        videoUrl={exById(log.exerciseId)?.videoUrl}
                      />
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <LogEntryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        date={selectedKey}
        entry={editing}
        restrictMuscleGroupIds={restrictMuscleGroupIds}
        restrictedExerciseIds={restrictedExerciseIds}
        skipGroupSelect={skipGroupWhenSplit && splitDays.length > 0}
        onSaved={reload}
      />
    </div>
  )
}
