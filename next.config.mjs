/** @type {import('next').NextConfig} */
const nextConfig = {
  // Produce a fully static site in `out/` so Capacitor can bundle it into the APK.
  output: 'export',
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
