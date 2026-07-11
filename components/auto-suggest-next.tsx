"use client"

import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import type { Exercise, SplitDay } from "@/lib/types"
import { ChevronRight, Lightbulb } from "lucide-react"

interface Props {
  splitDay: SplitDay | null
  allExercises: Exercise[]
  loggedExerciseIds: string[]
  onSelectExercise: (exerciseId: string) => void
}

export function AutoSuggestNext({ splitDay, allExercises, loggedExerciseIds, onSelectExercise }: Props) {
  const nextExercise = useMemo(() => {
    if (!splitDay || !splitDay.exerciseIds) return null

    // Find the first unlogged exercise from the split
    const unlogged = splitDay.exerciseIds.find((id) => !loggedExerciseIds.includes(id))
    if (!unlogged) return null

    return allExercises.find((e) => e.id === unlogged)
  }, [splitDay, allExercises, loggedExerciseIds])

  if (!nextExercise) return null

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="w-full gap-2 bg-accent/50 hover:bg-accent"
      onClick={() => onSelectExercise(nextExercise.id)}
    >
      <Lightbulb className="size-4" />
      Next: {nextExercise.name}
      <ChevronRight className="size-4 ml-auto" />
    </Button>
  )
}
