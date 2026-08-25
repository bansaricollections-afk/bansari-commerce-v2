/**
 * events.ts
 * ---------
 * The single place a commerce event is defined.
 *
 * Before this module the same conversion had to be written three times — once
 * for Vercel Analytics, once for the Meta Pixel, and (from now on) once for
 * GA4 — in whichever component owned the moment. That is how CashfreeButton
 * ended up firing a Meta Purchase but never a Vercel one, and how the pixel
 * went months without recording a single Cashfree conversion. Adding a fourth
 * destination should not mean editing five components again.
 *
 * Each helper below takes ONE domain-shaped argument and fans it out, doing
 * the per-destination reshaping here where the differences are visible:
 *
 *   Vercel Analytics  flat scalars only — it silently DROPS nested objects
 *                     and arrays, so item lists are reduced to counts.
 *   GA4               wants an `items` array using item_id / item_name.
 *   Meta Pixel        wants content_ids / contents and capitalised event
 *                     names, and its Purchase carries the eventID that the
 *                     Conversions API deduplicates against (see meta-capi.ts).
 *   Google Ads        a separate 'conversion' event addressed by send_to.
 *
 * Every destination is independently optional: each is guarded, so a missing
 * GA4 id or an ad blocker taking out one script never stops the others.
 *
 * Browser-only. Every function is a no-op when called during SSR.
 */
import { track as vercelTrack } from '@vercel/analytics';

import { metaTrack } from '@/analytics/meta-pixel';

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
const GOOGLE_ADS_PURCHASE_LABEL = process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL;

/**
 * Enhanced Conversions send the customer's email and phone to Google, which
 * hashes them in the browser before transmission. That is a real disclosure of
 * personal data to a third party, so it is OFF unless explicitly enabled, and
 * it must stay off until the Phase 4 consent banner can gate it.
 */
const ENHANCED_CONVERSIONS_ENABLED =
  process.env.NEXT_PUBLIC_GOOGLE_ADS_ENHANCED_CONVERSIONS === 'true';

/**
 * One product line, in the vocabulary of this codebase rather than any
 * vendor's. `id` is product.id — never sku. CartItem carries only variantSku
 * (the size-level code), so a sku-keyed id would report "BC-…-001" from the
 * PDP and "BC-…-001-M" from Purchase: two identities for one product, which
 * breaks funnel reporting and catalogue matching everywhere. The Phase 3
 * product feeds must therefore also be keyed on product id.
 */
export type CommerceItem = {
  id: string | number;
  name: string;
  category?: string | null;
  price: number;
  quantity: number;
};

type Params = Record<string, unknown>;

function gtagEvent(name: string, params: Params): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  if (!GA_MEASUREMENT_ID) return;
  window.gtag('event', name, params);
}

/** GA4 item shape. Undefined keys are omitted rather than sent as null. */
function gaItems(items: CommerceItem[]) {
  return items.map((i) => ({
    item_id: String(i.id),
    item_name: i.name,
    ...(i.category ? { item_category: i.category } : {}),
    price: i.price,
    quantity: i.quantity,
  }));
}

function metaContents(items: CommerceItem[]) {
  return items.map((i) => ({
    id: String(i.id),
    quantity: i.quantity,
    item_price: i.price,
  }));
}

function sumValue(items: CommerceItem[]): number {
  return Math.round(items.reduce((s, i) => s + i.price * i.quantity, 0) * 100) / 100;
}

function countItems(items: CommerceItem[]): number {
  return items.reduce((n, i) => n + i.quantity, 0);
}

/** Product detail page view. */
export function trackViewItem(item: CommerceItem): void {
  const value = item.price * item.quantity;

  vercelTrack('view_item', {
    product_id: item.id,
    product_name: item.name,
    price: item.price,
    currency: 'INR',
    category: item.category ?? null,
  });

  gtagEvent('view_item', {
    currency: 'INR',
    value,
    items: gaItems([item]),
  });

  metaTrack('ViewContent', {
    content_type: 'product',
    content_ids: [String(item.id)],
    content_name: item.name,
    content_category: item.category ?? undefined,
    contents: metaContents([item]),
    value,
    currency: 'INR',
  });
}

