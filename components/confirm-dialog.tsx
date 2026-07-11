"use client"

import { createContext, useCallback, useContext, useRef, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface ConfirmOptions {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error("useConfirm must be used within a ConfirmProvider")
  return ctx
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [opts, setOpts] = useState<ConfirmOptions>({ title: "" })
  const resolver = useRef<((value: boolean) => void) | null>(null)

  const confirm = useCallback<ConfirmFn>((options) => {
    setOpts(options)
    setOpen(true)
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
    })
  }, [])

  const settle = (result: boolean) => {
    setOpen(false)
    resolver.current?.(result)
    resolver.current = null
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog open={open} onOpenChange={(o) => !o && settle(false)}>
        <DialogContent 
          className="fixed inset-0 top-0 left-0 translate-x-0 translate-y-0 w-screen h-dvh max-w-none max-h-none flex flex-col gap-0 rounded-none border-none p-0 ring-0 bg-background"
          showCloseButton={false}
        >
          <DialogHeader>
            <DialogTitle>{opts.title}</DialogTitle>
            {opts.description && <DialogDescription>{opts.description}</DialogDescription>}
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => settle(false)}>
              {opts.cancelLabel ?? "Cancel"}
            </Button>
            <Button variant={opts.destructive ? "destructive" : "default"} onClick={() => settle(true)}>
              {opts.confirmLabel ?? "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  )
}
