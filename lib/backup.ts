import JSZip from "jszip"
import { getBackupData, getAllVideos, restoreBackup, type BackupData } from "@/lib/db"
import type { ExerciseVideo } from "@/lib/types"

const BACKUP_VERSION = 1

interface VideoMeta {
  id: string
  exerciseId: string
  fileName: string
  addedAt: number
  file: string // path inside the zip
  mime: string
}

interface ManifestData extends BackupData {
  version: number
  exportedAt: string
  videos: VideoMeta[]
}

function extFromName(name: string, mime: string) {
  const dot = name.lastIndexOf(".")
  if (dot > -1 && dot < name.length - 1) return name.slice(dot + 1)
  if (mime.includes("/")) return mime.split("/")[1].split(";")[0]
  return "mp4"
}

/** Build a full backup (.zip) Blob containing all data + on-device videos. */
export async function exportBackup(): Promise<Blob> {
  const data = await getBackupData()
  const videos = await getAllVideos()
  const zip = new JSZip()

  const videoMetas: VideoMeta[] = []
  const videoFolder = zip.folder("videos")
  for (const v of videos) {
    const ext = extFromName(v.fileName, v.blob.type || "video/mp4")
    const path = `videos/${v.id}.${ext}`
    videoFolder?.file(`${v.id}.${ext}`, v.blob)
    videoMetas.push({
      id: v.id,
      exerciseId: v.exerciseId,
      fileName: v.fileName,
      addedAt: v.addedAt,
      file: path,
      mime: v.blob.type || "video/mp4",
    })
  }

  const manifest: ManifestData = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    ...data,
    videos: videoMetas,
  }
  zip.file("data.json", JSON.stringify(manifest, null, 2))

  return zip.generateAsync({ type: "blob", compression: "DEFLATE" })
}

/** Read a backup (.zip) and replace all current data with its contents. */
export async function importBackup(file: File | Blob): Promise<void> {
  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(file)
  } catch {
    // JSZip throws a low-level "central directory" message for non-zip files —
    // surface something a person can actually act on instead.
    throw new Error("This file isn't a valid Bloom backup (.zip). Pick a file exported from Bloom.")
  }
  const dataFile = zip.file("data.json")
  if (!dataFile) {
    throw new Error("This file isn't a valid Bloom backup (missing data.json).")
  }
  let manifest: ManifestData
  try {
    manifest = JSON.parse(await dataFile.async("string")) as ManifestData
  } catch {
    throw new Error("This backup is corrupted and couldn't be read.")
  }

  const videos: ExerciseVideo[] = []
  for (const meta of manifest.videos ?? []) {
    const entry = zip.file(meta.file)
    if (!entry) continue
    const blob = await entry.async("blob")
    videos.push({
      id: meta.id,
      exerciseId: meta.exerciseId,
      fileName: meta.fileName,
      addedAt: meta.addedAt,
      blob: blob.type ? blob : new Blob([blob], { type: meta.mime }),
    })
  }

  const data: BackupData = {
    muscleGroups: manifest.muscleGroups ?? [],
    exercises: manifest.exercises ?? [],
    splits: manifest.splits ?? [],
    logs: manifest.logs ?? [],
    settings: manifest.settings ?? [],
    bodyWeights: manifest.bodyWeights ?? [],
  }

  await restoreBackup(data, videos)
}

function backupFileName() {
  const stamp = new Date().toISOString().slice(0, 10)
  return `bloom-backup-${stamp}.zip`
}

/** Trigger a browser download of a backup zip with a dated filename (web only). */
export function downloadBackup(blob: Blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = backupFileName()
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read backup data."))
    reader.onload = () => {
      // reader.result is a data URL like "data:application/zip;base64,XXXX" —
      // strip the prefix so only the raw base64 payload remains.
      const result = String(reader.result)
      resolve(result.slice(result.indexOf(",") + 1))
    }
    reader.readAsDataURL(blob)
  })
}

export interface SaveResult {
  /** How the file was delivered to the user. */
  method: "shared" | "downloaded"
  fileName: string
  /** Native filesystem location, when known. */
  location?: string
}

/**
 * Save a backup zip. On a native (Capacitor) build the file is written to the
 * device and the system share sheet is opened so the user can pick where to keep
 * it (Files, Drive, etc.). On the web it falls back to a normal browser download.
 */
export async function saveBackup(blob: Blob): Promise<SaveResult> {
  const fileName = backupFileName()

  // Detect a Capacitor native shell without hard-failing the web build.
  const cap = (globalThis as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor
  const isNative = typeof cap?.isNativePlatform === "function" && cap.isNativePlatform()

  if (!isNative) {
    downloadBackup(blob)
    return { method: "downloaded", fileName }
  }

  const { Filesystem, Directory } = await import("@capacitor/filesystem")
  const { Share } = await import("@capacitor/share")

  const base64 = await blobToBase64(blob)

  // Cache dir is writable without runtime storage permissions; the share sheet
  // then lets the user copy it anywhere they like.
  await Filesystem.writeFile({ path: fileName, data: base64, directory: Directory.Cache })
  const { uri } = await Filesystem.getUri({ path: fileName, directory: Directory.Cache })

  await Share.share({
    title: "Bloom backup",
    text: `Save your Bloom backup (${fileName}) somewhere safe.`,
    url: uri,
    dialogTitle: "Save or share your Bloom backup",
  })

  return { method: "shared", fileName, location: uri }
}
