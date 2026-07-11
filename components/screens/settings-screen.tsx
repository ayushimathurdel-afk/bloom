"use client"

import { useEffect, useRef, useState } from "react"
import {
  HardDrive,
  ShieldCheck,
  Upload,
  Check,
  Sun,
  Moon,
  Monitor,
  Download,
  Archive,
  Loader2,
  Shuffle,
} from "lucide-react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { useData } from "@/components/data-provider"
import { useConfirm } from "@/components/confirm-dialog"
import { useTheme, ACCENTS, type ThemeMode } from "@/components/theme-provider"
import { AppIcon, ICON_PRESETS } from "@/components/app-icon"
import { getStorageEstimate } from "@/lib/db"
import { exportBackup, importBackup, saveBackup } from "@/lib/backup"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

function formatBytes(bytes: number) {
  if (!bytes) return "0 MB"
  const mb = bytes / (1024 * 1024)
  if (mb < 1024) return `${mb.toFixed(1)} MB`
  return `${(mb / 1024).toFixed(2)} GB`
}

export function SettingsScreen() {
  const {
    goal,
    setGoal,
    appName,
    setAppName,
    appIcon,
    setAppIcon,
    weightUnit,
    setWeightUnit,
    autoLoadSet,
    setAutoLoadSet,
    skipGroupWhenSplit,
    setSkipGroupWhenSplit,
    refresh,
  } = useData()
  const { mode, accent, cornerStyle, randomDaily, setMode, setAccent, setCornerStyle, setRandomDaily } = useTheme()
  const confirm = useConfirm()
  const [usage, setUsage] = useState<{ usage: number; quota: number } | null>(null)
  const [nameDraft, setNameDraft] = useState(appName)
  const [goalDraft, setGoalDraft] = useState(goal)
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const backupRef = useRef<HTMLInputElement>(null)

  async function handleExport() {
    setExporting(true)
    try {
      const blob = await exportBackup()
      const result = await saveBackup(blob)
      if (result.method === "shared") {
        toast.success("Backup ready — choose where to save it.", {
          description: `Pick Files, Drive or any app from the share sheet to keep ${result.fileName}.`,
        })
      } else {
        toast.success("Backup downloaded.", {
          description: `Saved as ${result.fileName} to your downloads.`,
        })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (/cancel|dismiss|abort/i.test(msg)) {
        setExporting(false)
        return
      }
      console.log("[v0] export backup failed:", err)
      toast.error("Couldn't export backup.")
    } finally {
      setExporting(false)
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    const ok = await confirm({
      title: "Restore from backup?",
      description: "This replaces all current exercises, splits, logs and videos with the backup's contents.",
      confirmLabel: "Restore",
      destructive: true,
    })
    if (!ok) return
    setImporting(true)
    try {
      await importBackup(file)
      await refresh()
      toast.success("Backup restored.")
    } catch (err) {
      console.log("[v0] import backup failed:", err)
      toast.error(err instanceof Error ? err.message : "Couldn't import this file.")
    } finally {
      setImporting(false)
    }
  }

  useEffect(() => {
    setNameDraft(appName)
  }, [appName])
  useEffect(() => {
    setGoalDraft(goal)
  }, [goal])

  const MODES: { id: ThemeMode; label: string; Icon: typeof Sun }[] = [
    { id: "light", label: "Light", Icon: Sun },
    { id: "dark", label: "Dark", Icon: Moon },
    { id: "system", label: "System", Icon: Monitor },
  ]

  useEffect(() => {
    getStorageEstimate().then((e) => setUsage({ usage: e.usage ?? 0, quota: e.quota ?? 0 }))
  }, [])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.")
      return
    }
    if (file.size > 1.5 * 1024 * 1024) {
      toast.error("Image is too large. Pick one under 1.5 MB.")
      return
    }
    const reader = new FileReader()
    reader.onload = async () => {
      await setAppIcon({ type: "custom", value: String(reader.result) })
      toast.success("App icon updated.")
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="app-name">App name</Label>
        <Input
          id="app-name"
          value={nameDraft}
          placeholder="Bloom"
          onChange={(e) => setNameDraft(e.target.value)}
          onBlur={() => {
            if (nameDraft.trim() !== appName) setAppName(nameDraft)
          }}
        />
      </div>

      <div className="space-y-2">
        <Label>Appearance</Label>
        <div className="grid grid-cols-3 gap-2">
          {MODES.map((m) => {
            const selected = mode === m.id
            return (
              <button
                key={m.id}
                type="button"
                aria-pressed={selected}
                onClick={() => setMode(m.id)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 rounded-lg border px-2 py-2.5 text-xs font-medium transition",
                  selected
                    ? "border-ring bg-accent text-accent-foreground ring-1 ring-ring"
                    : "border-border text-muted-foreground hover:bg-muted/50",
                )}
              >
                <m.Icon className="size-4" aria-hidden="true" />
                {m.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Accent color</Label>
        <div className="flex flex-wrap items-center gap-3">
          {ACCENTS.map((a) => {
            const selected = accent === a.id
            return (
              <button
                key={a.id}
                type="button"
                aria-label={a.label}
                aria-pressed={selected}
                onClick={() => setAccent(a.id)}
                className={cn(
                  "relative flex size-9 items-center justify-center rounded-full transition",
                  selected ? "ring-2 ring-ring ring-offset-2 ring-offset-background" : "hover:opacity-90",
                )}
                style={{ backgroundColor: a.swatch }}
              >
                {selected && <Check className="size-4 text-white" />}
              </button>
            )
          })}
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={randomDaily}
          onClick={() => setRandomDaily(!randomDaily)}
          className={cn(
            "mt-4 flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition",
            randomDaily
              ? "border-ring bg-accent text-accent-foreground ring-1 ring-ring"
              : "border-border hover:bg-muted/50",
          )}
        >
          <Shuffle className="size-4 shrink-0" aria-hidden="true" />
          <span className="flex-1">
            <span className="block text-sm font-medium">Surprise me daily</span>
            <span className="block text-xs text-muted-foreground">
              {randomDaily ? "A new accent is picked each day" : "Pick a fresh accent automatically every day"}
            </span>
          </span>
          <span
            aria-hidden="true"
            className={cn(
              "relative h-5 w-9 shrink-0 rounded-full transition-colors",
              randomDaily ? "bg-primary" : "bg-muted-foreground/30",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 size-4 rounded-full bg-background transition-all",
                randomDaily ? "left-[18px]" : "left-0.5",
              )}
            />
          </span>
        </button>
      </div>

      <div className="space-y-2">
        <Label>Corner style</Label>
        <div className="grid grid-cols-2 gap-2">
          {(["rounded", "squared"] as const).map((style) => (
            <button
              key={style}
              type="button"
              onClick={() => setCornerStyle(style)}
              aria-pressed={cornerStyle === style}
              className={cn(
                "rounded-lg border px-3 py-2 text-sm font-medium transition capitalize",
                cornerStyle === style
                  ? "border-ring bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:bg-muted/40",
              )}
            >
              {style === "rounded" ? "Rounded" : "Squared"}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Choose between rounded corners or sharp squared edges for the app UI.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="goal-input">Subtitle</Label>
        <Textarea
          id="goal-input"
          value={goalDraft}
          rows={2}
          placeholder="e.g. Build glute strength while staying lean for summer"
          onChange={(e) => setGoalDraft(e.target.value)}
          onBlur={() => {
            if (goalDraft.trim() !== goal) setGoal(goalDraft.trim())
          }}
        />
        <p className="text-xs text-muted-foreground">Shown under the app name on every screen.</p>
      </div>

      <div className="space-y-2">
        <Label>Default weight unit</Label>
        <div className="grid grid-cols-2 gap-2">
          {(["kg", "lbs"] as const).map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => setWeightUnit(u)}
              aria-pressed={weightUnit === u}
              className={cn(
                "rounded-lg border px-3 py-2 text-sm font-medium transition",
                weightUnit === u
                  ? "border-ring bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:bg-muted/40",
              )}
            >
              {u === "kg" ? "Kilograms (kg)" : "Pounds (lbs)"}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          New sets start in this unit. You can still switch any individual set while logging.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Auto-load from last session</Label>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { id: "first", label: "First set" },
              { id: "last", label: "Last set" },
              { id: "off", label: "Off" },
            ] as const
          ).map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => setAutoLoadSet(o.id)}
              aria-pressed={autoLoadSet === o.id}
              className={cn(
                "rounded-lg border px-2 py-2 text-sm font-medium transition",
                autoLoadSet === o.id
                  ? "border-ring bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:bg-muted/40",
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          When logging an exercise, pre-fill one reference set from your previous session. It&apos;s only a starting
          point — nothing is saved until you log it.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Logging shortcuts</Label>
        <button
          type="button"
          role="switch"
          aria-checked={skipGroupWhenSplit}
          onClick={() => setSkipGroupWhenSplit(!skipGroupWhenSplit)}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition",
            skipGroupWhenSplit
              ? "border-ring bg-accent text-accent-foreground ring-1 ring-ring"
              : "border-border hover:bg-muted/50",
          )}
        >
          <span className="flex-1">
            <span className="block text-sm font-medium">Skip muscle group on split days</span>
            <span className="block text-xs text-muted-foreground">
              When you&apos;ve set a split day, hide the muscle-group dropdown and pick exercises directly.
            </span>
          </span>
          <span
            aria-hidden="true"
            className={cn(
              "relative h-5 w-9 shrink-0 rounded-full transition-colors",
              skipGroupWhenSplit ? "bg-primary" : "bg-muted-foreground/30",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 size-4 rounded-full bg-background transition-all",
                skipGroupWhenSplit ? "left-[18px]" : "left-0.5",
              )}
            />
          </span>
        </button>
      </div>

      <div className="space-y-2 rounded-lg border border-border p-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Archive className="size-4 text-primary" aria-hidden="true" />
          Backup &amp; restore
        </div>
        <p className="text-xs text-muted-foreground">
          Save a full copy of your exercises, splits, logs and demo videos as a .zip file, or restore from one. On
          your phone, Export opens the share sheet so you can save the file to Files, Drive, or anywhere you like.
        </p>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <Button variant="outline" className="gap-2" onClick={handleExport} disabled={exporting || importing}>
            {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            Export
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => backupRef.current?.click()}
            disabled={exporting || importing}
          >
            {importing ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            Import
          </Button>
        </div>
        <input
          ref={backupRef}
          type="file"
          accept=".zip,application/zip,application/x-zip-compressed,application/octet-stream"
          className="sr-only"
          onChange={handleImport}
        />
      </div>

      <div className="space-y-2 rounded-lg border border-border bg-muted/40 p-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <HardDrive className="size-4 text-primary" aria-hidden="true" />
          On-device storage
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {usage ? `${formatBytes(usage.usage)} used of ${formatBytes(usage.quota)} available` : "Calculating…"}
        </p>
      </div>

      <div className="space-y-2 rounded-lg border border-border bg-accent/40 p-3 text-sm text-accent-foreground">
        <div className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>
            Everything — logs, splits and demo videos — is stored privately on this device. Nothing is sent to the
            cloud.
          </p>
        </div>
      </div>
    </div>
  )
}
