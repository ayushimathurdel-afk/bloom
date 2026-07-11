import { openDB, type DBSchema, type IDBPDatabase } from "idb"
import type {
  MuscleGroup,
  Exercise,
  ExerciseVideo,
  LogEntry,
  WorkoutSplit,
  Settings,
  BodyWeightEntry,
} from "./types"

interface BloomDB extends DBSchema {
  muscleGroups: {
    key: string
    value: MuscleGroup
  }
  exercises: {
    key: string
    value: Exercise
    indexes: { byMuscleGroup: string }
  }
  videos: {
    key: string
    value: ExerciseVideo
    indexes: { byExercise: string }
  }
  logs: {
    key: string
    value: LogEntry
    indexes: { byDate: string; byExercise: string }
  }
  splits: {
    key: string
    value: WorkoutSplit
  }
  settings: {
    key: string
    value: Settings
  }
  bodyWeights: {
    key: string
    value: BodyWeightEntry
  }
}

const DB_NAME = "bloom-fitness"
const DB_VERSION = 2

let dbPromise: Promise<IDBPDatabase<BloomDB>> | null = null

function getDB() {
  if (typeof window === "undefined") {
    throw new Error("IndexedDB is only available in the browser")
  }
  if (!dbPromise) {
    dbPromise = openDB<BloomDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("muscleGroups")) {
          db.createObjectStore("muscleGroups", { keyPath: "id" })
        }
        if (!db.objectStoreNames.contains("exercises")) {
          const s = db.createObjectStore("exercises", { keyPath: "id" })
          s.createIndex("byMuscleGroup", "muscleGroupId")
        }
        if (!db.objectStoreNames.contains("videos")) {
          const s = db.createObjectStore("videos", { keyPath: "id" })
          s.createIndex("byExercise", "exerciseId")
        }
        if (!db.objectStoreNames.contains("logs")) {
          const s = db.createObjectStore("logs", { keyPath: "id" })
          s.createIndex("byDate", "date")
          s.createIndex("byExercise", "exerciseId")
        }
        if (!db.objectStoreNames.contains("splits")) {
          db.createObjectStore("splits", { keyPath: "id" })
        }
        if (!db.objectStoreNames.contains("settings")) {
          db.createObjectStore("settings", { keyPath: "key" })
        }
        if (!db.objectStoreNames.contains("bodyWeights")) {
          db.createObjectStore("bodyWeights", { keyPath: "date" })
        }
      },
    })
  }
  return dbPromise
}

export function uid() {
  return crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36)
}

/* ---------------- Muscle Groups ---------------- */
export async function getMuscleGroups(): Promise<MuscleGroup[]> {
  const db = await getDB()
  const all = await db.getAll("muscleGroups")
  return all.sort((a, b) => a.order - b.order)
}
export async function putMuscleGroup(mg: MuscleGroup) {
  const db = await getDB()
  await db.put("muscleGroups", mg)
}
export async function deleteMuscleGroup(id: string) {
  const db = await getDB()
  const tx = db.transaction(["muscleGroups", "exercises"], "readwrite")
  await tx.objectStore("muscleGroups").delete(id)
  const exStore = tx.objectStore("exercises")
  const exs = await exStore.index("byMuscleGroup").getAll(id)
  for (const e of exs) await exStore.delete(e.id)
  await tx.done
}

/* ---------------- Exercises ---------------- */
export async function getExercises(): Promise<Exercise[]> {
  const db = await getDB()
  const all = await db.getAll("exercises")
  return all.sort((a, b) => a.order - b.order)
}
export async function putExercise(ex: Exercise) {
  const db = await getDB()
  await db.put("exercises", ex)
}
export async function deleteExercise(id: string) {
  const db = await getDB()
  const tx = db.transaction(["exercises", "videos"], "readwrite")
  await tx.objectStore("exercises").delete(id)
  await tx.objectStore("videos").delete(id)
  await tx.done
}

/* ---------------- Videos (on-device) ---------------- */
export async function putVideo(video: ExerciseVideo) {
  const db = await getDB()
  await db.put("videos", video)
  const ex = await db.get("exercises", video.exerciseId)
  if (ex) await db.put("exercises", { ...ex, hasVideo: true })
}
export async function getVideo(exerciseId: string): Promise<ExerciseVideo | undefined> {
  const db = await getDB()
  return db.get("videos", exerciseId)
}
export async function deleteVideo(exerciseId: string) {
  const db = await getDB()
  await db.delete("videos", exerciseId)
  const ex = await db.get("exercises", exerciseId)
  if (ex) await db.put("exercises", { ...ex, hasVideo: false })
}

