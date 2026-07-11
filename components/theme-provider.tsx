"use client"

import { createContext, useCallback, useContext, useEffect, useState } from "react"

export type ThemeMode = "light" | "dark" | "system"
export type CornerStyle = "rounded" | "squared"
export type Accent =
  | "mauve"
  | "lilac"
  | "maroon"
  | "sage"
  | "teal"
  | "blue"
  | "plum"
  | "rose"
  | "clay"
  | "amber"
  | "slate"
  | "mono"

export const ACCENTS: { id: Accent; label: string; swatch: string }[] = [
  { id: "mauve", label: "Mauve", swatch: "oklch(0.58 0.072 350)" },
  { id: "lilac", label: "Lilac", swatch: "oklch(0.6 0.085 300)" },
  { id: "plum", label: "Plum", swatch: "oklch(0.5 0.1 330)" },
  { id: "rose", label: "Rose", swatch: "oklch(0.6 0.12 12)" },
  { id: "maroon", label: "Maroon", swatch: "oklch(0.47 0.12 22)" },
  { id: "clay", label: "Clay", swatch: "oklch(0.6 0.08 45)" },
  { id: "amber", label: "Amber", swatch: "oklch(0.66 0.11 75)" },
  { id: "sage", label: "Sage", swatch: "oklch(0.56 0.05 155)" },
  { id: "teal", label: "Teal", swatch: "oklch(0.56 0.07 190)" },
  { id: "blue", label: "Dusty Blue", swatch: "oklch(0.56 0.06 245)" },
  { id: "slate", label: "Slate", swatch: "oklch(0.52 0.03 255)" },
  { id: "mono", label: "Grayscale", swatch: "oklch(0.32 0 0)" },
]

const MODE_KEY = "bloom-theme"
const ACCENT_KEY = "bloom-accent"
const RANDOM_KEY = "bloom-accent-random"
const CORNER_KEY = "bloom-corner"

interface ThemeContextValue {
  mode: ThemeMode
  accent: Accent
  cornerStyle: CornerStyle
  randomDaily: boolean
  setMode: (m: ThemeMode) => void
  setAccent: (a: Accent) => void
  setCornerStyle: (c: CornerStyle) => void
  setRandomDaily: (v: boolean) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function applyMode(mode: ThemeMode) {
  if (typeof document === "undefined") return
  const isDark =
    mode === "dark" || (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)
  document.documentElement.classList.toggle("dark", isDark)
}

function applyAccent(accent: Accent) {
  if (typeof document === "undefined") return
  document.documentElement.setAttribute("data-accent", accent)
}

function applyCornerStyle(style: CornerStyle) {
  if (typeof document === "undefined") return
  document.documentElement.setAttribute("data-corner", style)
}

/** Local YYYY-M-D string — must match the pre-paint script in layout.tsx. */
function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

/**
 * Deterministically pick an accent for a given day. The same date always yields
 * the same accent (no flicker / re-rolling within a day) but it changes daily.
 * The hash MUST match the inline script in layout.tsx so the pre-paint accent
 * and the React state agree.
 */
function dailyAccent(dateStr: string): Accent {
  let h = 0
  for (let i = 0; i < dateStr.length; i++) h = (h * 31 + dateStr.charCodeAt(i)) >>> 0
  return ACCENTS[h % ACCENTS.length].id
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("system")
  const [accent, setAccentState] = useState<Accent>("mauve")
  const [cornerStyle, setCornerStyleState] = useState<CornerStyle>("rounded")
  const [randomDaily, setRandomDailyState] = useState(false)

  // Hydrate from localStorage (already applied pre-paint by the inline script).
  useEffect(() => {
    const m = (localStorage.getItem(MODE_KEY) as ThemeMode) || "system"
    const random = localStorage.getItem(RANDOM_KEY) === "1"
    const c = (localStorage.getItem(CORNER_KEY) as CornerStyle) || "rounded"
    setModeState(m)
    setRandomDailyState(random)
    setCornerStyleState(c)
    applyCornerStyle(c)
    // When daily-random is on, the live accent is derived from today's date,
    // not the stored value — so the swatch UI reflects what's actually applied.
    const a = random ? dailyAccent(todayKey()) : ((localStorage.getItem(ACCENT_KEY) as Accent) || "mauve")
    setAccentState(a)
    applyAccent(a)
  }, [])

  // While daily-random is on, re-roll when the calendar day flips (covers the
  // app being left open overnight or resumed from the background the next day).
  useEffect(() => {
    if (!randomDaily) return
    const refresh = () => {
      const a = dailyAccent(todayKey())
      setAccentState(a)
      applyAccent(a)
    }
    refresh()
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh()
    }
    document.addEventListener("visibilitychange", onVisible)
    window.addEventListener("focus", refresh)
    const interval = window.setInterval(refresh, 60 * 1000)
    return () => {
      document.removeEventListener("visibilitychange", onVisible)
      window.removeEventListener("focus", refresh)
      window.clearInterval(interval)
    }
  }, [randomDaily])

  // Keep "system" mode in sync with OS preference changes.
  useEffect(() => {
    if (mode !== "system") return
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const onChange = () => applyMode("system")
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [mode])

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m)
    localStorage.setItem(MODE_KEY, m)
    applyMode(m)
  }, [])

  // Manually choosing an accent turns off daily-random — the user is taking control.
  const setAccent = useCallback((a: Accent) => {
    setRandomDailyState(false)
    localStorage.setItem(RANDOM_KEY, "0")
    setAccentState(a)
    localStorage.setItem(ACCENT_KEY, a)
    applyAccent(a)
  }, [])

  const setCornerStyle = useCallback((c: CornerStyle) => {
    setCornerStyleState(c)
    localStorage.setItem(CORNER_KEY, c)
    applyCornerStyle(c)
  }, [])

  const setRandomDaily = useCallback((v: boolean) => {
    setRandomDailyState(v)
    localStorage.setItem(RANDOM_KEY, v ? "1" : "0")
    if (v) {
      const a = dailyAccent(todayKey())
      setAccentState(a)
      applyAccent(a)
    }
  }, [])

  return (
    <ThemeContext.Provider value={{ mode, accent, cornerStyle, randomDaily, setMode, setAccent, setCornerStyle, setRandomDaily }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    console.warn("[v0] useTheme called outside ThemeProvider, returning default values")
    return {
      mode: "system" as ThemeMode,
      accent: "mauve" as Accent,
      cornerStyle: "rounded" as CornerStyle,
      randomDaily: false,
      setMode: () => {},
      setAccent: () => {},
      setCornerStyle: () => {},
      setRandomDaily: () => {},
    }
  }
  return ctx
}
