import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const dirname = path.dirname(fileURLToPath(import.meta.url))

const nextConfig: NextConfig = {
  // Self-hosted in Docker (see Dockerfile / deploy/README.md).
  output: 'standalone',
  images: {
    // Uploaded photos (/media, served by Caddy from the media volume) and the site's own photos (/images).
    localPatterns: [{ pathname: '/media/**' }, { pathname: '/images/**' }],
    qualities: [75, 100],
    formats: ['image/avif', 'image/webp'],
  },
  // The former CMS admin lived at /admin; old bookmarks land on the panel.
  async redirects() {
    return [
      { source: '/admin', destination: '/panel', statusCode: 301 },
      { source: '/admin/:path*', destination: '/panel', statusCode: 301 },
    ]
  },
  // Font files in public/fonts never change in place (a new version gets a new name), so browsers keep them for a year,
  // as they did with next/font's hashed files.
  async headers() {
    return [{ source: '/fonts/:file*', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] }]
  },
  reactStrictMode: true,
  // Several lockfiles live under ~/Claude; pin the workspace root so Turbopack does not guess.
  turbopack: { root: path.resolve(dirname) },
}

export default nextConfig
