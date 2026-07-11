export function toKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function fromKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number)
  return new Date(y, m - 1, d)
}

export function todayKey(): string {
  return toKey(new Date())
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

export function isSameDay(a: Date, b: Date): boolean {
  return toKey(a) === toKey(b)
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

export function weekdayShort(d: Date): string {
  return WEEKDAYS[d.getDay()]
}

export function monthName(d: Date): string {
  return MONTHS[d.getMonth()]
}

export function formatLong(d: Date): string {
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`
}

/** Returns a 6x7 grid of dates covering the month of `d`, week starting Monday. */
export function monthGrid(d: Date): Date[] {
  const first = startOfMonth(d)
  // Convert Sunday=0 to Monday=0 indexing
  const offset = (first.getDay() + 6) % 7
  const start = addDays(first, -offset)
  const grid: Date[] = []
  for (let i = 0; i < 42; i++) grid.push(addDays(start, i))
  return grid
}

export const WEEK_LABELS = ["M", "T", "W", "T", "F", "S", "S"]
