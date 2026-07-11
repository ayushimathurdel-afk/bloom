"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Check, ChevronLeft, ChevronRight, History, Minus, Play, Plus, TrendingUp, Trash2, Trophy, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { InlineFormVideo } from "@/components/inline-form-video"
import { useData } from "@/components/data-provider"
import {
  deleteLog,
  getLatestLogForExercise,
  getLogForDateExercise,
  getLogsByExercise,
  getMostRecentLog,
  putLog,
  uid,
} from "@/lib/db"
import type { LogEntry, WeightUnit, WorkoutSet } from "@/lib/types"
import { formatLong, fromKey } from "@/lib/date"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { estimateOneRepMax, calculateVolume, calculateTotalVolume } from "@/lib/calculations"
import { VolumeGraph } from "@/components/volume-graph"
import { SessionComparison } from "@/components/session-comparison"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: string
  entry?: LogEntry | null
  /** When set (from a chosen split day), limit the muscle-group dropdown to these IDs. */
  restrictMuscleGroupIds?: string[] | null
  /** When set (from a chosen split day), limit exercises to only these IDs. */
  restrictedExerciseIds?: string[] | null
  /** When true, hide the muscle-group dropdown entirely and pick exercises directly. */
  skipGroupSelect?: boolean
  onSaved: () => void
}

const freshDraft = (unit: WeightUnit, weight = 0, reps = 10): WorkoutSet => ({ reps, weight, unit })

