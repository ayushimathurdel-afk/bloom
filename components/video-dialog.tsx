"use client"

import { useEffect, useRef, useState } from "react"
import { Link2, Trash2, Upload, Video } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { deleteVideo, getVideo, putExercise, putVideo } from "@/lib/db"
import { useConfirm } from "@/components/confirm-dialog"
import type { Exercise } from "@/lib/types"
import { getEmbedUrl, isValidHttpUrl } from "@/lib/video-url"
import { toast } from "sonner"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  exercise: Exercise | null
  onChanged: () => void
}

export function VideoDialog({ open, onOpenChange, exercise, onChanged }: Props) {
  const confirm = useConfirm()
  const [url, setUrl] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string>("")
  const [mediaType, setMediaType] = useState<"image" | "video">("video")
  const [loading, setLoading] = useState(false)
  const [link, setLink] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let revoke: string | null = null
    if (open && exercise) {
      setLink(exercise.videoUrl ?? "")
      setLoading(true)
      getVideo(exercise.id)
        .then((v) => {
          if (v) {
            try {
              const objUrl = URL.createObjectURL(v.blob)
              revoke = objUrl
              setUrl(objUrl)
              setFileName(v.fileName)
              // Detect if it's an image or video based on file extension
              const isImage = /\.(jpg|jpeg|png|gif|webp|heic|svg)$/i.test(v.fileName)
              setMediaType(isImage ? "image" : "video")
            } catch (error) {
              console.error("[v0] Error creating object URL:", error)
              setUrl(null)
              setFileName("")
            }
          } else {
            setUrl(null)
            setFileName("")
            setMediaType("video")
          }
          setLoading(false)
        })
        .catch((error) => {
          console.error("[v0] Error loading video:", error)
          setUrl(null)
          setFileName("")
          setMediaType("video")
          setLoading(false)
        })
    }
    return () => {
      if (revoke) URL.revokeObjectURL(revoke)
      setUrl(null)
    }
  }, [open, exercise])

  const saveLink = async () => {
    if (!exercise) return
    const trimmed = link.trim()
    if (trimmed && !isValidHttpUrl(trimmed)) {
      toast.error("Enter a valid link starting with http(s)://")
      return
    }
    try {
      await putExercise({ ...exercise, videoUrl: trimmed || undefined })
      toast.success(trimmed ? "Video link saved" : "Video link removed")
      onChanged()
    } catch (error) {
      console.error("[v0] Error saving video link:", error)
      toast.error("Failed to save link. Please try again.")
    }
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !exercise) return
    
    // Validate file size (max 500MB)
    const MAX_FILE_SIZE = 500 * 1024 * 1024
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File is too large. Maximum size is 500MB.")
      e.target.value = "" // Reset input
      return
    }
    
    // Accept both video and image files
    const isVideo = file.type.startsWith("video/")
    const isImage = file.type.startsWith("image/")
    if (!isVideo && !isImage) {
      toast.error("Please choose a video or image file")
      e.target.value = "" // Reset input
      return
    }
    
    try {
      setLoading(true)
      await putVideo({
        id: exercise.id,
        exerciseId: exercise.id,
        blob: file,
        fileName: file.name,
        addedAt: Date.now(),
      })
      const objUrl = URL.createObjectURL(file)
      setUrl(objUrl)
      setFileName(file.name)
      toast.success(isVideo ? "Video saved on this device" : "Image saved on this device")
      onChanged()
    } catch (error) {
      console.error("[v0] File upload error:", error)
      toast.error("Failed to save file. Please try again.")
    } finally {
      setLoading(false)
      e.target.value = "" // Reset input for next upload
    }
  }

  const handleDelete = async () => {
    if (!exercise) return
    const ok = await confirm({
      title: "Delete this file?",
      description: "The on-device demo file will be removed.",
      destructive: true,
    })
    if (!ok) return
    try {
      setLoading(true)
      const saved = await getVideo(exercise.id)
      await deleteVideo(exercise.id)
      setUrl(null)
      setFileName("")
      onChanged()
      toast.success("File removed", {
        action: {
          label: "Undo",
          onClick: async () => {
            try {
              if (saved) {
                await putVideo(saved)
                setUrl(URL.createObjectURL(saved.blob))
                setFileName(saved.fileName)
              }
              onChanged()
            } catch (error) {
              console.error("[v0] Error restoring file:", error)
              toast.error("Failed to restore file")
            }
          },
        },
      })
    } catch (error) {
      console.error("[v0] Error deleting file:", error)
      toast.error("Failed to delete file")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="fixed inset-0 top-0 left-0 translate-x-0 translate-y-0 w-screen h-dvh max-w-none max-h-none flex flex-col gap-0 rounded-none border-none p-0 ring-0 bg-background"
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle>{exercise?.name} — Demo media</DialogTitle>
          <DialogDescription>
            Save a video or image on this device, or paste a YouTube / Instagram link. Use any combination.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="flex aspect-video items-center justify-center rounded-xl bg-muted text-sm text-muted-foreground">
              Loading…
            </div>
          ) : url ? (
            mediaType === "image" ? (
              <img
                src={url}
                alt="Exercise demonstration"
                className="aspect-video w-full rounded-xl bg-muted object-contain"
              />
            ) : (
              <video
                src={url}
                controls
                playsInline
                className="aspect-video w-full rounded-xl bg-black object-contain"
              />
            )
          ) : (
            <div className="flex aspect-video flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/40 text-muted-foreground">
              <Video className="size-7" aria-hidden="true" />
              <p className="text-sm">No demo media yet</p>
            </div>
          )}

          <input
            ref={inputRef}
            type="file"
            accept="video/*,image/*"
            className="sr-only"
            onChange={handleFile}
            disabled={loading}
          />

          <div className="flex gap-2">
            <Button className="flex-1 gap-2" onClick={() => inputRef.current?.click()} disabled={loading}>
              <Upload className="size-4" />
              {url ? "Replace file" : "Add file"}
            </Button>
            {url && (
              <Button variant="outline" size="icon" aria-label={`Delete ${mediaType}`} onClick={handleDelete}>
                <Trash2 className="size-4" />
              </Button>
            )}
          </div>
          {fileName && <p className="truncate text-center text-xs text-muted-foreground">{fileName}</p>}

          <div className="space-y-2 border-t border-border pt-4">
            <Label htmlFor="video-link" className="flex items-center gap-1.5">
              <Link2 className="size-4 text-primary" aria-hidden="true" />
              Demo link
            </Label>
            <Input
              id="video-link"
              type="url"
              inputMode="url"
              placeholder="https://youtube.com/… or instagram.com/reel/…"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              onBlur={() => {
                if ((link.trim() || undefined) !== (exercise?.videoUrl ?? undefined)) saveLink()
              }}
            />
            {link.trim() && !getEmbedUrl(link) && (
              <p className="text-xs text-muted-foreground">
                This link will open in a new tab (only YouTube and Instagram play inline).
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
