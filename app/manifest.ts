import type { MetadataRoute } from "next"

// Required for `output: export` so the manifest is emitted as a static file.
export const dynamic = "force-static"

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Bloom — Workout Tracker",
    short_name: "Bloom",
    description: "A simple, private gym workout logger and tracker. All data stays on your device.",
    start_url: "/",
    scope: "/",
    lang: "en",
    dir: "ltr",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait",
    background_color: "#faf7f5",
    theme_color: "#faf7f5",
    categories: ["health", "fitness", "lifestyle", "sports"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    screenshots: [
      {
        src: "/screenshots/log.png",
        sizes: "412x915",
        type: "image/png",
        form_factor: "narrow",
        label: "Log your workout for any day",
      },
      {
        src: "/screenshots/progress.png",
        sizes: "412x915",
        type: "image/png",
        form_factor: "narrow",
        label: "Track your progress and trends",
      },
      {
        src: "/screenshots/exercises.png",
        sizes: "412x915",
        type: "image/png",
        form_factor: "narrow",
        label: "Manage muscle groups and exercises",
      },
    ],
  }
}
