import Script from 'next/script'

import { site } from '@/content/site'

// Google Analytics 4 (gtag.js), loaded after hydration so it never delays the first render.
// Only in production builds and only on the live domain: local `pnpm build && pnpm start` sends nothing.
// No ads: advertising storage and signals are off, so no cookie banner is needed for analytics alone.
// Page views on client-side navigation come from GA4 enhanced measurement («page changes based on browser history»).
// Events: `generate_lead` / `studio_signup` from RequestForm (src/lib/track.ts), `contact_click` below for
// phone, email, Telegram, Viber and Instagram links (contacting a studio directly is a lead too).
export function Analytics() {
  const id = site.analytics.ga4
  if (!id || process.env.NODE_ENV !== 'production') return null

  const init = `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
if (location.hostname === ${JSON.stringify(site.domain)}) {
  window.gtag = gtag;
  gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'granted' });
  gtag('js', new Date());
  gtag('config', ${JSON.stringify(id)}, { allow_google_signals: false, allow_ad_personalization_signals: false });
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    var h = a.getAttribute('href') || '';
    var t = /^tel:/.test(h) ? 'phone' : /^mailto:/.test(h) ? 'email' : /^viber:/.test(h) ? 'viber'
      : /\\/\\/(t\\.me|telegram\\.me)\\//.test(h) ? 'telegram' : /\\/\\/(www\\.)?instagram\\.com\\//.test(h) ? 'instagram' : '';
    if (t) gtag('event', 'contact_click', { link_type: t });
  });
}`

  return (
    <>
      <Script id="ga-init" strategy="afterInteractive">
        {init}
      </Script>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" />
    </>
  )
}