export function LogEntryDialog({
  open,
  onOpenChange,
  date,
  entry,
  restrictMuscleGroupIds,
  restrictedExerciseIds,
  skipGroupSelect = false,
  onSaved,
}: Props) {
  const { muscleGroups, exercises, weightUnit, autoLoadSet } = useData()
  const [muscleGroupId, setMuscleGroupId] = useState("")
  const [exerciseId, setExerciseId] = useState("")
  // Logged sets (shown in the summary) and the single set currently being entered.
  const [savedSets, setSavedSets] = useState<WorkoutSet[]>([])
  const [draft, setDraft] = useState<WorkoutSet>(freshDraft(weightUnit))
  // When set, the draft is editing an already-logged set at this index (not adding a new one).
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [note, setNote] = useState("")
  // The DB id / createdAt for this exercise's entry, kept stable so each saved set updates one log.
  const logIdRef = useRef<string | null>(null)
  const createdAtRef = useRef<number | null>(null)
  // True while the draft is an unedited reference from a prior session.
  const [prefilled, setPrefilled] = useState(false)
  // True once the user has typed into the editor without saving — lets "Add to log"
  // rescue a set the user entered but forgot to "Save set", without committing a
  // leftover prefill (which keeps reps/weight after a save but stays "clean").
  const [draftDirty, setDraftDirty] = useState(false)
  const [showVideo, setShowVideo] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [useCustomExercise, setUseCustomExercise] = useState(false)
  const [history, setHistory] = useState<LogEntry[]>([])
  // Historical best weight (kg) & reps for this exercise, used to flag PR sets.
  const [histBest, setHistBest] = useState<{ weight: number; reps: number } | null>(null)
  // For quick previous set feature
  const [lastSet, setLastSet] = useState<WorkoutSet | null>(null)
  // For showing 1RM and volume in the UI
  const [showStats, setShowStats] = useState(true)
  // For comparison modal
  const [showComparison, setShowComparison] = useState(false)

  // When a split day is chosen, narrow the dropdown to its muscle groups.
  const availableMuscleGroups = useMemo(() => {
    if (!restrictMuscleGroupIds || restrictMuscleGroupIds.length === 0) return muscleGroups
    return muscleGroups.filter((m) => restrictMuscleGroupIds.includes(m.id))
  }, [muscleGroups, restrictMuscleGroupIds])

  useEffect(() => {
    if (!open) return
    setPrefilled(false)
    setDraftDirty(false)
    setShowVideo(false)
    setShowHistory(false)
    setEditingIndex(null)
    if (entry) {
      setMuscleGroupId(entry.muscleGroupId)
      setExerciseId(entry.exerciseId)
      // All existing sets sit in the summary; the editor starts empty for adding more.
      setSavedSets(entry.sets.map((s) => ({ ...s })))
      setDraft(freshDraft(weightUnit))
      setNote(entry.note ?? "")
      logIdRef.current = entry.id
      createdAtRef.current = entry.createdAt
    } else {
      // Fallback immediately, then prefer the muscle group from the most recent log.
      setMuscleGroupId(availableMuscleGroups[0]?.id ?? "")
      setExerciseId("")
      setSavedSets([])
      setDraft(freshDraft(weightUnit))
      setNote("")
      logIdRef.current = null
      createdAtRef.current = null
      let active = true
      getMostRecentLog().then((recent) => {
        if (!active || !recent) return
        if (availableMuscleGroups.some((m) => m.id === recent.muscleGroupId)) {
          setMuscleGroupId(recent.muscleGroupId)
        }
      })
      return () => {
        active = false
      }
    }
  }, [open, entry, availableMuscleGroups, weightUnit])

  const filteredExercises = useMemo(() => {
    let exs = exercises.filter((e) => e.muscleGroupId === muscleGroupId && !e.variantOf)
    // If split day specifies certain exercises, filter to those
    if (restrictedExerciseIds?.length) {
      exs = exs.filter((e) => restrictedExerciseIds.includes(e.id))
    }
    return exs
  }, [exercises, muscleGroupId, restrictedExerciseIds])

  // Always include the currently selected group, even if it falls outside the split day.
  const groupOptions = useMemo(() => {
    if (!muscleGroupId || availableMuscleGroups.some((m) => m.id === muscleGroupId)) {
      return availableMuscleGroups
    }
    const current = muscleGroups.find((m) => m.id === muscleGroupId)
    return current ? [...availableMuscleGroups, current] : availableMuscleGroups
  }, [availableMuscleGroups, muscleGroups, muscleGroupId])

  const selectedExercise = useMemo(() => exercises.find((e) => e.id === exerciseId), [exercises, exerciseId])



  // The picker replaces the dropdowns whenever the setting is on and a split is active.
  const skipActive = skipGroupSelect

  // Present a scrollable picker grouped by muscle group, each listing its exercises
  // (ordered) as full, tappable cards. Only show main variants (no variantOf), and when
  // restrictedExerciseIds is set, filter to only those exercises.
  const pickerGroups = useMemo(() => {
    if (!skipActive) return []
    const ids =
      restrictMuscleGroupIds && restrictMuscleGroupIds.length
        ? restrictMuscleGroupIds
        : muscleGroups.map((m) => m.id)
    const groups: { group: { id: string; name: string }; exercises: typeof exercises }[] = []
    for (const id of ids) {
      const group = muscleGroups.find((m) => m.id === id)
      if (!group) continue
      let exs = exercises
        .filter((e) => e.muscleGroupId === id && !e.variantOf) // Only main variants
        .slice()
        .sort((a, b) => a.order - b.order)
      // If split day specifies certain exercises, filter to those
      if (restrictedExerciseIds?.length) {
        exs = exs.filter((e) => restrictedExerciseIds.includes(e.id))
      }
      if (exs.length) groups.push({ group, exercises: exs })
    }
    return groups
  }, [skipActive, restrictMuscleGroupIds, restrictedExerciseIds, muscleGroups, exercises])

  // Show the picker for a fresh log (not editing) while no exercise is chosen yet.
  const showPicker = skipActive && !entry && !exerciseId

  // Choosing an exercise (from the picker or the dropdown) also sets its muscle group.
  const handlePickExercise = (id: string) => {
    setExerciseId(id ?? "")
    if (skipActive) {
      const ex = exercises.find((e) => e.id === id)
      if (ex) setMuscleGroupId(ex.muscleGroupId)
    }
  }

  // Return from the editor back to the scrollable picker, discarding the unsaved draft.
  const backToPicker = () => {
    setExerciseId("")
    setSavedSets([])
    setDraft(freshDraft(weightUnit))
    setNote("")
    setEditingIndex(null)
    setPrefilled(false)
    setDraftDirty(false)
    logIdRef.current = null
    createdAtRef.current = null
  }

  const isBodyweight = !!selectedExercise?.bodyweight
  const hasDemo = !!(selectedExercise?.hasVideo || selectedExercise?.videoUrl)
  const activeUnit: WeightUnit = draft.unit ?? weightUnit
  // Only saved sets count toward the log; the draft is the set currently being entered.
  const totalSets = savedSets.length
  // The set number shown in the editor: the one being edited, or the next new one.
  const editorSetNumber = editingIndex != null ? editingIndex + 1 : savedSets.length + 1

  // Collapse any open demo video / history whenever the chosen exercise changes.
  useEffect(() => {
    setShowVideo(false)
    setShowHistory(false)
  }, [exerciseId])

  // When adding, first check if this exercise already has an entry today: if so,
  // adopt it so new sets append to the same card instead of creating a duplicate.
  // Otherwise start a fresh entry and pre-fill a SINGLE reference set (the first or
  // last set from the most recent prior session, per the user's setting).
  useEffect(() => {
    if (!open || entry || !exerciseId) return
    setEditingIndex(null)
    let active = true
    ;(async () => {
      const existing = await getLogForDateExercise(date, exerciseId)
      if (!active) return
      if (existing) {
        // Continue logging into today's existing entry for this exercise.
        setSavedSets(existing.sets.map((s) => ({ ...s })))
        setNote(existing.note ?? "")
        setMuscleGroupId(existing.muscleGroupId)
        setDraft(freshDraft(weightUnit))
        setPrefilled(false)
        setDraftDirty(false)
        logIdRef.current = existing.id
        createdAtRef.current = existing.createdAt
        return
      }
      // A freshly chosen exercise starts its own log entry.
      setSavedSets([])
      setDraft(freshDraft(weightUnit))
      setDraftDirty(false)
      logIdRef.current = null
      createdAtRef.current = null
      if (autoLoadSet === "off") {
        setPrefilled(false)
        return
      }
      const last = await getLatestLogForExercise(exerciseId, date)
      if (!active) return
      if (last && last.sets.length) {
        const ref = autoLoadSet === "last" ? last.sets[last.sets.length - 1] : last.sets[0]
        setDraft({ ...ref })
        setPrefilled(true)
      } else {
        setPrefilled(false)
      }
    })()
    return () => {
      active = false
    }
  }, [open, entry, exerciseId, date, autoLoadSet, weightUnit])

  // Load the prior best weight/reps + full history for the selected exercise.
  useEffect(() => {
    if (!open || !exerciseId) {
      setHistBest(null)
      setHistory([])
      return
    }
    let active = true
    getLogsByExercise(exerciseId).then((logs) => {
      if (!active) return
      let bestWeight = -Infinity
      let bestReps = -Infinity
      for (const l of logs) {
        if (entry && l.id === entry.id) continue
        for (const s of l.sets) {
          const w = s.unit === "lbs" ? s.weight * 0.453592 : s.weight
          if (s.weight > 0) bestWeight = Math.max(bestWeight, w)
          bestReps = Math.max(bestReps, s.reps)
        }
      }
      setHistBest({ weight: bestWeight, reps: bestReps })
      // Most recent first, excluding the entry being edited.
      const past = logs
        .filter((l) => !(entry && l.id === entry.id))
        .sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : b.date.localeCompare(a.date)))
      setHistory(past)
      // Load the most recent set for the "Quick previous set" feature
      if (past.length > 0 && past[0].sets.length > 0) {
        setLastSet(past[0].sets[past[0].sets.length - 1])
      } else {
        setLastSet(null)
      }
    })
    return () => {
      active = false
    }
  }, [open, exerciseId, entry])

  const setIsPR = (s: WorkoutSet): { weight: boolean; reps: boolean } => {
    if (!histBest) return { weight: false, reps: false }
    const w = s.unit === "lbs" ? s.weight * 0.453592 : s.weight
    return {
      weight: s.weight > 0 && histBest.weight !== -Infinity && w > histBest.weight,
      reps: histBest.reps !== -Infinity && s.reps > histBest.reps,
    }
  }

  const updateDraft = (field: keyof WorkoutSet, value: number | boolean) => {
    setPrefilled(false)
    setDraftDirty(true)
    setDraft((prev) => ({ ...prev, [field]: value }))
  }

  const setDraftUnit = (unit: WeightUnit) => {
    setDraftDirty(true)
    setDraft((prev) => ({ ...prev, unit }))
  }

  // Wipe the auto-loaded reference values back to a clean starting set.
  const clearReference = () => {
    setDraft(freshDraft(weightUnit))
    setPrefilled(false)
    setDraftDirty(false)
  }

  // Quick load the most recent set from history
  const loadPreviousSet = () => {
    if (lastSet) {
      setDraft({ ...lastSet })
      setPrefilled(true)
      setDraftDirty(false)
      toast.success("Loaded last set")
    }
  }

  // Write (or update / delete) this exercise's single log entry to the DB immediately.
  const syncLog = async (sets: WorkoutSet[]) => {
    if (!exerciseId) return
    try {
      if (sets.length === 0) {
        // Nothing logged anymore — drop the entry if one existed.
        if (logIdRef.current) {
          await deleteLog(logIdRef.current)
          logIdRef.current = null
          createdAtRef.current = null
          onSaved()
        }
        return
      }
      const id = logIdRef.current ?? uid()
      logIdRef.current = id
      const createdAt = createdAtRef.current ?? Date.now()
      createdAtRef.current = createdAt
      await putLog({
        id,
        date,
        exerciseId,
        muscleGroupId,
        sets: isBodyweight ? sets.map((s) => ({ ...s, weight: 0 })) : sets,
        note: note.trim() || undefined,
        createdAt,
      })
    } catch (error) {
      console.error("[v0] Error syncing log:", error)
      throw error
    }
    onSaved()
  }

  // Commit the current set — it is logged immediately — and ready the editor for the
  // next one, pre-filled with this set's reps & weight so you just tweak what changed.
  const saveSet = async () => {
    if (!exerciseId) {
      toast.error("Please choose an exercise first")
      return
    }
    if (draft.isDropset ? draft.weight <= 0 : draft.reps <= 0) {
      toast.error(draft.isDropset ? "Enter weight for this dropset first" : "Enter reps for this set first")
      return
    }
    try {
      const next =
        editingIndex != null
          ? savedSets.map((s, idx) => (idx === editingIndex ? { ...draft } : s))
          : [...savedSets, { ...draft }]
      setSavedSets(next)
      setEditingIndex(null)
      setDraft({ reps: draft.reps, weight: draft.weight, unit: draft.unit, isDropset: false })
      setPrefilled(false)
      setDraftDirty(false)
      await syncLog(next)
      toast.success(editingIndex != null ? "Set updated" : "Set logged")
    } catch (error) {
      console.error("[v0] Error saving set:", error)
      toast.error("Failed to save set. Please try again.")
    }
  }

  const removeSaved = async (i: number) => {
    const next = savedSets.filter((_, idx) => idx !== i)
    setSavedSets(next)
    if (editingIndex === i) setEditingIndex(null)
    await syncLog(next)
  }

  // Pull an already-logged set back into the editor to tweak it. The set stays in the
  // summary until you press Save set again, so closing never loses it.
  const editSaved = (i: number) => {
    setEditingIndex(i)
    setDraft({ ...savedSets[i] })
    setPrefilled(false)
    setDraftDirty(false)
  }

  // "Add to log" closes the dialog. Most sets are already saved, but if the user
  // typed a set into the editor and forgot to "Save set", rescue it here so it
  // isn't lost. A leftover prefill (not dirty) is ignored to avoid phantom sets.
  const handleSave = async () => {
    let sets = savedSets
    if (draftDirty && draft.reps > 0) {
      sets =
        editingIndex != null
          ? savedSets.map((s, idx) => (idx === editingIndex ? { ...draft } : s))
          : [...savedSets, { ...draft }]
    }
    if (sets.length > 0) await syncLog(sets)
    onOpenChange(false)
  }

  const formatSet = (s: WorkoutSet) =>
    isBodyweight ? `${s.reps}` : `${s.reps} × ${s.weight}${s.unit ?? weightUnit}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-sm flex-col gap-0 p-0">
        <DialogHeader className="border-b border-border px-6 pb-4 pt-6">
          <DialogTitle>{entry ? "Edit exercise" : "Log exercise"}</DialogTitle>
          <DialogDescription className="sr-only">Enter sets, reps and weight.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
        {showPicker ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {restrictMuscleGroupIds && restrictMuscleGroupIds.length
                ? "Pick today's exercise — scroll through your split day and tap one."
                : "Pick today's exercise — scroll through every muscle group and tap one."}
            </p>
            {pickerGroups.length === 0 ? (
              <p className="text-xs text-muted-foreground">No exercises here yet. Add some in the Exercises tab.</p>
            ) : (
              pickerGroups.map(({ group, exercises: exs }) => (
                <div key={group.id} className="space-y-2">
                  <h3 className="sticky top-0 z-10 -mx-6 bg-background/95 px-6 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur">
                    {group.name}
                  </h3>
                  <div className="space-y-2">
                    {exs.map((ex) => {
                      const demo = !!(ex.hasVideo || ex.videoUrl)
                      return (
                        <button
                          key={ex.id}
                          type="button"
                          onClick={() => handlePickExercise(ex.id)}
                          className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3.5 text-left transition-colors hover:border-ring hover:bg-accent active:bg-accent"
                        >
                          <span className="flex min-w-0 flex-col gap-0.5">
                            <span className="truncate text-sm font-medium text-foreground">{ex.name}</span>
                            {(ex.bodyweight || demo) && (
                              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                                {ex.bodyweight && <span>Bodyweight</span>}
                                {ex.bodyweight && demo && <span aria-hidden>·</span>}
                                {demo && (
                                  <span className="flex items-center gap-1">
                                    <Play className="size-3" /> Form video
                                  </span>
                                )}
                              </span>
                            )}
                          </span>
                          <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <>
            {skipActive ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-10 -mx-6 w-[calc(100%+3rem)] justify-start gap-2 px-6 text-muted-foreground hover:text-foreground"
                onClick={backToPicker}
              >
                <ChevronLeft className="size-4 shrink-0" />
                <span className="flex-1 text-left text-sm font-semibold text-foreground">{selectedExercise?.name}</span>
              </Button>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Muscle group</Label>
                  <Select
                    value={muscleGroupId}
                    onValueChange={(v) => {
                      setMuscleGroupId(v ?? "")
                      setExerciseId("")
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {(value) => muscleGroups.find((m) => m.id === value)?.name ?? "Select group"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {groupOptions.map((mg) => (
                        <SelectItem key={mg.id} value={mg.id}>
                          {mg.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Exercise</Label>
                  {!useCustomExercise ? (
                    <>
                      <Select
                        value={exerciseId}
                        onValueChange={(v) => handlePickExercise(v ?? "")}
                        disabled={!muscleGroupId}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue>
                            {(value) => exercises.find((e) => e.id === value)?.name ?? "Select exercise"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {filteredExercises.map((ex) => (
                            <SelectItem key={ex.id} value={ex.id}>
                              {ex.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {muscleGroupId && filteredExercises.length === 0 && (
                        <p className="text-xs text-muted-foreground">
                          No exercises in this split. Browse all exercises below.
                        </p>
                      )}
                      {!muscleGroupId && (
                        <p className="text-xs text-muted-foreground">
                          Select a muscle group to browse exercises.
                        </p>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full text-xs"
                        disabled={!muscleGroupId}
                        onClick={() => {
                          setUseCustomExercise(true)
                        }}
                      >
                        Browse all exercises
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="max-h-48 space-y-1 overflow-y-auto rounded border border-border bg-muted/30 p-2">
                        {(() => {
                          const allInGroup = exercises.filter((e) => e.muscleGroupId === muscleGroupId && !e.variantOf)
                          // Show exercises from this muscle group that are NOT already in the current split
                          const notInSplit = allInGroup.filter((e) => !restrictedExerciseIds?.includes(e.id))
                          return notInSplit.length > 0 ? (
                            notInSplit.map((ex) => (
                              <button
                                key={ex.id}
                                type="button"
                                onClick={() => {
                                  handlePickExercise(ex.id)
                                  setUseCustomExercise(false)
                                }}
                                className="w-full text-left rounded px-2 py-1.5 text-xs hover:bg-muted/50 transition-colors"
                              >
                                <div className="font-medium">{ex.name}</div>
                              </button>
                            ))
                          ) : (
                            <p className="px-2 py-3 text-xs text-muted-foreground text-center">
                              All exercises from {muscleGroups.find((m) => m.id === muscleGroupId)?.name} are already in your split
                            </p>
                          )
                        })()}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => setUseCustomExercise(false)}
                      >
                        Back
                      </Button>
                    </>
                  )}
                </div>
              </>
            )}

            {exerciseId && (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1">
                  {hasDemo && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1.5 px-2 text-primary hover:text-primary"
                      onClick={() => setShowVideo((v) => !v)}
                    >
                      {showVideo ? (
                        <>
                          <X className="size-4" /> Hide form media
                        </>
                      ) : (
                        <>
                          <Play className="size-4" /> View form media
                        </>
                      )}
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5 px-2 text-primary hover:text-primary"
                    onClick={() => setShowHistory((v) => !v)}
                  >
                    {showHistory ? <X className="size-4" /> : <History className="size-4" />}
                    {showHistory ? "Hide history" : `History${history.length ? ` (${history.length})` : ""}`}
                  </Button>
                </div>
                {showVideo && selectedExercise && (
                  <InlineFormVideo
                    exerciseId={selectedExercise.id}
                    hasVideo={selectedExercise.hasVideo}
                    videoUrl={selectedExercise.videoUrl}
                  />
                )}
                {showHistory && (
                  <div className="space-y-3">
                    {history.length === 0 ? (
                      <p className="px-2 py-3 text-center text-xs text-muted-foreground rounded border border-border bg-muted/20">
                        No past sessions for this exercise yet.
                      </p>
                    ) : (
                      <>
                        <VolumeGraph logs={history} showDays={30} />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full text-xs"
                          onClick={() => setShowComparison(true)}
                        >
                          Compare Sessions
                        </Button>
                        <div className="max-h-32 overflow-y-auto rounded-xl border border-border bg-muted/20 p-1">
                          <ul className="divide-y divide-border">
                            {history.map((h) => (
                              <li key={h.id} className="px-2 py-2">
                                <div className="flex items-baseline justify-between gap-2">
                                  <span className="text-xs font-medium text-foreground">
                                    {formatLong(fromKey(h.date))}
                                  </span>
                                  <span className="text-[11px] text-muted-foreground">
                                    {h.sets.length} {h.sets.length === 1 ? "set" : "sets"}
                                  </span>
                                </div>
                                <div className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                                  {h.sets.map((s) => formatSet(s)).join(", ")}
                                </div>
                                {h.note && (
                                  <div className="mt-0.5 text-[11px] italic text-muted-foreground">{h.note}</div>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {!showPicker && (
          <>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Sets</Label>
            <span className="text-xs text-muted-foreground">{totalSets} logged</span>
          </div>

          {/* Active set editor sits above the summary — enter reps & weight, then Save set */}
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
                {editingIndex != null ? `Editing set ${editorSetNumber}` : `Set ${editorSetNumber}`}
                {prefilled && (
                  <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-medium normal-case tracking-normal text-accent-foreground">
                    from last time
                  </span>
                )}
              </span>
              <div className="flex items-center gap-1">
                {lastSet && !prefilled && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-primary"
                    onClick={loadPreviousSet}
                    title="Load the most recent set"
                  >
                    <Trophy className="size-3.5" /> Last set
                  </Button>
                )}
                {prefilled && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-destructive"
                    onClick={clearReference}
                  >
                    <Trash2 className="size-3.5" /> Clear
                  </Button>
                )}
              </div>
            </div>

            {!draft.isDropset && (
              <StepperField
                label="Reps"
                value={draft.reps}
                step={1}
                min={0}
                onChange={(v) => updateDraft("reps", v)}
              />
            )}

            {!isBodyweight && (
              <StepperField
                label={`Weight (${activeUnit})`}
                value={draft.weight}
                step={activeUnit === "lbs" ? 5 : 2.5}
                min={0}
                decimal
                onChange={(v) => updateDraft("weight", v)}
                headerRight={<UnitToggle value={activeUnit} onChange={setDraftUnit} />}
              />
            )}

            {showStats && draft.weight > 0 && draft.reps > 0 && !isBodyweight && (
              <div className="grid grid-cols-2 gap-2 rounded-lg border border-border/50 bg-accent/5 p-2">
                <div className="flex items-center gap-2">
                  <Trophy className="size-4 text-amber-500" />
                  <div>
                    <div className="text-[11px] text-muted-foreground">Est. 1RM</div>
                    <div className="text-sm font-semibold">{estimateOneRepMax(draft.weight, draft.reps)} {activeUnit}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="size-4 text-blue-500" />
                  <div>
                    <div className="text-[11px] text-muted-foreground">Volume</div>
                    <div className="text-sm font-semibold">{calculateVolume(draft.weight, draft.reps).toLocaleString()}</div>
                  </div>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => updateDraft("isDropset", !draft.isDropset)}
              className="flex w-full items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 hover:bg-muted/50"
            >
              <span className="text-xs font-medium">Dropset</span>
              <span className={cn("inline-flex size-5 items-center justify-center rounded border transition-colors", draft.isDropset ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background")}>
                {draft.isDropset && <Check className="size-3" />}
              </span>
            </button>

            <Button
              type="button"
              variant="default"
              size="lg"
              className="mt-3 w-full gap-2 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold text-base"
              onClick={saveSet}
              disabled={draft.isDropset ? draft.weight <= 0 : draft.reps <= 0}
            >
              <Check className="size-5" /> {editingIndex != null ? "Update set" : "Save set"}
            </Button>
          </div>

          {/* Logged sets — tap to edit, or delete outright */}
          {savedSets.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-border">
              <div
                className={cn(
                  "grid items-center gap-2 border-b border-border bg-muted/50 px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground",
                  isBodyweight ? "grid-cols-[2rem_1fr_2rem]" : "grid-cols-[2rem_1fr_1fr_2rem]",
                )}
              >
                <span>Set</span>
                <span>Reps</span>
                {!isBodyweight && <span>Weight</span>}
                <span className="sr-only">Delete</span>
              </div>
              {savedSets.map((s, i) => {
                const pr = setIsPR(s)
                return (
                  <div
                    key={i}
                    role="button"
                    tabIndex={0}
                    onClick={() => editSaved(i)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        editSaved(i)
                      }
                    }}
                    className={cn(
                      "grid w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm tabular-nums transition-colors hover:bg-muted/50",
                      isBodyweight ? "grid-cols-[2rem_1fr_2rem]" : "grid-cols-[2rem_1fr_1fr_2rem]",
                      editingIndex === i && "bg-accent/60",
                    )}
                  >
                    <span className="font-medium text-muted-foreground">{i + 1}{ s.isDropset && "↘"}</span>
                    <span className="flex items-center gap-1">
                      {s.reps}
                      {pr.reps && <Trophy className="size-3.5 shrink-0 text-primary" aria-label="Reps PR" />}
                    </span>
                    {!isBodyweight && (
                      <span className="flex items-center gap-1">
                        {`${s.weight} ${s.unit ?? weightUnit}`}
                        {pr.weight && <Trophy className="size-3.5 shrink-0 text-primary" aria-label="Weight PR" />}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeSaved(i)
                      }}
                      className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`Delete set ${i + 1}`}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="note">Note (optional)</Label>
          <Input
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="How did it feel?"
          />
        </div>

          </>
        )}

        {!showPicker && (
          <DialogFooter className="border-t border-border px-6 py-4">
            <Button onClick={handleSave} className="w-full">
              {entry ? "Save changes" : "Add to log"}
            </Button>
          </DialogFooter>
        )}
        </div>
      </DialogContent>
      <SessionComparison
        open={showComparison}
        onOpenChange={setShowComparison}
        currentLog={entry || null}
        history={history}
      />
    </Dialog>
  )
}

function StepperField({
  label,
  value,
  step,
  min = 0,
  decimal,
  onChange,
  headerRight,
}: {
  label: string
  value: number
  step: number
  min?: number
  decimal?: boolean
  onChange: (value: number) => void
  headerRight?: React.ReactNode
}) {
  const clamp = (v: number) => (Number.isNaN(v) ? min : Math.max(min, v))
  const round = (v: number) => Math.round(v * 100) / 100

  // Mirror the numeric value as editable text. This lets us support "type to overwrite"
  // WITHOUT selecting the text — which is what triggers Android's cut/copy/select-all toolbar.
  const [text, setText] = useState(() => String(value))
  const focusedRef = useRef(false)
  const pristineRef = useRef(false)

  // Pull external changes (stepper +/- buttons, prefill) in only while not editing,
  // so a partially typed value like "2." is never clobbered mid-entry.
  useEffect(() => {
    if (!focusedRef.current) setText(String(value))
  }, [value])

  const pattern = decimal ? /^[0-9]*\.?[0-9]*$/ : /^[0-9]*$/
  const commit = (raw: string) => {
    setText(raw)
    if (raw === "" || raw === ".") {
      onChange(min)
      return
    }
    const num = Number(raw)
    if (!Number.isNaN(num)) onChange(clamp(num))
  }

  // The substring that was just inserted between `prev` and `next`, found by trimming
  // the shared prefix/suffix. Lets us isolate the character the user typed regardless
  // of caret position — so the first keystroke can replace the whole value.
  const insertedChars = (prev: string, next: string) => {
    let p = 0
    while (p < prev.length && p < next.length && prev[p] === next[p]) p++
    let s = 0
    while (s < prev.length - p && s < next.length - p && prev[prev.length - 1 - s] === next[next.length - 1 - s]) s++
    return next.slice(p, next.length - s)
  }

  return (
    <div className="mt-2">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {headerRight}
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="default"
          size="icon"
          className="size-14 shrink-0 bg-accent/80 hover:bg-accent/70 text-accent-foreground"
          aria-label={`Decrease ${label}`}
          onClick={() => onChange(clamp(round(value - step)))}
        >
          <Minus className="size-5" />
        </Button>
        <Input
          type="text"
          inputMode={decimal ? "decimal" : "numeric"}
          value={text}
          onFocus={() => {
            focusedRef.current = true
            pristineRef.current = true
          }}
          onChange={(e) => {
            const raw = e.target.value
            if (pristineRef.current) {
              pristineRef.current = false
              const typed = insertedChars(text, raw)
              if (typed && pattern.test(typed)) {
                commit(typed)
                return
              }
            }
            if (pattern.test(raw)) commit(raw)
          }}
          onBlur={() => {
            focusedRef.current = false
            pristineRef.current = false
            setText(String(clamp(Number(text) || min)))
          }}
          className="h-12 flex-1 text-center text-lg tabular-nums"
        />
        <Button
          type="button"
          variant="default"
          size="icon"
          className="size-14 shrink-0 bg-accent/80 hover:bg-accent/70 text-accent-foreground"
          aria-label={`Increase ${label}`}
          onClick={() => onChange(clamp(round(value + step)))}
        >
          <Plus className="size-5" />
        </Button>
      </div>
    </div>
  )
}

/** Tiny, low-key kg/lbs slide toggle — tucked in the corner, used only when needed. */
function UnitToggle({ value, onChange }: { value: WeightUnit; onChange: (unit: WeightUnit) => void }) {
  const units: WeightUnit[] = ["kg", "lbs"]
  return (
    <div
      role="group"
      aria-label="Weight unit"
      className="inline-flex items-center rounded-full border border-border bg-muted/60 p-0.5 text-[11px] font-medium"
    >
      {units.map((u) => (
        <button
          key={u}
          type="button"
          aria-pressed={value === u}
          onClick={() => onChange(u)}
          className={cn(
            "rounded-full px-2 py-0.5 leading-none transition-colors",
            value === u ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {u}
        </button>
      ))}
    </div>
  )
}
