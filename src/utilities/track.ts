// Sends a GA4 event when the tag is on the page (production, live domain; see components/site/Analytics.tsx).
// A no-op everywhere else. Never pass personal data (names, phones, emails) in params.
export function track(name: string, params?: Record<string, string | number | undefined>) {
  const gtag = (window as { gtag?: (...args: unknown[]) => void }).gtag
  gtag?.('event', name, params)
}
