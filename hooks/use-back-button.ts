"use client"

import { useEffect, useRef } from "react"

/**
 * App-wide "back button" manager — designed to work inside a NATIVE ANDROID
 * WEBVIEW WRAPPER (an APK built around a WebView), as well as in normal browsers
 * and installed PWAs.
 *
 * IMPORTANT — how the hardware back button works in a WebView APK:
 *  JavaScript CANNOT intercept Android's hardware back button on its own. The
 *  back press is delivered to the native Activity, not to the web page. For this
 *  module to do anything, the native wrapper's `onBackPressed()` MUST delegate to
 *  the WebView's own history, e.g.:
 *
 *      // MainActivity.java / .kt
 *      if (webView.canGoBack()) webView.goBack() else super.onBackPressed()
 *
 *  Once the wrapper does that, the strategy below works:
 *
 *  Strategy:
 *  - Every time a transient layer opens (a dialog, or a non-default tab), we push
 *    ONE real history entry. This makes `webView.canGoBack()` return true, so the
 *    native back button navigates web history instead of finishing the Activity.
 *  - The resulting `popstate` dismisses the top-most layer — closing the dialog or
 *    returning to the default tab — WITHOUT leaving the app.
 *  - When NO layer is open, there is no extra history entry, so `canGoBack()` is
 *    false and the native wrapper closes the app (standard Android behaviour).
 *  - Closing a layer via the UI pops its history entry back so depth stays in sync;
 *    that self-induced `popstate` is ignored via `ignorePops`.
 *
 *  We deliberately do NOT keep a permanent "exit guard" entry: in a WebView that
 *  would make `canGoBack()` permanently true and the app could never be closed.
 */

type BackHandler = () => void

interface Layer {
  id: number
  handler: BackHandler
}

const ENTRY = { __bloomBack: true } as const

let layers: Layer[] = []
let counter = 0
let installed = false
let ignorePops = 0

function hasEntry(): boolean {
  if (typeof window === "undefined") return false
  try {
    return !!(window.history.state && (window.history.state as { __bloomBack?: boolean }).__bloomBack)
  } catch {
    return false
  }
}

function pushEntry() {
  if (typeof window === "undefined") return
  try {
    window.history.pushState(ENTRY, "")
  } catch {
    // ignore — nothing we can do if the browser refuses
  }
}

function onPopState() {
  // Ignore pops we caused ourselves (popping a layer's entry on a UI close).
  if (ignorePops > 0) {
    ignorePops--
    return
  }

  // A transient layer is open — dismiss the top-most one. The back press already
  // consumed that layer's history entry, so depth stays balanced.
  if (layers.length > 0) {
    const top = layers[layers.length - 1]
    layers = layers.slice(0, -1)
    try {
      top.handler()
    } catch {
      // ignore handler errors so history bookkeeping stays consistent
    }
    return
  }

  // No layers left: nothing to dismiss. In a WebView the native wrapper will have
  // already finished the Activity (canGoBack was false). In a browser this is just
  // a normal back navigation. Either way, do nothing here.
}

/**
 * Install the back-button manager. Safe to call multiple times; only the first
 * call attaches the listener. Call once on app mount.
 *
 * `onRootBack` is retained for API compatibility but is intentionally not invoked,
 * because keeping the app open at the root would prevent a WebView APK from ever
 * closing via the hardware back button.
 */
export function initBackButton(_onRootBack?: () => void): () => void {
  if (typeof window !== "undefined" && !installed) {
    installed = true
    window.addEventListener("popstate", onPopState)
  }
  return () => {}
}

export function registerBackLayer(handler: BackHandler): number {
  if (!installed) initBackButton()
  const id = ++counter
  layers.push({ id, handler })
  // Give THIS layer its own history entry so the hardware back button has
  // something to consume before it can reach the app's real entry.
  pushEntry()
  return id
}

export function removeBackLayer(id: number) {
  const existed = layers.some((l) => l.id === id)
  layers = layers.filter((l) => l.id !== id)
  // UI-initiated close: pop this layer's history entry so depth stays balanced
  // with the layer count. The resulting popstate is ignored via ignorePops.
  if (existed && hasEntry()) {
    ignorePops++
    try {
      window.history.back()
    } catch {
      ignorePops = Math.max(0, ignorePops - 1)
    }
  }
}

/**
 * Dismiss a transient layer (dialog / overlay) with the back button while it is
 * `active`. `onBack` runs when the user presses back; closing via the UI (which
 * flips `active` to false) pops the matching history entry instead.
 */
export function useBackButton(active: boolean, onBack: () => void) {
  const onBackRef = useRef(onBack)
  onBackRef.current = onBack

  useEffect(() => {
    if (!active) return
    const id = registerBackLayer(() => onBackRef.current())
    return () => removeBackLayer(id)
  }, [active])
}
