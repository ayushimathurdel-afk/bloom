"use client"

import { useEffect, useMemo, useState } from "react"
import { ChevronDown, Dumbbell, Pencil, Plus, Trash2, Video } from "lucide-react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useData } from "@/components/data-provider"
import { useConfirm } from "@/components/confirm-dialog"
import { VideoDialog } from "@/components/video-dialog"
import {
  deleteExercise,
  deleteMuscleGroup,
  getVideo,
  putExercise,
  putMuscleGroup,
  putVideo,
  uid,
} from "@/lib/db"
import type { Exercise, ExerciseVideo, MuscleGroup } from "@/lib/types"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

export function ExercisesScreen() {
  const { muscleGroups, exercises, refresh } = useData()
  const confirm = useConfirm()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const handleDeleteExercise = async (ex: Exercise) => {
    const ok = await confirm({
      title: `Delete ${ex.name}?`,
      description: "This removes the exercise and its saved demo video.",
      destructive: true,
    })
    if (!ok) return
    const video = await getVideo(ex.id)
    await deleteExercise(ex.id)
    await refresh()
    toast.success(`${ex.name} deleted`, {
      action: {
        label: "Undo",
        onClick: async () => {
          await putExercise(ex)
          if (video) await putVideo(video)
          await refresh()
        },
      },
    })
  }

  const handleDeleteGroup = async (group: MuscleGroup) => {
    const groupExercises = exercises.filter((e) => e.muscleGroupId === group.id)
    const ok = await confirm({
      title: `Delete ${group.name}?`,
      description:
        groupExercises.length > 0
          ? `This also removes ${groupExercises.length} exercise${groupExercises.length === 1 ? "" : "s"} in this group.`
          : "This muscle group will be removed.",
      destructive: true,
    })
    if (!ok) return
    const videos = (
      await Promise.all(groupExercises.map((e) => getVideo(e.id)))
    ).filter((v): v is ExerciseVideo => !!v)
    await deleteMuscleGroup(group.id)
    await refresh()
    toast.success(`${group.name} deleted`, {
      action: {
        label: "Undo",
        onClick: async () => {
          await putMuscleGroup(group)
          for (const ex of groupExercises) await putExercise(ex)
          for (const v of videos) await putVideo(v)
          await refresh()
        },
      },
    })
  }
  const [groupDialog, setGroupDialog] = useState<{ open: boolean; group: MuscleGroup | null }>({
    open: false,
    group: null,
  })
  const [exDialog, setExDialog] = useState<{ open: boolean; ex: Exercise | null; groupId: string }>({
    open: false,
    ex: null,
    groupId: "",
  })
  const [videoFor, setVideoFor] = useState<Exercise | null>(null)

  const exByGroup = useMemo(() => {
    const map: Record<string, Exercise[]> = {}
    for (const e of exercises) {
      ;(map[e.muscleGroupId] ??= []).push(e)
    }
    return map
  }, [exercises])

  return (
    <div className="space-y-4 px-4 py-4 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-pretty text-2xl font-semibold tracking-tight">Exercises</h1>
          <p className="text-sm text-muted-foreground">Your muscle groups and movements</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setGroupDialog({ open: true, group: null })}>
          <Plus className="size-4" />
          Group
        </Button>
      </div>

      {muscleGroups.length === 0 && (
        <Card className="flex flex-col items-center gap-2 p-8 text-center text-muted-foreground">
          <Dumbbell className="size-7" aria-hidden="true" />
          <p className="text-sm">No muscle groups yet. Add your first one.</p>
        </Card>
      )}

      <div className="space-y-3">
        {muscleGroups.map((group) => {
          const list = exByGroup[group.id] ?? []
          const isOpen = expanded[group.id] ?? true
          return (
            <Card key={group.id} className="overflow-hidden p-0">
              <div className="flex items-center gap-3 p-4">
                <button
                  className="flex flex-1 items-center gap-3 text-left"
                  onClick={() => setExpanded((p) => ({ ...p, [group.id]: !isOpen }))}
                  aria-expanded={isOpen}
                >
                  <span
                    className="size-3 shrink-0 rounded-full"
                    style={{ backgroundColor: `var(--chart-${(group.color % 5) + 1})` }}
                    aria-hidden="true"
                  />
                  <span className="flex-1 font-medium">{group.name}</span>
                  <Badge variant="secondary" className="rounded-full">
                    {list.length}
                  </Badge>
                  <ChevronDown
                    className={cn("size-4 text-muted-foreground transition-transform", isOpen && "rotate-180")}
                    aria-hidden="true"
                  />
                </button>
              </div>

              {isOpen && (
                <div className="border-t border-border">
                  {list.map((ex) => (
                    <div key={ex.id} className="border-b border-border/60 last:border-b-0 first:border-t-0">
                      <div className="flex items-center gap-2 px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="truncate text-sm font-medium">{ex.name}</span>
                              {(ex.hasVideo || ex.videoUrl) && (
                                <Video className="size-3.5 shrink-0 text-primary" aria-label="Has form video" />
                              )}
                              {ex.bodyweight && (
                                <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-normal">
                                  Bodyweight
                                </Badge>
                              )}
                            </div>
                            {ex.notes && <p className="truncate text-xs text-muted-foreground">{ex.notes}</p>}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            aria-label={`Video for ${ex.name}`}
                            onClick={() => setVideoFor(ex)}
                          >
                            <Video className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            aria-label={`Edit ${ex.name}`}
                            onClick={() => setExDialog({ open: true, ex, groupId: group.id })}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-muted-foreground"
                            aria-label={`Delete ${ex.name}`}
                            onClick={() => handleDeleteExercise(ex)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>
                    )
                  )}

                  <div className="flex items-center gap-2 px-4 py-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-primary"
                      onClick={() => setExDialog({ open: true, ex: null, groupId: group.id })}
                    >
                      <Plus className="size-4" />
                      Add exercise
                    </Button>
                    <div className="flex-1" />
                    <Button variant="ghost" size="sm" onClick={() => setGroupDialog({ open: true, group })}>
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground"
                      onClick={() => handleDeleteGroup(group)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )
        })}
      </div>

      <GroupDialog
        state={groupDialog}
        onClose={() => setGroupDialog({ open: false, group: null })}
        existingCount={muscleGroups.length}
        onSaved={refresh}
      />
      <ExerciseDialog
        state={exDialog}
        groups={muscleGroups}
        onClose={() => setExDialog({ open: false, ex: null, groupId: "" })}
        existingCount={exercises.length}
        onSaved={refresh}
      />
      <VideoDialog
        open={!!videoFor}
        onOpenChange={(o) => !o && setVideoFor(null)}
        exercise={videoFor}
        onChanged={refresh}
      />
    </div>
  )
}

function GroupDialog({
  state,
  onClose,
  existingCount,
  onSaved,
}: {
  state: { open: boolean; group: MuscleGroup | null }
  onClose: () => void
  existingCount: number
  onSaved: () => Promise<void>
}) {
  const [name, setName] = useState("")

  useEffect(() => {
    if (state.open) setName(state.group?.name ?? "")
  }, [state.open, state.group])

  const save = async () => {
    if (!name.trim()) {
      toast.error("Enter a group name")
      return
    }
    if (state.group) {
      await putMuscleGroup({ ...state.group, name: name.trim() })
    } else {
      await putMuscleGroup({
        id: uid(),
        name: name.trim(),
        color: existingCount % 5,
        order: existingCount,
      })
    }
    await onSaved()
    onClose()
    toast.success("Group saved")
  }

  return (
    <Dialog open={state.open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{state.group ? "Edit group" : "New muscle group"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="group-name">Name</Label>
          <Input
            id="group-name"
            value={name}
            placeholder="e.g. Glutes, Back, Core"
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ExerciseDialog({
  state,
  groups,
  onClose,
  existingCount,
  onSaved,
}: {
  state: { open: boolean; ex: Exercise | null; groupId: string }
  groups: MuscleGroup[]
  onClose: () => void
  existingCount: number
  onSaved: () => Promise<void>
}) {
  const { exercises } = useData()
  const [name, setName] = useState("")
  const [notes, setNotes] = useState("")
  const [groupId, setGroupId] = useState("")
  const [bodyweight, setBodyweight] = useState(false)

  useEffect(() => {
    if (state.open) {
      setName(state.ex?.name ?? "")
      setNotes(state.ex?.notes ?? "")
      setGroupId(state.ex?.muscleGroupId ?? state.groupId)
      setBodyweight(state.ex?.bodyweight ?? false)
    }
  }, [state.open, state.ex, state.groupId])

  const save = async () => {
    if (!name.trim() || !groupId) {
      toast.error("Enter a name and group")
      return
    }

    if (state.ex) {
      await putExercise({
        ...state.ex,
        name: name.trim(),
        notes: notes.trim() || undefined,
        muscleGroupId: groupId,
        bodyweight,
      })
    } else {
      await putExercise({
        id: uid(),
        muscleGroupId: groupId,
        name: name.trim(),
        notes: notes.trim() || undefined,
        bodyweight,
        order: existingCount,
      })
    }

    await onSaved()
    onClose()
    toast.success("Exercise saved")
  }

  return (
    <Dialog open={state.open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{state.ex ? "Edit exercise" : "New exercise"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ex-name">Name</Label>
            <Input
              id="ex-name"
              value={name}
              placeholder="e.g. Hip Thrust"
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Muscle group</Label>
            <Select value={groupId} onValueChange={(v) => setGroupId(v ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(value) => groups.find((g) => g.id === value)?.name ?? "Select group"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={bodyweight}
            onClick={() => setBodyweight((b) => !b)}
            className="flex w-full items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5 text-left"
          >
            <span>
              <span className="block text-sm font-medium">Bodyweight exercise</span>
              <span className="block text-xs text-muted-foreground">
                Rep-only (pull-ups, push-ups, dips) — no weight is logged
              </span>
            </span>
            <span
              className={cn(
                "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                bodyweight ? "bg-primary" : "bg-muted",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 size-5 rounded-full bg-background shadow transition-transform",
                  bodyweight ? "translate-x-[1.375rem]" : "translate-x-0.5",
                )}
              />
            </span>
          </button>
          <div className="space-y-2">
            <Label htmlFor="ex-notes">Notes (optional)</Label>
            <Textarea
              id="ex-notes"
              value={notes}
              placeholder="Cues, tempo, setup…"
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
