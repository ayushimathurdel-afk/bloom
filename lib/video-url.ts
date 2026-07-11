/** Helpers for turning external demo-video links into embeddable players. */

export type VideoProvider = "youtube" | "instagram" | "other"

export function detectProvider(url: string): VideoProvider {
  const u = url.toLowerCase()
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube"
  if (u.includes("instagram.com")) return "instagram"
  return "other"
}

/** Extract a YouTube video id from watch, youtu.be, shorts or embed links. */
function youtubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/shorts\/)([\w-]{11})/,
    /(?:youtube\.com\/embed\/)([\w-]{11})/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}

/** Extract an Instagram reel/post shortcode. */
function instagramShortcode(url: string): string | null {
  const m = url.match(/instagram\.com\/(?:reel|reels|p|tv)\/([\w-]+)/)
  return m ? m[1] : null
}

/**
 * Returns an embeddable URL for an iframe, or null if the link can't be
 * embedded (in which case callers should show a plain "open link" button).
 */
export function getEmbedUrl(url: string): string | null {
  const provider = detectProvider(url)
  if (provider === "youtube") {
    const id = youtubeId(url)
    return id ? `https://www.youtube.com/embed/${id}` : null
  }
  if (provider === "instagram") {
    const code = instagramShortcode(url)
    return code ? `https://www.instagram.com/reel/${code}/embed` : null
  }
  return null
}

/** Light validation that a string looks like a usable http(s) link. */
export function isValidHttpUrl(url: string): boolean {
  try {
    const u = new URL(url.trim())
    return u.protocol === "http:" || u.protocol === "https:"
  } catch {
    return false
  }
}
