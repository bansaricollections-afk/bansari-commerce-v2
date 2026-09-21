/**
 * Where orders actually come from.
 *
 * WHY THIS EXISTS
 * `orders.marketing_json` has been written on every order since attribution
 * shipped — utm_source, utm_medium, utm_campaign, landing_path, referrer, the
 * Meta click ids. Nothing in the admin, the analytics page or any API has ever
 * read it back. The data was collected and then never looked at.
 *
 * That is the ninth instance of the same pattern in this codebase: one side
 * writes a column, no side reads it. The others were specifications JSONB, the
 * occasion filter, the attr_*_id columns, QuickViewModal, WhatsAppShare,
 * InstagramGallery, ShopEditorialBreak, CategoryGrid and HomeTrustStrip.
 *
 * WHAT THIS DELIBERATELY REFUSES TO DO
 * It does not compute conversion rates, channel percentages or "ROI". With a
 * handful of orders those numbers are noise wearing the costume of insight —
 * one order moves a percentage by twenty points. Absolute counts and rupees
 * are reported, plus an explicit warning when the sample is too small to read
 * anything into. A dashboard that looks confident about five orders teaches
 * the merchant to trust it later, when it is equally wrong.
 */
import { createServiceRoleClient } from '@/lib/supabase/service';

/**
 * Below this many attributed orders, differences between channels are not
 * distinguishable from chance. The UI says so rather than drawing a pie chart.
 */
export const MIN_MEANINGFUL_ORDERS = 30;

export type ChannelRow = {
  /** 'instagram', 'parcel_insert', 'google', 'direct', … */
  channel: string;
  medium: string | null;
  campaign: string | null;
  orders: number;
  revenue: number;
  /** Most recent order through this channel, for "is this still live". */
  lastOrderAt: string | null;
};

export type AttributionReport = {
  rows: ChannelRow[];
  totalOrders: number;
  totalRevenue: number;
  /** Orders with no usable attribution — honest, not hidden. */
  unattributed: number;
  /** Orders placed before attribution capture existed at all. */
  beforeCapture: number;
  sampleTooSmall: boolean;
  instagram: { orders: number; revenue: number; products: { productId: number; orders: number; revenue: number }[] };
  parcelInsert: { orders: number; revenue: number; couponUses: number };
};

/** Turn a referrer URL into a channel name. Never throws on junk input. */
function hostToChannel(referrer: string): string | null {
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, '').toLowerCase();
    if (!host) return null;
    if (host.includes('google')) return 'google';
    if (host.includes('instagram')) return 'instagram';
    if (host.includes('facebook') || host === 'l.facebook.com') return 'facebook';
    if (host.includes('bing')) return 'bing';
    if (host.includes('whatsapp')) return 'whatsapp';
    // Our own domain is not a referrer in any useful sense.
    if (host.includes('bansaricollection')) return null;
    return host;
  } catch {
    return null;
  }
}

type Marketing = Record<string, unknown> | null;

const str = (v: unknown): string | null => {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t ? t.slice(0, 120) : null;
};

/**
 * Classify one order.
 *
 * Precedence is deliberate: an explicit utm_source is a tag we put on a link
 * ourselves, so it beats a referrer, which the browser supplies and which
 * many apps strip or rewrite. Instagram in particular reports a referrer only
 * sometimes, which is exactly why the posts carry UTM tags.
 */
function classify(m: Marketing): { channel: string; medium: string | null; campaign: string | null } {
  if (!m || typeof m !== 'object') return { channel: 'direct', medium: null, campaign: null };

  const source = str(m.utm_source);
  const medium = str(m.utm_medium);
  const campaign = str(m.utm_campaign);

  if (source) return { channel: source.toLowerCase(), medium, campaign };

  // A Meta ad click carries fbclid even when utm tags were lost.
  if (str(m.fbclid)) return { channel: 'facebook', medium: 'paid', campaign };
  if (str(m.gclid) || str(m.gbraid) || str(m.wbraid)) {
    return { channel: 'google', medium: 'paid', campaign };
  }

  const ref = str(m.referrer);
  if (ref) {
    const channel = hostToChannel(ref);
    if (channel) return { channel, medium: 'referral', campaign };
  }

  return { channel: 'direct', medium: null, campaign };
}

