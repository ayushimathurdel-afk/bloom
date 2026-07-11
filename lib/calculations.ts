/**
 * Calculate estimated one-rep max using Epley formula
 * 1RM = weight × (1 + reps/30)
 */
export function estimateOneRepMax(weight: number, reps: number): number {
  if (reps === 1) return weight
  if (weight <= 0 || reps <= 0) return 0
  return Math.round(weight * (1 + reps / 30) * 100) / 100
}

/**
 * Calculate set volume (weight × reps)
 */
export function calculateVolume(weight: number, reps: number): number {
  return weight * reps
}

/**
 * Calculate total workout volume
 */
export function calculateTotalVolume(sets: Array<{ weight: number; reps: number }>): number {
  return sets.reduce((total, set) => total + calculateVolume(set.weight, set.reps), 0)
}

/**
 * Format weight value, handling both kg and lbs
 */
export function formatWeight(weight: number, unit: "kg" | "lbs" = "kg"): string {
  return `${weight.toLocaleString()} ${unit}`
}

/**
 * Calculate volume progression between two dates
 */
export function getVolumeProgression(
  currentVolume: number,
  previousVolume: number
): {
  change: number
  percentChange: number
  isIncrease: boolean
} {
  const change = currentVolume - previousVolume
  const percentChange = previousVolume > 0 ? Math.round((change / previousVolume) * 100 * 100) / 100 : 0
  return {
    change: Math.round(change * 100) / 100,
    percentChange,
    isIncrease: change >= 0,
  }
}

/**
 * Format date for display
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

/**
 * Format date with time
 */
export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

/**
 * Get date range labels
 */
export function getDateRangeLabel(startDate: Date, endDate: Date): string {
  const start = formatDate(startDate)
  const end = formatDate(endDate)
  return `${start} - ${end}`
}
