import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.ayushh.bloom',
  appName: 'Bloom',
  // Next.js static export writes the site here via `next build` (output: 'export').
  webDir: 'out',
  android: {
    // Serve the bundled assets over https://localhost inside the WebView so that
    // IndexedDB, localStorage and the service worker all behave like a secure origin.
    allowMixedContent: false,
  },
  server: {
    androidScheme: 'https',
  },
}

export default config
