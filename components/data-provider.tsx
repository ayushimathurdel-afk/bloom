"use client"

import { createContext, useCallback, useContext, useEffect, useState } from "react"
import type { AutoLoadSet, Exercise, MuscleGroup, WeightUnit, WorkoutSplit } from "@/lib/types"
import { getExercises, getMuscleGroups, getSetting, getSplits, setSetting as dbSetSetting } from "@/lib/db"
import { seedIfEmpty } from "@/lib/seed"
import { runMigrations } from "@/lib/migrations"
import { type AppIconConfig, DEFAULT_APP_ICON } from "@/components/app-icon"

interface DataContextValue {
  ready: boolean
  muscleGroups: MuscleGroup[]
  exercises: Exercise[]
  splits: WorkoutSplit[]
  goal: string
  appName: string
  activeSplitId: string | null
  appIcon: AppIconConfig
  weightUnit: WeightUnit
  autoLoadSet: AutoLoadSet
  /** When a split day is chosen, skip the muscle-group dropdown and pick exercises directly. */
  skipGroupWhenSplit: boolean
  refresh: () => Promise<void>
  setGoal: (goal: string) => Promise<void>
  setAppName: (name: string) => Promise<void>
  setActiveSplitId: (id: string | null) => Promise<void>
  setAppIcon: (icon: AppIconConfig) => Promise<void>
  setWeightUnit: (unit: WeightUnit) => Promise<void>
  setAutoLoadSet: (mode: AutoLoadSet) => Promise<void>
  setSkipGroupWhenSplit: (value: boolean) => Promise<void>
}

const DataContext = createContext<DataContextValue | null>(null)

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [splits, setSplits] = useState<WorkoutSplit[]>([])
  const [goal, setGoalState] = useState<string>("Fat loss & strength training")
  const [appName, setAppNameState] = useState<string>("Bloom")
  const [activeSplitId, setActiveSplitIdState] = useState<string | null>(null)
  const [appIcon, setAppIconState] = useState<AppIconConfig>(DEFAULT_APP_ICON)
  const [weightUnit, setWeightUnitState] = useState<WeightUnit>("kg")
  const [autoLoadSet, setAutoLoadSetState] = useState<AutoLoadSet>("first")
  const [skipGroupWhenSplit, setSkipGroupWhenSplitState] = useState(false)

  const refresh = useCallback(async () => {
    const [mg, ex, sp, g, name, as, icon, unit, autoLoad, skipGroup] = await Promise.all([
      getMuscleGroups(),
      getExercises(),
      getSplits(),
      getSetting<string>("goal"),
      getSetting<string>("appName"),
      getSetting<string>("activeSplitId"),
      getSetting<AppIconConfig>("appIcon"),
      getSetting<WeightUnit>("weightUnit"),
      getSetting<AutoLoadSet>("autoLoadSet"),
      getSetting<boolean>("skipGroupWhenSplit"),
    ])
    setMuscleGroups(mg)
    setExercises(ex)
    setSplits(sp)
    if (g) setGoalState(g)
    if (name) setAppNameState(name)
    setActiveSplitIdState(as ?? (sp[0]?.id ?? null))
    if (icon) setAppIconState(icon)
    if (unit) setWeightUnitState(unit)
    if (autoLoad) setAutoLoadSetState(autoLoad)
    if (typeof skipGroup === "boolean") setSkipGroupWhenSplitState(skipGroup)
  }, [])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      await seedIfEmpty()
      await runMigrations()
      if (!mounted) return
      await refresh()
      if (mounted) setReady(true)
    })()
    return () => {
      mounted = false
    }
  }, [refresh])

  const setGoal = useCallback(async (g: string) => {
    await dbSetSetting("goal", g)
    setGoalState(g)
  }, [])

  const setAppName = useCallback(async (name: string) => {
    const clean = name.trim() || "Bloom"
    await dbSetSetting("appName", clean)
    setAppNameState(clean)
  }, [])

  // Keep the browser/tab title in sync with the chosen app name.
  useEffect(() => {
    if (typeof document !== "undefined") document.title = appName
  }, [appName])

  const setActiveSplitId = useCallback(async (id: string | null) => {
    await dbSetSetting("activeSplitId", id)
    setActiveSplitIdState(id)
  }, [])

  const setAppIcon = useCallback(async (icon: AppIconConfig) => {
    await dbSetSetting("appIcon", icon)
    setAppIconState(icon)
  }, [])

  const setWeightUnit = useCallback(async (unit: WeightUnit) => {
    await dbSetSetting("weightUnit", unit)
    setWeightUnitState(unit)
  }, [])

  const setAutoLoadSet = useCallback(async (mode: AutoLoadSet) => {
    await dbSetSetting("autoLoadSet", mode)
    setAutoLoadSetState(mode)
  }, [])

  const setSkipGroupWhenSplit = useCallback(async (value: boolean) => {
    await dbSetSetting("skipGroupWhenSplit", value)
    setSkipGroupWhenSplitState(value)
  }, [])

  // Reflect a custom uploaded icon in the browser tab favicon.
  useEffect(() => {
    if (typeof document === "undefined") return
    if (appIcon.type !== "custom" || !appIcon.value) return
    let link = document.querySelector<HTMLLinkElement>("link[rel='icon']")
    if (!link) {
      link = document.createElement("link")
      link.rel = "icon"
      document.head.appendChild(link)
    }
    link.href = appIcon.value
  }, [appIcon])

  return (
    <DataContext.Provider
      value={{
        ready,
        muscleGroups,
        exercises,
        splits,
        goal,
        appName,
        activeSplitId,
        appIcon,
        weightUnit,
        autoLoadSet,
        skipGroupWhenSplit,
        refresh,
        setGoal,
        setAppName,
        setActiveSplitId,
        setAppIcon,
        setWeightUnit,
        setAutoLoadSet,
        setSkipGroupWhenSplit,
      }}
    >
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error("useData must be used within DataProvider")
  return ctx
}
