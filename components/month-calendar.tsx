"use client"

import { ChevronLeft, ChevronRight, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { addDays, isSameDay, monthGrid, monthName, toKey, WEEK_LABELS } from "@/lib/date"

interface Props {
  month: Date
  selected: Date
  loggedDates: Set<string>
  collapsed?: boolean
  onMonthChange: (d: Date) => void
  onSelect: (d: Date) => void
  onToday: () => void
  onToggleCollapsed?: () => void
}

export function MonthCalendar({
  month,
  selected,
  loggedDates,
  collapsed = false,
  onMonthChange,
  onSelect,
  onToday,
  onToggleCollapsed,
}: Props) {
  const grid = monthGrid(month)
  const today = new Date()

  // Collapsed: a single row — prev day, the selected date (tap to expand), next day.
  if (collapsed) {
    return (
      <div className="rounded-2xl border border-border bg-card p-2">
        <div className="flex items-center justify-between gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-9 shrink-0"
            aria-label="Previous day"
            onClick={() => onSelect(addDays(selected, -1))}
          >
            <ChevronLeft className="size-5" />
          </Button>
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-expanded={false}
            aria-label="Expand calendar"
            className="flex flex-1 items-center justify-center gap-2 rounded-lg py-1.5 text-sm font-semibold transition-colors hover:bg-muted"
          >
            {selected.getDate()} {monthName(selected)} {selected.getFullYear()}
            {loggedDates.has(toKey(selected)) && (
              <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
            )}
          </button>
          <Button
            variant="ghost"
            size="icon"
            className="size-9 shrink-0"
            aria-label="Next day"
            onClick={() => onSelect(addDays(selected, 1))}
          >
            <ChevronRight className="size-5" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-expanded={true}
          aria-label="Collapse calendar"
          className="-ml-2 flex flex-1 items-center gap-1.5 rounded-lg px-2 py-2 text-left text-sm font-semibold transition-colors hover:bg-muted"
        >
          {monthName(month)} {month.getFullYear()}
          <ChevronUp className="size-4 text-muted-foreground" aria-hidden="true" />
        </button>
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="outline" size="sm" className="mr-1 h-8" onClick={onToday}>
            Today
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Previous month"
            onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Next month"
            onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1">
        {WEEK_LABELS.map((d, i) => (
          <div key={i} className="py-1 text-center text-xs font-medium text-muted-foreground">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {grid.map((d) => {
          const inMonth = d.getMonth() === month.getMonth()
          const isSelected = isSameDay(d, selected)
          const isToday = isSameDay(d, today)
          const hasLog = loggedDates.has(toKey(d))
          return (
            <button
              key={toKey(d)}
              type="button"
              onClick={() => onSelect(d)}
              className={cn(
                "relative flex aspect-square flex-col items-center justify-center rounded-lg text-sm transition-colors",
                !inMonth && "text-muted-foreground/40",
                inMonth && !isSelected && "text-foreground hover:bg-muted",
                isSelected && "bg-primary text-primary-foreground",
                !isSelected && isToday && "ring-1 ring-primary/50",
              )}
              aria-label={d.toDateString()}
              aria-current={isToday ? "date" : undefined}
            >
              <span>{d.getDate()}</span>
              {hasLog && (
                <span
                  className={cn(
                    "absolute bottom-1 size-1.5 rounded-full",
                    isSelected ? "bg-primary-foreground" : "bg-primary",
                  )}
                  aria-hidden="true"
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
