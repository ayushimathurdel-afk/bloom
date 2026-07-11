import {
  deleteLog,
  getAllLogs,
  getExercises,
  getMuscleGroups,
  getSetting,
  getSplits,
  putExercise,
  putLog,
  putMuscleGroup,
  putSplit,
  setSetting,
  uid,
} from "./db"
import type { LogEntry } from "./types"

const MIGRATION_KEY = "migration_split_groups_v1"
const MERGE_LOGS_KEY = "migration_merge_logs_v1"

/** Run every pending one-time migration. Each guards itself with its own key. */
export async function runMigrations() {
  if (typeof window === "undefined") return
  await migrateSplitGroups()
  await mergeDuplicateLogs()
}

/**
 * One-time migration for existing installs:
 * - "Chest & Shoulders" -> "Chest" (kept) + "Shoulders" (new)
 * - "Arms" -> "Biceps" (kept) + "Triceps" (new)
 * Exercises are reassigned by name, logs are repointed to their exercise's
 * current group, and any split day referencing the original group also gets
 * the new sibling group added.
 */
async function migrateSplitGroups() {
  const done = await getSetting<boolean>(MIGRATION_KEY)
  if (done) return

  const groups = await getMuscleGroups()
  const exercises = await getExercises()
  let maxOrder = groups.reduce((m, g) => Math.max(m, g.order), 0)

  // original group id -> sibling group ids to add into splits alongside it
  const splitAdditions: Record<string, string[]> = {}

  async function createGroup(name: string, color: number): Promise<string> {
    const id = uid()
    await putMuscleGroup({ id, name, color, order: ++maxOrder })
    return id
  }

  // 1) Chest & Shoulders -> Chest (rename, same id) + Shoulders (new)
  const cs = groups.find((g) => g.name === "Chest & Shoulders")
  if (cs) {
    await putMuscleGroup({ ...cs, name: "Chest" })
    const shouldersId = await createGroup("Shoulders", 1)
    for (const ex of exercises.filter((e) => e.muscleGroupId === cs.id)) {
      if (/shoulder|delt|lateral raise|front raise|overhead press|arnold/i.test(ex.name)) {
        await putExercise({ ...ex, muscleGroupId: shouldersId })
      }
    }
    splitAdditions[cs.id] = [shouldersId]
  }

  // 2) Arms -> Biceps (rename, same id) + Triceps (new)
  const arms = groups.find((g) => g.name === "Arms")
  if (arms) {
    await putMuscleGroup({ ...arms, name: "Biceps" })
    const tricepsId = await createGroup("Triceps", 2)
    for (const ex of exercises.filter((e) => e.muscleGroupId === arms.id)) {
      if (/tricep|pushdown|dip|skull|overhead extension/i.test(ex.name)) {
        await putExercise({ ...ex, muscleGroupId: tricepsId })
      }
    }
    splitAdditions[arms.id] = [tricepsId]
  }

  if (!cs && !arms) {
    await setSetting(MIGRATION_KEY, true)
    return
  }

  // 3) Repoint logs to their exercise's current group.
  const freshExercises = await getExercises()
  const exMap = new Map(freshExercises.map((e) => [e.id, e.muscleGroupId]))
  for (const log of await getAllLogs()) {
    const correct = exMap.get(log.exerciseId)
    if (correct && correct !== log.muscleGroupId) {
      await putLog({ ...log, muscleGroupId: correct })
    }
  }

  // 4) Add the new sibling group to any split day that had the original.
  for (const split of await getSplits()) {
    let changed = false
    const days = split.days.map((day) => {
      const ids = [...day.muscleGroupIds]
      for (const [origId, additions] of Object.entries(splitAdditions)) {
        if (ids.includes(origId)) {
          for (const addId of additions) {
            if (!ids.includes(addId)) {
              ids.push(addId)
              changed = true
            }
          }
        }
      }
      return { ...day, muscleGroupIds: ids }
    })
    if (changed) await putSplit({ ...split, days })
  }

  await setSetting(MIGRATION_KEY, true)
}

/**
 * One-time migration: collapse multiple log entries for the same exercise on the
 * same day into a single entry, so each exercise shows in one card. Sets are
 * concatenated in chronological order and notes are joined.
 */
async function mergeDuplicateLogs() {
  const done = await getSetting<boolean>(MERGE_LOGS_KEY)
  if (done) return

  const byKey = new Map<string, LogEntry[]>()
  for (const log of await getAllLogs()) {
    const key = `${log.date}__${log.exerciseId}`
    const arr = byKey.get(key) ?? []
    arr.push(log)
    byKey.set(key, arr)
  }

  for (const entries of byKey.values()) {
    if (entries.length < 2) continue
    entries.sort((a, b) => a.createdAt - b.createdAt)
    const [first, ...rest] = entries
    const merged: LogEntry = {
      ...first,
      sets: entries.flatMap((e) => e.sets),
      note: entries.map((e) => (typeof e.note === "string" ? e.note.trim() : "")).filter(Boolean).join(" • ") || undefined,
    }
    await putLog(merged)
    for (const dupe of rest) await deleteLog(dupe.id)
  }

  await setSetting(MERGE_LOGS_KEY, true)
}
