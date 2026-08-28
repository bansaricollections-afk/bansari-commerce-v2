'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

/**
 * GoogleTag — GA4 and Google Ads, loaded through gtag.js directly.
 *
 * WHY gtag AND NOT GOOGLE TAG MANAGER
 *
 * GTM would need a wildcard in script-src plus 'unsafe-inline' for injected
 * tags, which materially weakens the CSP in next.config.ts that currently
 * pins every third party to an exact origin. It also moves event definitions
 * into a web console, so the site's analytics contract would live in two
 * places and drift. gtag.js keeps a single origin in the CSP and keeps every
 * event visible in src/analytics/events.ts.
 *
 * Both IDs are NEXT_PUBLIC_ by necessity — they ship in the page and are
 * visible to anyone reading network traffic. Neither grants any write access,
 * unlike META_CAPI_ACCESS_TOKEN.
 *
 * IMPORTANT (Vercel): do NOT tick "Sensitive" on these. Vercel withholds
 * Sensitive values at build time, so the inlined value becomes `undefined` and
 * the tag silently never loads.
 *
 * When GA4's id is absent this component renders nothing and every helper in
 * events.ts degrades to a no-op, so local development and any environment
 * without analytics configured behave exactly as they do today.
 */
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export default function GoogleTag() {
  const pathname = usePathname();

  // The bootstrap `config` below sends the first page_view itself; this ref
  // stops the route-change effect from firing a duplicate for the first render.
  const initialPageViewSkipped = useRef(false);

  useEffect(() => {
    if (!GA_MEASUREMENT_ID) return;
    if (!initialPageViewSkipped.current) {
      initialPageViewSkipped.current = true;
      return;
    }

    /*
     * App Router client navigations never reload the document, so gtag.js
     * cannot observe them on its own. Without this every page after the first
     * is invisible to GA4 — the same failure the Meta Pixel works around in
     * meta-pixel.tsx.
     *
     * page_location is passed explicitly because gtag would otherwise reuse
     * the URL captured at config time.
     */
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'page_view', {
        page_path: pathname,
        page_location: window.location.href,
        page_title: document.title,
      });
    }
  }, [pathname]);

  if (!GA_MEASUREMENT_ID) return null;

  return (
    <>
      <Script
        id="gtag-src"
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      />
      {/*
        * beforeInteractive, NOT afterInteractive — this is load-bearing.
        *
        * This snippet defines window.gtag. afterInteractive injects it AFTER
        * hydration, but ProductActions fires view_item from a useEffect that
        * runs AT hydration, and gtagEvent() silently returns when window.gtag
        * is undefined. The result was that view_item never fired on a direct
        * product-page landing — which is precisely how ad traffic arrives —
        * while page_view and scroll worked, because gtag.js emits those
        * itself once it eventually loads.
        *
        * Defining the shim first means any event fired before gtag.js
        * finishes loading is queued on dataLayer and drained on load, which
        * is exactly why Google documents this snippet as belonging in <head>.
        * The inline script is a few hundred bytes and loads nothing, so it
        * costs no meaningful blocking time; gtag.js itself still loads
        * afterInteractive below.
        */}
      <Script
        id="gtag-init"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;

/*
 * Consent Mode v2 defaults — declared BEFORE gtag('js') and gtag('config'),
 * which is the only order Google accepts. A default set after config has
 * already fired is ignored, and the tag behaves as if consent were granted.
 *
 * Two defaults are declared. The region-scoped one wins for visitors Google
 * resolves (by IP, server-side) to the EEA or the UK, where consent must
 * precede tracking. The unscoped one applies everywhere else, matching the
 * opt-out model appropriate to this store's Indian market.
 *
 * This is why no geo lookup exists in our own code: Google does the region
 * resolution itself, before any tag fires.
 *
 * wait_for_update gives the banner 500ms to apply a stored choice before
 * Google models anything, so a returning visitor who already consented is
 * not measured as a denied session.
 */
gtag('consent', 'default', {
  ad_storage: 'denied',
  analytics_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  wait_for_update: 500,
  region: ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','IS','LI','NO','GB','CH']
});
gtag('consent', 'default', {
  ad_storage: 'granted',
  analytics_storage: 'granted',
  ad_user_data: 'granted',
  ad_personalization: 'granted'
});

gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}');
${GOOGLE_ADS_ID ? `gtag('config', '${GOOGLE_ADS_ID}');` : ''}
          `,
        }}
      />
    </>
  );
}
