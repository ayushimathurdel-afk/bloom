"use client"

import { createContext, useContext, useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

type BackHandler = () => void

interface BackButtonContextType {
  registerBackHandler: (handler: BackHandler) => () => void
  triggerBack: () => void
}

const BackButtonContext = createContext<BackButtonContextType | null>(null)

export function BackButtonProvider({ children }: { children: React.ReactNode }) {
  const handlersRef = useRef<Set<BackHandler>>(new Set())
  const exitWarningShownRef = useRef(false)
  const exitTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const registerBackHandler = useCallback((handler: BackHandler) => {
    handlersRef.current.add(handler)
    return () => handlersRef.current.delete(handler)
  }, [])

  const triggerBack = useCallback(() => {
    const handlers = Array.from(handlersRef.current)
    
    // Try handlers in reverse order (LIFO - last registered, first executed)
    for (const handler of handlers.reverse()) {
      handler()
      return // Handler should handle the back action
    }

    // No handlers, so handle app-level back
    if (!exitWarningShownRef.current) {
      exitWarningShownRef.current = true
      toast("Press back again to exit", { id: "exit-hint", duration: 2000 })
      
      // Reset the warning after 2 seconds
      exitTimeoutRef.current = setTimeout(() => {
        exitWarningShownRef.current = false
      }, 2000)
    } else {
      // Second press - close the app
      if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current)
      exitWarningShownRef.current = false
      
      // For Capacitor app, use the app close method
      if (typeof window !== "undefined" && (window as any).Capacitor) {
        (window as any).Capacitor.Plugins.App.exitApp()
      } else {
        // Fallback for web - try to close the window
        window.close()
      }
    }
  }, [])

  useEffect(() => {
    const handleBackButton = () => {
      triggerBack()
    }

    // Handle hardware back button via popstate (browser back)
    window.addEventListener("popstate", handleBackButton)
    
    // For Capacitor apps, listen to the app back button
    if (typeof window !== "undefined" && (window as any).Capacitor) {
      const setupCapacitorBack = async () => {
        try {
          const { App } = (window as any).Capacitor.Plugins
          App.addListener("backButton", handleBackButton)
        } catch (error) {
          console.error("[v0] Failed to setup Capacitor back button:", error)
        }
      }
      setupCapacitorBack()
    }

    return () => {
      window.removeEventListener("popstate", handleBackButton)
    }
  }, [triggerBack])

  return (
    <BackButtonContext.Provider value={{ registerBackHandler, triggerBack }}>
      {children}
    </BackButtonContext.Provider>
  )
}

export function useBackButton(handler: BackHandler) {
  const context = useContext(BackButtonContext)
  if (!context) {
    throw new Error("useBackButton must be used within BackButtonProvider")
  }

  useEffect(() => {
    return context.registerBackHandler(handler)
  }, [handler, context])
}
