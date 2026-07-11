"use client"

import { useEffect, useMemo, useState } from "react"
import { CalendarRange, Check, Moon, Plus, Trash2, X, Settings2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useData } from "@/components/data-provider"
import { useConfirm } from "@/components/confirm-dialog"
import { useBackButton } from "@/components/back-button-provider"
import { deleteSplit, putSplit, uid } from "@/lib/db"
import type { MuscleGroup, SplitDay, WorkoutSplit } from "@/lib/types"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

export function SplitsScreen() {
  const { splits, muscleGroups, activeSplitId, setActiveSplitId, refresh } = useData()
  const confirm = useConfirm()
  const [editor, setEditor] = useState<{ open: boolean; split: WorkoutSplit | null }>({
    open: false,
    split: null,
  })

  const handleDeleteSplit = async (split: WorkoutSplit, wasActive: boolean) => {
    const ok = await confirm({
      title: `Delete ${split.name}?`,
      description: "This training program will be removed.",
      destructive: true,
    })
    if (!ok) return
    await deleteSplit(split.id)
    if (wasActive) await setActiveSplitId(null)
    await refresh()
    toast.success(`${split.name} deleted`, {
      action: {
        label: "Undo",
        onClick: async () => {
          await putSplit(split)
          if (wasActive) await setActiveSplitId(split.id)
          await refresh()
        },
      },
    })
  }

  return (
    <div className="space-y-4 px-4 py-4 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-pretty text-2xl font-semibold tracking-tight">Splits</h1>
          <p className="text-sm text-muted-foreground">Your training programs</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setEditor({ open: true, split: null })}>
          <Plus className="size-4" />
          New
        </Button>
      </div>

      {splits.length === 0 && (
        <Card className="flex flex-col items-center gap-2 p-8 text-center text-muted-foreground">
          <CalendarRange className="size-7" aria-hidden="true" />
          <p className="text-sm">No splits yet. Create your first program.</p>
        </Card>
      )}

      <div className="space-y-3">
        {splits.map((split) => {
          const isActive = split.id === activeSplitId
          return (
            <Card key={split.id} className={cn("p-4", isActive && "ring-2 ring-primary")}>
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-pretty font-medium">{split.name}</h2>
                    {isActive && (
                      <Badge className="gap-1 rounded-full">
                        <Check className="size-3" />
                        Active
                      </Badge>
                    )}
                  </div>
                  {split.description && (
                    <p className="mt-0.5 text-sm text-muted-foreground">{split.description}</p>
                  )}
                </div>
              </div>

              <div className="mt-3 space-y-2">
                {split.days.map((day) => (
                  <div
                    key={day.id}
                    className={cn(
                      "rounded-lg px-3 py-2",
                      day.isRest ? "border border-dashed border-border bg-transparent" : "bg-muted/50",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{day.name}</p>
                      {day.isRest && (
                        <Badge variant="outline" className="gap-1 rounded-full text-[10px] font-normal">
                          <Moon className="size-3" aria-hidden="true" />
                          Rest
                        </Badge>
                      )}
                    </div>
                    {!day.isRest && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {day.muscleGroupIds.length === 0 ? (
                          <span className="text-xs text-muted-foreground">Mobility / accessory</span>
                        ) : (
                          day.muscleGroupIds.map((gid) => {
                            const g = muscleGroups.find((m) => m.id === gid)
                            if (!g) return null
                            return (
                              <span
                                key={gid}
                                className="rounded-full bg-background px-2 py-0.5 text-xs text-foreground"
                              >
                                {g.name}
                              </span>
                            )
                          })
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-3 flex items-center gap-2">
                {!isActive && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      await setActiveSplitId(split.id)
                      toast.success(`${split.name} set as active`)
                    }}
                  >
                    Set active
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => setEditor({ open: true, split })}>
                  Edit
                </Button>
                <div className="flex-1" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  aria-label={`Delete ${split.name}`}
                  onClick={() => handleDeleteSplit(split, isActive)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </Card>
          )
        })}
      </div>

      <SplitEditor
        state={editor}
        groups={muscleGroups}
        onClose={() => setEditor({ open: false, split: null })}
        onSaved={refresh}
      />
    </div>
  )
}

function emptyDay(): SplitDay {
  return { id: uid(), name: "", muscleGroupIds: [], exerciseIds: [] }
}

function SplitEditor({
  state,
  groups,
  onClose,
  onSaved,
}: {
  state: { open: boolean; split: WorkoutSplit | null }
  groups: MuscleGroup[]
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const { exercises } = useData()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [days, setDays] = useState<SplitDay[]>([emptyDay()])
  const [configExerciseForDay, setConfigExerciseForDay] = useState<SplitDay | null>(null)

  // Register back button handler for configure dialog
  useBackButton(
    () => {
      if (configExerciseForDay) {
        setConfigExerciseForDay(null)
        return
      }
    },
    [configExerciseForDay]
  )

  // Register back button handler for split editor dialog
  useBackButton(
    () => {
      if (state.open) {
        onClose()
        return
      }
    },
    [state.open]
  )

  useEffect(() => {
    if (state.open) {
      setName(state.split?.name ?? "")
      setDescription(state.split?.description ?? "")
      setDays(
        state.split
          ? state.split.days.map((d) => ({
              ...d,
              muscleGroupIds: [...d.muscleGroupIds],
              exerciseIds: [...(d.exerciseIds || [])],
            }))
          : [{ ...emptyDay(), name: "Day 1" }],
      )
    }
  }, [state.open, state.split])

  const toggleGroup = (dayId: string, gid: string) => {
    setDays((prev) =>
      prev.map((d) =>
        d.id === dayId
          ? {
              ...d,
              muscleGroupIds: d.muscleGroupIds.includes(gid)
                ? d.muscleGroupIds.filter((x) => x !== gid)
                : [...d.muscleGroupIds, gid],
            }
          : d,
      ),
    )
  }

  const save = async () => {
    if (!name.trim()) {
      toast.error("Enter a split name")
      return
    }
    const cleanDays = days
      .filter((d) => d.name.trim())
      .map((d, i) => ({ ...d, name: d.name.trim() || `Day ${i + 1}` }))
    if (cleanDays.length === 0) {
      toast.error("Add at least one day")
      return
    }
    const split: WorkoutSplit = {
      id: state.split?.id ?? uid(),
      name: name.trim(),
      description: description.trim() || undefined,
      days: cleanDays,
      createdAt: state.split?.createdAt ?? Date.now(),
    }
    await putSplit(split)
    await onSaved()
    onClose()
    toast.success("Split saved")
  }

  return (
    <Dialog open={state.open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[88vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{state.split ? "Edit split" : "New split"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="split-name">Name</Label>
            <Input
              id="split-name"
              value={name}
              placeholder="e.g. Glutes & Strength (4-Day)"
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="split-desc">Description (optional)</Label>
            <Textarea
              id="split-desc"
              value={description}
              placeholder="Focus, goal, weekly schedule…"
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Training days</Label>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-muted-foreground"
                  onClick={() =>
                    setDays((p) => [...p, { ...emptyDay(), name: "Rest", isRest: true }])
                  }
                >
                  <Moon className="size-4" />
                  Rest day
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-primary"
                  onClick={() => setDays((p) => [...p, { ...emptyDay(), name: `Day ${p.length + 1}` }])}
                >
                  <Plus className="size-4" />
                  Add day
                </Button>
              </div>
            </div>

            {days.map((day, idx) => (
              <Card key={day.id} className="space-y-3 p-3">
                <div className="flex items-center gap-2">
                  <Input
                    value={day.name}
                    placeholder={day.isRest ? "Rest day name" : `Day ${idx + 1} name`}
                    onChange={(e) =>
                      setDays((p) => p.map((d) => (d.id === day.id ? { ...d, name: e.target.value } : d)))
                    }
                  />
                  {days.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-9 shrink-0 text-muted-foreground"
                      aria-label="Remove day"
                      onClick={() => setDays((p) => p.filter((d) => d.id !== day.id))}
                    >
                      <X className="size-4" />
                    </Button>
                  )}
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={!!day.isRest}
                  onClick={() =>
                    setDays((p) =>
                      p.map((d) =>
                        d.id === day.id
                          ? { ...d, isRest: !d.isRest, muscleGroupIds: !d.isRest ? [] : d.muscleGroupIds }
                          : d,
                      ),
                    )
                  }
                  className="flex w-full items-center justify-between gap-2 text-left"
                >
                  <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Moon className="size-3.5" aria-hidden="true" />
                    Rest day
                  </span>
                  <span
                    className={cn(
                      "relative h-5 w-9 shrink-0 rounded-full transition-colors",
                      day.isRest ? "bg-primary" : "bg-muted",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 size-4 rounded-full bg-background shadow transition-transform",
                        day.isRest ? "translate-x-[1.125rem]" : "translate-x-0.5",
                      )}
                    />
                  </span>
                </button>

                {!day.isRest && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {groups.map((g) => {
                        const on = day.muscleGroupIds.includes(g.id)
                        return (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => toggleGroup(day.id, g.id)}
                            className={cn(
                              "rounded-full border px-3 py-1 text-xs transition-colors",
                              on
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background text-muted-foreground",
                            )}
                          >
                            {g.name}
                          </button>
                        )
                      })}
                    </div>
                    {day.muscleGroupIds.length > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full gap-2"
                        onClick={() => setConfigExerciseForDay(day)}
                      >
                        <Settings2 className="size-4" />
                        Configure exercises
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>Save split</Button>
        </DialogFooter>
      </DialogContent>

      {configExerciseForDay && (
        <ConfigureExercisesDialog
          day={configExerciseForDay}
          groups={groups}
          exercises={exercises}
          onClose={() => setConfigExerciseForDay(null)}
          onSave={(exerciseIds) => {
            setDays((prev) =>
              prev.map((d) =>
                d.id === configExerciseForDay.id ? { ...d, exerciseIds } : d,
              ),
            )
            setConfigExerciseForDay(null)
          }}
        />
      )}
    </Dialog>
  )
}

function ConfigureExercisesDialog({
  day,
  groups,
  exercises,
  onClose,
  onSave,
}: {
  day: SplitDay
  groups: MuscleGroup[]
  exercises: any[]
  onClose: () => void
  onSave: (exerciseIds: string[]) => void
}) {
  // Initialize with saved exerciseIds, or if empty, auto-select all exercises in the selected muscle groups
  const [selected, setSelected] = useState<Set<string>>(() => {
    if (day.exerciseIds.length > 0) {
      return new Set(day.exerciseIds)
    }
    // Auto-select all exercises for the selected muscle groups
    const allExercisesInGroups = exercises
      .filter((e) => day.muscleGroupIds.includes(e.muscleGroupId) && !e.variantOf)
      .map((e) => e.id)
    return new Set(allExercisesInGroups)
  })

  const dayExercises = useMemo(() => {
    const result: Record<string, any[]> = {}
    for (const gid of day.muscleGroupIds) {
      const g = groups.find((m) => m.id === gid)
      if (!g) continue
      // Only show main variants (no variantOf), exclude variants
      const exs = exercises
        .filter((e) => e.muscleGroupId === gid && !e.variantOf)
        .sort((a, b) => a.order - b.order)
      if (exs.length) result[gid] = exs
    }
    return result
  }, [day.muscleGroupIds, groups, exercises])

  const toggleExercise = (exId: string) => {
    const newSelected = new Set(selected)
    if (newSelected.has(exId)) {
      newSelected.delete(exId)
    } else {
      newSelected.add(exId)
    }
    setSelected(newSelected)
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[80vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure exercises for {day.name}</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Check which exercises you want to include for this day. Only checked exercises will appear when logging.
        </p>
        <div className="space-y-4">
          {Object.entries(dayExercises).map(([gid, exs]) => {
            const group = groups.find((g) => g.id === gid)
            return (
              <div key={gid} className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {group?.name}
                </h3>
                <div className="space-y-1.5">
                  {exs.map((ex) => {
                    const checked = selected.has(ex.id)
                    return (
                      <button
                        key={ex.id}
                        type="button"
                        onClick={() => toggleExercise(ex.id)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded border px-2.5 py-2 text-left text-sm transition-colors",
                          checked
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border hover:bg-muted/50",
                        )}
                      >
                        <span
                          className={cn(
                            "size-4 shrink-0 rounded border transition-all",
                            checked ? "border-primary bg-primary" : "border-border",
                          )}
                        >
                          {checked && <Check className="size-4 text-primary-foreground p-0.5" />}
                        </span>
                        <span className="flex-1">{ex.name}</span>
                        {ex.bodyweight && (
                          <Badge variant="outline" className="h-4 px-1 text-[9px] font-normal">
                            BW
                          </Badge>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => onSave(Array.from(selected))}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