/* ---------------- Logs ---------------- */
export async function getLogsByDate(date: string): Promise<LogEntry[]> {
  const db = await getDB()
  const logs = await db.getAllFromIndex("logs", "byDate", date)
  return logs.sort((a, b) => a.createdAt - b.createdAt)
}
export async function getLogsByExercise(exerciseId: string): Promise<LogEntry[]> {
  const db = await getDB()
  const logs = await db.getAllFromIndex("logs", "byExercise", exerciseId)
  return logs.sort((a, b) => a.date.localeCompare(b.date))
}
export async function getAllLogs(): Promise<LogEntry[]> {
  const db = await getDB()
  return db.getAll("logs")
}
/** The single most recently created log entry — used to default the next log's muscle group. */
export async function getMostRecentLog(): Promise<LogEntry | undefined> {
  const logs = await getAllLogs()
  if (logs.length === 0) return undefined
  return logs.reduce((best, cur) => (cur.createdAt > best.createdAt ? cur : best))
}
/** The existing log entry for a given exercise on a specific day, if any. */
export async function getLogForDateExercise(date: string, exerciseId: string): Promise<LogEntry | undefined> {
  const logs = await getLogsByDate(date)
  // Sorted by createdAt asc — the earliest entry is the canonical one to append to.
  return logs.find((l) => l.exerciseId === exerciseId)
}
/** Most recent prior log of an exercise — used to prefill a starting reference point. */
export async function getLatestLogForExercise(
  exerciseId: string,
  excludeDate?: string,
): Promise<LogEntry | undefined> {
  const logs = await getLogsByExercise(exerciseId)
  const candidates = excludeDate ? logs.filter((l) => l.date !== excludeDate) : logs
  if (candidates.length === 0) return undefined
  // getLogsByExercise sorts by date asc; pick the latest by date then createdAt.
  return candidates.reduce((best, cur) => {
    if (cur.date > best.date) return cur
    if (cur.date === best.date && cur.createdAt > best.createdAt) return cur
    return best
  })
}
export async function putLog(log: LogEntry) {
  const db = await getDB()
  await db.put("logs", log)
}
export async function deleteLog(id: string) {
  const db = await getDB()
  await db.delete("logs", id)
}

/* ---------------- Splits ---------------- */
export async function getSplits(): Promise<WorkoutSplit[]> {
  const db = await getDB()
  const all = await db.getAll("splits")
  return all.sort((a, b) => a.createdAt - b.createdAt)
}
export async function putSplit(split: WorkoutSplit) {
  const db = await getDB()
  await db.put("splits", split)
}
export async function deleteSplit(id: string) {
  const db = await getDB()
  await db.delete("splits", id)
}

/* ---------------- Body weight ---------------- */
export async function getBodyWeights(): Promise<BodyWeightEntry[]> {
  const db = await getDB()
  const all = await db.getAll("bodyWeights")
  return all.sort((a, b) => a.date.localeCompare(b.date))
}
export async function getBodyWeight(date: string): Promise<BodyWeightEntry | undefined> {
  const db = await getDB()
  return db.get("bodyWeights", date)
}
export async function putBodyWeight(entry: BodyWeightEntry) {
  const db = await getDB()
  await db.put("bodyWeights", entry)
}
export async function deleteBodyWeight(date: string) {
  const db = await getDB()
  await db.delete("bodyWeights", date)
}

/* ---------------- Settings ---------------- */
export async function getSetting<T = unknown>(key: string): Promise<T | undefined> {
  const db = await getDB()
  const row = await db.get("settings", key)
  return row?.value as T | undefined
}
export async function setSetting(key: string, value: unknown) {
  const db = await getDB()
  await db.put("settings", { key, value })
}

/* ---------------- Backup / Restore ---------------- */
export interface BackupData {
  muscleGroups: MuscleGroup[]
  exercises: Exercise[]
  splits: WorkoutSplit[]
  logs: LogEntry[]
  settings: Settings[]
  bodyWeights: BodyWeightEntry[]
}

export async function getAllVideos(): Promise<ExerciseVideo[]> {
  const db = await getDB()
  return db.getAll("videos")
}

export async function getAllSettings(): Promise<Settings[]> {
  const db = await getDB()
  return db.getAll("settings")
}

/** Gather every store (except video blobs) for a full backup. */
export async function getBackupData(): Promise<BackupData> {
  const [muscleGroups, exercises, splits, logs, settings, bodyWeights] = await Promise.all([
    getMuscleGroups(),
    getExercises(),
    getSplits(),
    getAllLogs(),
    getAllSettings(),
    getBodyWeights(),
  ])
  return { muscleGroups, exercises, splits, logs, settings, bodyWeights }
}

/** Replace all data with the contents of a backup (videos restored from their blobs). */
export async function restoreBackup(data: BackupData, videos: ExerciseVideo[]) {
  const db = await getDB()
  const tx = db.transaction(
    ["muscleGroups", "exercises", "videos", "logs", "splits", "settings", "bodyWeights"],
    "readwrite",
  )
  await Promise.all([
    tx.objectStore("muscleGroups").clear(),
    tx.objectStore("exercises").clear(),
    tx.objectStore("videos").clear(),
    tx.objectStore("logs").clear(),
    tx.objectStore("splits").clear(),
    tx.objectStore("settings").clear(),
    tx.objectStore("bodyWeights").clear(),
  ])
  for (const mg of data.muscleGroups) tx.objectStore("muscleGroups").put(mg)
  for (const ex of data.exercises) tx.objectStore("exercises").put(ex)
  for (const sp of data.splits) tx.objectStore("splits").put(sp)
  for (const log of data.logs) tx.objectStore("logs").put(log)
  for (const s of data.settings) tx.objectStore("settings").put(s)
  for (const bw of data.bodyWeights) tx.objectStore("bodyWeights").put(bw)
  for (const v of videos) tx.objectStore("videos").put(v)
  await tx.done
}

/* ---------------- Storage estimate ---------------- */
export async function getStorageEstimate() {
  if (typeof navigator !== "undefined" && navigator.storage?.estimate) {
    return navigator.storage.estimate()
  }
  return { usage: 0, quota: 0 }
}
