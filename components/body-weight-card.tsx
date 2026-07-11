"use client"

import { useEffect, useState } from "react"
import { Check, Pencil, Scale } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useData } from "@/components/data-provider"
import { getBodyWeight, putBodyWeight } from "@/lib/db"
import { toast } from "sonner"

interface Props {
  date: string
  onChanged?: () => void
}

export function BodyWeightCard({ date, onChanged }: Props) {
  const { weightUnit } = useData()
  const [weight, setWeight] = useState<number | null>(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState("")

  useEffect(() => {
    let active = true
    setEditing(false)
    getBodyWeight(date).then((entry) => {
      if (!active) return
      setWeight(entry?.weight ?? null)
      setDraft(entry ? String(entry.weight) : "")
    })
    return () => {
      active = false
    }
  }, [date])

  const save = async () => {
    const value = Number(draft)
    if (!draft.trim() || Number.isNaN(value) || value <= 0) {
      toast.error("Enter a valid body weight")
      return
    }
    await putBodyWeight({ date, weight: value, createdAt: Date.now() })
    setWeight(value)
    setEditing(false)
    toast.success("Body weight saved")
    onChanged?.()
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
        <Scale className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">Body weight</p>
        {editing || weight === null ? (
          <div className="mt-1 flex items-center gap-2">
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.1"
              autoFocus={editing}
              placeholder="e.g. 62.5"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
              className="h-8 max-w-28"
            />
            <Button size="sm" className="h-8 gap-1" onClick={save}>
              <Check className="size-4" /> Save
            </Button>
          </div>
        ) : (
          <p className="text-lg font-semibold tabular-nums">{weight} {weightUnit}</p>
        )}
      </div>
      {!editing && weight !== null && (
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground"
          aria-label="Edit body weight"
          onClick={() => setEditing(true)}
        >
          <Pencil className="size-4" />
        </Button>
      )}
    </div>
  )
}