/** A line was added to the cart, whether via Add to Cart or Buy Now. */
export function trackAddToCart(item: CommerceItem): void {
  const value = item.price * item.quantity;

  vercelTrack('add_to_cart', {
    product_id: item.id,
    product_name: item.name,
    price: item.price,
    currency: 'INR',
    category: item.category ?? null,
    quantity: item.quantity,
  });

  gtagEvent('add_to_cart', {
    currency: 'INR',
    value,
    items: gaItems([item]),
  });

  metaTrack('AddToCart', {
    content_type: 'product',
    content_ids: [String(item.id)],
    content_name: item.name,
    content_category: item.category ?? undefined,
    contents: metaContents([item]),
    value,
    currency: 'INR',
  });
}

/**
 * The checkout page was reached with a non-empty, rehydrated cart.
 * `value` is the client-side estimate shown in the summary; the server still
 * computes the authoritative charge at create-order.
 */
export function trackBeginCheckout(items: CommerceItem[], value?: number): void {
  if (items.length === 0) return;
  const total = value ?? sumValue(items);

  vercelTrack('begin_checkout', {
    value: total,
    currency: 'INR',
    item_count: countItems(items),
  });

  gtagEvent('begin_checkout', {
    currency: 'INR',
    value: total,
    items: gaItems(items),
  });

  metaTrack('InitiateCheckout', {
    content_type: 'product',
    content_ids: items.map((i) => String(i.id)),
    contents: metaContents(items),
    num_items: countItems(items),
    value: total,
    currency: 'INR',
  });
}

export type PurchaseInput = {
  /**
   * The payment provider's order id. Doubles as the Meta pixel `eventID`, so
   * it MUST match what the Conversions API sends server-side or Meta counts
   * the conversion twice. See lib/meta-capi.ts.
   */
  transactionId: string;
  /** Server-computed amount actually charged, including shipping. */
  value: number;
  currency: string;
  items: CommerceItem[];
  /** Only used for Google Ads Enhanced Conversions, and only when enabled. */
  customer?: { email?: string; phone?: string } | null;
};

/**
 * A payment the SERVER has confirmed. Never call this from a browser-side
 * "looks successful" signal.
 */
export function trackPurchase(input: PurchaseInput): void {
  const { transactionId, value, currency, items, customer } = input;

  vercelTrack('purchase', {
    transaction_id: transactionId,
    value,
    currency,
    item_count: countItems(items),
  });

  gtagEvent('purchase', {
    transaction_id: transactionId,
    currency,
    value,
    items: gaItems(items),
  });

  metaTrack(
    'Purchase',
    {
      content_type: 'product',
      content_ids: items.map((i) => String(i.id)),
      contents: metaContents(items),
      num_items: countItems(items),
      value,
      currency,
    },
    transactionId
  );

  /*
   * Google Ads conversion. Addressed by send_to rather than a bare event so it
   * reaches the Ads account and not GA4, and it is skipped entirely without a
   * conversion label — an unlabelled 'conversion' is silently discarded by
   * Google, which looks identical to working.
   */
  if (GOOGLE_ADS_ID && GOOGLE_ADS_PURCHASE_LABEL && typeof window !== 'undefined') {
    if (ENHANCED_CONVERSIONS_ENABLED && customer && typeof window.gtag === 'function') {
      // Google's tag hashes these in the browser before they are transmitted.
      window.gtag('set', 'user_data', {
        ...(customer.email ? { email: customer.email } : {}),
        ...(customer.phone ? { phone_number: customer.phone } : {}),
      });
    }

    gtagEventRaw('conversion', {
      send_to: `${GOOGLE_ADS_ID}/${GOOGLE_ADS_PURCHASE_LABEL}`,
      transaction_id: transactionId,
      value,
      currency,
    });
  }
}

/**
 * Google Ads conversions must fire even when GA4 is not configured, so they
 * bypass the GA_MEASUREMENT_ID guard in gtagEvent(). The two products share
 * gtag.js but are independently useful.
 */
function gtagEventRaw(name: string, params: Params): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  window.gtag('event', name, params);
}

/** Outbound WhatsApp enquiry — a lead, not a conversion. */
export function trackWhatsAppEnquiry(item: CommerceItem, source: string): void {
  vercelTrack('whatsapp_enquiry', {
    product_id: item.id,
    product_name: item.name,
    price: item.price,
    currency: 'INR',
    category: item.category ?? null,
    source,
  });

  gtagEvent('generate_lead', {
    currency: 'INR',
    value: item.price,
    method: 'whatsapp',
    source,
    items: gaItems([item]),
  });

  metaTrack('Contact', {
    content_type: 'product',
    content_ids: [String(item.id)],
    content_name: item.name,
    value: item.price,
    currency: 'INR',
  });
}