/** Product id out of an Instagram post's landing path, e.g. /product/48. */
function productFromPath(path: string | null): number | null {
  if (!path) return null;
  const match = /\/product\/(\d+)/.exec(path);
  return match ? Number(match[1]) : null;
}

export async function getAttributionReport(days = 90): Promise<AttributionReport> {
  const sb = createServiceRoleClient();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  /*
   * Only paid orders count. An abandoned or cancelled order attributed to a
   * channel would credit that channel with revenue that never arrived — which
   * is the specific way marketing dashboards mislead.
   */
  const { data, error } = await sb
    .from('orders')
    .select('id, grand_total, total, created_at, marketing_json, payment_status, order_status')
    .eq('payment_status', 'paid')
    .gte('created_at', since)
    .order('created_at', { ascending: false });

  if (error || !data) {
    return {
      rows: [],
      totalOrders: 0,
      totalRevenue: 0,
      unattributed: 0,
      beforeCapture: 0,
      sampleTooSmall: true,
      instagram: { orders: 0, revenue: 0, products: [] },
      parcelInsert: { orders: 0, revenue: 0, couponUses: 0 },
    };
  }

  const live = data.filter((o) => o.order_status !== 'cancelled');

  const byKey = new Map<string, ChannelRow>();
  const igProducts = new Map<number, { orders: number; revenue: number }>();

  let totalRevenue = 0;
  let unattributed = 0;
  let beforeCapture = 0;

  for (const order of live) {
    const value = Number(order.grand_total ?? order.total ?? 0);
    totalRevenue += value;

    const m = order.marketing_json as Marketing;

    // No marketing_json at all means the order predates attribution capture.
    // Counting those as "direct" would invent a channel result from a gap in
    // instrumentation, so they are reported separately.
    if (!m || Object.keys(m).length === 0) {
      beforeCapture += 1;
      continue;
    }

    const { channel, medium, campaign } = classify(m);
    if (channel === 'direct') unattributed += 1;

    const key = `${channel}|${medium ?? ''}|${campaign ?? ''}`;
    const row = byKey.get(key) ?? {
      channel,
      medium,
      campaign,
      orders: 0,
      revenue: 0,
      lastOrderAt: null,
    };
    row.orders += 1;
    row.revenue += value;
    if (!row.lastOrderAt || order.created_at > row.lastOrderAt) row.lastOrderAt = order.created_at;
    byKey.set(key, row);

    if (channel === 'instagram') {
      const productId = productFromPath(str(m.landing_path));
      if (productId) {
        const p = igProducts.get(productId) ?? { orders: 0, revenue: 0 };
        p.orders += 1;
        p.revenue += value;
        igProducts.set(productId, p);
      }
    }
  }

  const rows = [...byKey.values()].sort((a, b) => b.revenue - a.revenue || b.orders - a.orders);

  const sum = (predicate: (r: ChannelRow) => boolean) =>
    rows.filter(predicate).reduce(
      (acc, r) => ({ orders: acc.orders + r.orders, revenue: acc.revenue + r.revenue }),
      { orders: 0, revenue: 0 }
    );

  const instagram = sum((r) => r.channel === 'instagram');
  const parcel = sum((r) => r.channel === 'parcel_insert');

  /*
   * A second, independent signal for the parcel cards. The UTM tag only
   * survives if the customer typed the URL or scanned the QR; the coupon code
   * is redeemed at checkout regardless of how they arrived. When these two
   * numbers disagree, the coupon count is the more reliable one.
   */
  const { data: coupon } = await sb
    .from('coupons')
    .select('uses_count')
    .eq('code', 'FIRSTVISIT10')
    .maybeSingle();

  return {
    rows,
    totalOrders: live.length,
    totalRevenue,
    unattributed,
    beforeCapture,
    sampleTooSmall: live.length - beforeCapture < MIN_MEANINGFUL_ORDERS,
    instagram: {
      ...instagram,
      products: [...igProducts.entries()]
        .map(([productId, v]) => ({ productId, ...v }))
        .sort((a, b) => b.revenue - a.revenue),
    },
    parcelInsert: { ...parcel, couponUses: Number(coupon?.uses_count ?? 0) },
  };
}
