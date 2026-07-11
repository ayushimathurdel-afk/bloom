import type { Exercise, MuscleGroup, WorkoutSplit } from "./types"
import { getMuscleGroups, putExercise, putMuscleGroup, putSplit, setSetting, uid } from "./db"

interface SeedGroup {
  name: string
  color: number
  exercises: string[]
}

/** Female-oriented defaults: glute/lower-body focus, strength + fat loss */
const SEED: SeedGroup[] = [
  {
    name: "Glutes",
    color: 0,
    exercises: ["Hip Thrust", "Glute Bridge", "Cable Kickback", "Bulgarian Split Squat", "Sumo Deadlift"],
  },
  {
    name: "Legs",
    color: 1,
    exercises: ["Back Squat", "Romanian Deadlift", "Leg Press", "Walking Lunges", "Leg Curl", "Leg Extension"],
  },
  {
    name: "Back",
    color: 2,
    exercises: ["Lat Pulldown", "Seated Row", "Single-Arm Dumbbell Row", "Assisted Pull-Up"],
  },
  {
    name: "Chest",
    color: 3,
    exercises: ["Incline Dumbbell Press", "Chest Press", "Push-Up", "Chest Fly"],
  },
  {
    name: "Shoulders",
    color: 1,
    exercises: ["Shoulder Press", "Lateral Raise", "Front Raise", "Rear Delt Fly"],
  },
  {
    name: "Biceps",
    color: 4,
    exercises: ["Bicep Curl", "Hammer Curl", "Concentration Curl"],
  },
  {
    name: "Triceps",
    color: 2,
    exercises: ["Tricep Rope Pushdown", "Overhead Tricep Extension", "Tricep Dip"],
  },
  {
    name: "Core",
    color: 0,
    exercises: ["Plank", "Hanging Leg Raise", "Cable Crunch", "Russian Twist"],
  },
]

export async function seedIfEmpty() {
  const existing = await getMuscleGroups()
  if (existing.length > 0) return false

  const groupIds: Record<string, string> = {}
  let order = 0
  for (const g of SEED) {
    const id = uid()
    groupIds[g.name] = id
    const mg: MuscleGroup = { id, name: g.name, color: g.color, order: order++ }
    await putMuscleGroup(mg)
    let exOrder = 0
    for (const exName of g.exercises) {
      const ex: Exercise = {
        id: uid(),
        muscleGroupId: id,
        name: exName,
        order: exOrder++,
      }
      await putExercise(ex)
    }
  }

  // A starter women's strength + fat-loss split
  const split: WorkoutSplit = {
    id: uid(),
    name: "Glutes & Strength (4-Day)",
    description: "Lower-body focused split for strength and fat loss.",
    createdAt: Date.now(),
    days: [
      { id: uid(), name: "Lower (Glute Focus)", muscleGroupIds: [groupIds["Glutes"], groupIds["Legs"]], exerciseIds: [] },
      {
        id: uid(),
        name: "Upper Body",
        muscleGroupIds: [
          groupIds["Back"],
          groupIds["Chest"],
          groupIds["Shoulders"],
          groupIds["Biceps"],
          groupIds["Triceps"],
        ],
        exerciseIds: [],
      },
      { id: uid(), name: "Lower (Quad Focus)", muscleGroupIds: [groupIds["Legs"], groupIds["Glutes"]], exerciseIds: [] },
      { id: uid(), name: "Full Body & Core", muscleGroupIds: [groupIds["Glutes"], groupIds["Back"], groupIds["Core"]], exerciseIds: [] },
      { id: uid(), name: "Rest", muscleGroupIds: [], exerciseIds: [], isRest: true },
    ],
  }
  await putSplit(split)

  await setSetting("goal", "Fat loss & strength training")
  await setSetting("seeded", true)
  return true
}
