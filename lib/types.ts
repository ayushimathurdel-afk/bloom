export interface MuscleGroup {
  id: string
  name: string
  /** Hue index 0-4 mapping to chart colors, for soft visual grouping */
  color: number
  order: number
}

export interface Exercise {
  id: string
  muscleGroupId: string
  name: string
  notes?: string
  /** Whether a demonstration video is stored on-device for this exercise */
  hasVideo?: boolean
  /** Optional external demo video link (YouTube, Instagram, etc.) */
  videoUrl?: string
  /** Rep-only exercise (pull-ups, push-ups, dips) — no weight is recorded */
  bodyweight?: boolean
  order: number
  /** Parent exercise ID if this is a variant; undefined if main or standalone. */
  variantOf?: string
  /** ID of the main variant if this exercise leads a variant group. */
  mainVariantId?: string
  /** Name of the variant group (e.g., "Bench Press variations"). Only set on main variant. */
  variantGroupName?: string
  /** Shared note for the entire variant group (only set on main variant). */
  variantGroupNote?: string
  /** Individual note for this specific variant. */
  variantNote?: string
}

/** A demonstration video stored entirely on the device (no cloud) */
export interface ExerciseVideo {
  id: string // same as exerciseId
  exerciseId: string
  blob: Blob
  fileName: string
  addedAt: number
}

export type WeightUnit = "kg" | "lbs"

/** Which set from the previous session to pre-fill as a starting reference. */
export type AutoLoadSet = "first" | "last" | "off"

export interface WorkoutSet {
  reps: number
  weight: number
  /** Unit the weight was entered in — matches the plates on the machine. Defaults to kg. */
  unit?: WeightUnit
  /** Whether this set was a dropset (lighter weight with continued reps) */
  isDropset?: boolean
}

/** One logged exercise on a given day */
export interface LogEntry {
  id: string
  date: string // YYYY-MM-DD
  exerciseId: string
  muscleGroupId: string
  sets: WorkoutSet[]
  note?: string
  createdAt: number
}

export interface SplitDay {
  id: string
  name: string // e.g. "Lower Body", "Push", "Rest"
  muscleGroupIds: string[]
  exerciseIds: string[]
  /** Marks this day as a dedicated rest day */
  isRest?: boolean
}

/** A body-weight measurement logged for a given day (stored on-device) */
export interface BodyWeightEntry {
  date: string // YYYY-MM-DD (key)
  weight: number
  createdAt: number
}

export interface WorkoutSplit {
  id: string
  name: string // e.g. "Glutes & Strength 4-Day"
  description?: string
  days: SplitDay[]
  createdAt: number
}

export interface Settings {
  key: string
  value: unknown
}
