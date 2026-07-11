"use client"

import { useEffect, useState } from "react"
import { ExternalLink, Link2, Smartphone } from "lucide-react"
import { getVideo } from "@/lib/db"
import { getEmbedUrl } from "@/lib/video-url"
import { cn } from "@/lib/utils"

interface Props {
  exerciseId: string
  hasVideo?: boolean
  videoUrl?: string
}

export function InlineFormVideo({ exerciseId, hasVideo, videoUrl }: Props) {
  const [deviceUrl, setDeviceUrl] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<"image" | "video">("video")
  // Whether we've finished checking the on-device store for this exercise.
  const [checked, setChecked] = useState(false)
  // Which source is shown when an exercise has BOTH an on-device video and a link.
  const [source, setSource] = useState<"device" | "link">("device")

  useEffect(() => {
    let active = true
    let objUrl: string | null = null
    setDeviceUrl(null)
    setChecked(false)
    setSource("device")
    setMediaType("video")
    // Always look for a stored on-device video — don't rely on the hasVideo flag
    // alone, since it can drift out of sync with the actual stored blob.
    getVideo(exerciseId)
      .then((v) => {
        if (!active) return
        if (v) {
          try {
            objUrl = URL.createObjectURL(v.blob)
            setDeviceUrl(objUrl)
            // Detect if it's an image or video based on file extension
            const isImage = /\.(jpg|jpeg|png|gif|webp|heic|svg)$/i.test(v.fileName)
            setMediaType(isImage ? "image" : "video")
          } catch (error) {
            console.error("[v0] Error creating object URL for media:", error)
            setDeviceUrl(null)
          }
        }
        setChecked(true)
      })
      .catch((error) => {
        console.error("[v0] Error loading media from storage:", error)
        if (active) setChecked(true)
      })
    return () => {
      active = false
      if (objUrl) {
        try {
          URL.revokeObjectURL(objUrl)
        } catch (error) {
          console.error("[v0] Error revoking object URL:", error)
        }
      }
    }
  }, [exerciseId])

  const hasLink = !!videoUrl
  const embedUrl = videoUrl ? getEmbedUrl(videoUrl) : null
  const deviceAvailable = !!deviceUrl

  // Nothing configured at all.
  if (!hasVideo && !hasLink) return null

  // We expect an on-device video but are still loading it — hold off rendering so
  // we don't briefly flash the link before the device video resolves.
  if (hasVideo && !checked) {
    return (
      <div className="mt-3 flex aspect-video items-center justify-center rounded-xl bg-muted text-sm text-muted-foreground">
        Loading…
      </div>
    )
  }

  // The on-device media is gone and there's no link to fall back to.
  if (checked && !deviceAvailable && !hasLink) {
    return (
      <div className="mt-3 rounded-xl border border-dashed border-border bg-muted/40 px-3 py-4 text-center text-sm text-muted-foreground">
        Demo media no longer available.
      </div>
    )
  }

  const showToggle = deviceAvailable && hasLink
  const active: "device" | "link" = showToggle ? source : deviceAvailable ? "device" : "link"

  const renderDevice = () => {
    if (deviceUrl) {
      return mediaType === "image" ? (
        <img src={deviceUrl} alt="Exercise demonstration" className="w-full rounded-xl bg-muted object-contain" />
      ) : (
        <video src={deviceUrl} controls playsInline className="aspect-video w-full rounded-xl bg-black object-contain" />
      )
    }
    return (
      <div className="flex aspect-video items-center justify-center rounded-xl bg-muted text-sm text-muted-foreground">
        Loading…
      </div>
    )
  }

  const renderLink = () => {
    if (embedUrl) {
      return (
        <iframe
          src={embedUrl}
          title="Exercise demonstration"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="aspect-video w-full rounded-xl border border-border bg-black"
        />
      )
    }
    return <ExternalLinkButton href={videoUrl as string} />
  }

  return (
    <div className="mt-3 space-y-2">
      {showToggle && (
        <div
          className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5 text-xs font-medium"
          role="tablist"
          aria-label="Choose video source"
        >
          <button
            type="button"
            role="tab"
            aria-selected={active === "device"}
            onClick={() => setSource("device")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 transition",
              active === "device" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
            )}
          >
            <Smartphone className="size-3.5" aria-hidden="true" /> On device
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={active === "link"}
            onClick={() => setSource("link")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 transition",
              active === "link" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
            )}
          >
            <Link2 className="size-3.5" aria-hidden="true" /> Link
          </button>
        </div>
      )}
      {active === "device" ? renderDevice() : renderLink()}
    </div>
  )
}

function ExternalLinkButton({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-primary transition hover:bg-muted/50"
    >
      <ExternalLink className="size-4" aria-hidden="true" />
      Open demo link
    </a>
  )
}
