// Runs once when the server starts (Node.js runtime only, and not during `next build`): starts the timer that tells the
// editor about owners' photo changes (src/server/photoNotices.ts).
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.NEXT_PHASE !== 'phase-production-build') {
    const { startPhotoNotices } = await import('./server/photoNotices')
    startPhotoNotices()
  }
}
