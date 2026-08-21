"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { useCart, useCartHasHydrated } from "@/store/cart";

/**
 * Meta Pixel — browser-side only.
 *
 * The ID is public by design (it ships in the page and is visible to anyone
 * inspecting network traffic), so NEXT_PUBLIC_ is the correct prefix. It is
 * still read from the environment rather than hardcoded so preview and
 * production can point at different pixels.
 *
 * When the variable is absent the component renders nothing and metaTrack()
 * becomes a no-op, so local development and any environment without a pixel
 * configured behave exactly as they do today.
 */
const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

type PixelParams = Record<string, string | number | boolean | object | undefined>;

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & { callMethod?: (...args: unknown[]) => void };
    _fbq?: unknown;
  }
}

/**
 * Fire a Meta standard event.
 *
 * `eventId` maps to Meta's `eventID`, which is the deduplication key used when
 * the same conversion is also reported by the Conversions API. CAPI is not
 * implemented yet — this is set now so the later server-side implementation
 * can reuse the identifier without changing what the browser already sends.
 *
 * Never pass name, email, phone, address, user ids, Razorpay signatures or any
 * payment detail here. Only catalogue facts and order totals belong in a pixel
 * payload.
 */
export function metaTrack(
  event: string,
  params?: PixelParams,
  eventId?: string
): void {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  if (eventId) {
    window.fbq("track", event, params ?? {}, { eventID: eventId });
  } else {
    window.fbq("track", event, params ?? {});
  }
}

/**
 * Loads fbevents.js and owns the two events that are route-driven rather than
 * interaction-driven: PageView and InitiateCheckout.
 *
 * ViewContent, AddToCart and Purchase are fired from the components that
 * already own those moments (ProductActions, RazorpayButton), so the pixel
 * never has to re-derive product or payment state.
 */
export default function MetaPixel() {
  const pathname = usePathname();
  const { items } = useCart();
  const hasHydrated = useCartHasHydrated();

  // The bootstrap snippet fires the first PageView itself; this ref stops the
  // route-change effect from firing a duplicate for the initial render.
  const initialPageViewSkipped = useRef(false);
  const checkoutTracked = useRef(false);

  useEffect(() => {
    if (!PIXEL_ID) return;
    if (!initialPageViewSkipped.current) {
      initialPageViewSkipped.current = true;
      return;
    }
    // App Router client navigations do not reload the document, so fbevents
    // never sees them. Without this, every page after the first is invisible.
    metaTrack("PageView");
  }, [pathname]);

  useEffect(() => {
    if (!PIXEL_ID) return;

    if (pathname !== "/checkout") {
      // Allow a fresh InitiateCheckout if the customer leaves and returns.
      checkoutTracked.current = false;
      return;
    }

    // Gated exactly like the existing begin_checkout instrumentation: wait for
    // the persisted cart to rehydrate and require a non-empty cart, so a
    // mid-hydration empty render never reports a zero-value checkout.
    if (!hasHydrated || checkoutTracked.current || items.length === 0) return;
    checkoutTracked.current = true;

    const value = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

    metaTrack("InitiateCheckout", {
      content_type: "product",
      content_ids: items.map((i) => String(i.id)),
      contents: items.map((i) => ({
        id: String(i.id),
        quantity: i.quantity,
        item_price: i.price,
      })),
      num_items: items.reduce((n, i) => n + i.quantity, 0),
      value,
      currency: "INR",
    });
  }, [pathname, hasHydrated, items]);

  if (!PIXEL_ID) return null;

  return (
    <Script
      id="meta-pixel"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window,document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${PIXEL_ID}');
fbq('track', 'PageView');
        `,
      }}
    />
  );
}
