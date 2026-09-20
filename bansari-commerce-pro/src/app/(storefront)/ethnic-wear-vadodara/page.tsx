import type { Metadata } from 'next';
import Link from 'next/link';
import { MapPin, Phone, Clock, MessageCircle, Mail } from 'lucide-react';

import { getFilteredProducts } from '@/services/product.service';
import ProductCard from '@/components/product/ProductCard';
import BrowseLandingLinks from '@/components/shop/BrowseLandingLinks';
import { jsonLd } from '@/lib/json-ld';
import { SHIPPING_THRESHOLD_LABEL } from '@/lib/shipping';

/**
 * /ethnic-wear-vadodara — the local landing page.
 *
 * WHY THIS PAGE EXISTS
 * The domain is a few months old with no backlinks, so it cannot out-rank
 * Myntra or Nykaa for "cotton kurta set" — those are decided largely on
 * authority, and authority takes years. Local results are decided mostly on
 * proximity, relevance and a consistent business listing, which is the one
 * arena a new boutique with a real shop can enter immediately.
 *
 * So this page targets the queries a new business can actually win: "ethnic
 * wear in Vadodara", "kurta set shop Vadodara", "boutique near BIL". Low
 * volume, high intent, and no national retailer is competing for them.
 *
 * WHAT IS NOT ON THIS PAGE
 * No founding year, no customer count, no "trusted by", no artisan numbers,
 * no review claims. Every figure here is queried or is a published policy:
 * the product count comes from the live catalogue, the address and hours come
 * from the same constants the storefront schema uses, and the shipping and
 * returns lines restate /shipping-policy and /return-refund-policy verbatim.
 * A local page is exactly where a business is tempted to invent trust signals,
 * and exactly where being caught doing it costs most.
 */

export const revalidate = 3600;

const STORE = {
  streetAddress: 'GF-4, Aruma Park, Near Shilchar Company, BIL',
  locality: 'Vadodara',
  region: 'Gujarat',
  postalCode: '391410',
  phone: '+91 84601 92745',
  phoneHref: '+918460192745',
  email: 'support@bansaricollection.in',
  hours: 'Monday to Saturday, 10am – 8pm',
  mapsQuery: 'Bansari Collections, GF-4 Aruma Park, Near Shilchar Company, BIL, Vadodara, Gujarat 391410',
} as const;

export const metadata: Metadata = {
  // The root layout's template appends "| Bansari Collections", so naming the
  // brand here too produced "… Boutique | Bansari Collections | Bansari
  // Collections" in the tab and in search results.
  title: 'Indian Ethnic Wear in Vadodara',
  description:
    'Bansari Collections is a women’s ethnic wear boutique in Vadodara, Gujarat — cotton kurta sets, co-ord sets, kurtis and dresses. Visit us at BIL or order online across India.',
  alternates: { canonical: 'https://www.bansaricollection.in/ethnic-wear-vadodara' },
  openGraph: {
    title: 'Indian Ethnic Wear in Vadodara | Bansari Collections',
    description:
      'A women’s ethnic wear boutique in Vadodara, Gujarat. Cotton kurta sets, co-ord sets, kurtis and dresses.',
    url: 'https://www.bansaricollection.in/ethnic-wear-vadodara',
  },
};

function Detail({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof MapPin;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <Icon size={17} strokeWidth={1.5} aria-hidden="true" style={{ color: 'var(--bc-gold-dark)', marginTop: 2, flexShrink: 0 }} />
      <div>
        <p
          className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em]"
          style={{ color: 'var(--bc-text-muted)' }}
        >
          {label}
        </p>
        <div className="text-[15px] leading-relaxed" style={{ color: 'var(--bc-text-primary)' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

export default async function VadodaraPage() {
  /*
   * Real products, newest first — the same service the shop uses, so this page
   * can never show something the catalogue does not have.
   */
  const { products, meta } = await getFilteredProducts({ perPage: 8, sort: 'newest' });

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(STORE.mapsQuery)}`;

  /*
   * Points back at the @id declared in the root layout, so Google reads one
   * business described in two places rather than two similar businesses.
   */
  const pageSchema = {
    '@context': 'https://schema.org',
    '@type': 'ClothingStore',
    '@id': 'https://www.bansaricollection.in/#store',
    name: 'Bansari Collections',
    url: 'https://www.bansaricollection.in/ethnic-wear-vadodara',
    hasMap: mapsUrl,
    address: {
      '@type': 'PostalAddress',
      streetAddress: STORE.streetAddress,
      addressLocality: STORE.locality,
      addressRegion: STORE.region,
      postalCode: STORE.postalCode,
      addressCountry: 'IN',
    },
  };

  return (
    <main style={{ backgroundColor: 'var(--bc-surface-cream)' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(pageSchema) }} />

      {/* ── Header ── */}
      <section className="mx-auto max-w-7xl px-4 pb-4 pt-14 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <span aria-hidden className="block h-px w-8" style={{ backgroundColor: 'var(--bc-gold)' }} />
          <p
            className="text-[10px] font-medium uppercase tracking-[0.3em]"
            style={{ color: 'var(--bc-gold-dark)' }}
          >
            Vadodara, Gujarat
          </p>
        </div>

        <h1
          className="mt-4 max-w-3xl font-[family:var(--font-playfair)] text-3xl leading-tight sm:text-5xl"
          style={{ fontWeight: 400, color: 'var(--bc-text-primary)' }}
        >
          {/*
            NOT "made in Vadodara". /faq states products are "sourced directly
            from verified artisans and manufacturers" — sourcing is not
            manufacturing, and a local page is the worst place to blur that.
          */}
          Indian ethnic wear, <em className="italic">chosen and sold in Vadodara</em>
        </h1>

        <p
          className="mt-6 max-w-2xl text-[16px] leading-relaxed"
          style={{ color: 'var(--bc-text-secondary)' }}
        >
          Bansari Collections is a women&rsquo;s ethnic wear boutique in Vadodara. We keep{' '}
          {meta.total} pieces in stock &mdash; cotton kurta sets, co-ord sets, kurtis, tops and
          one-piece dresses &mdash; most of them in a single unit per size, so what you see is
          genuinely what is left. Come and try them on at BIL, or order online anywhere in India.
        </p>
      </section>

      {/* ── Shop details + visiting ── */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div
          className="grid gap-10 p-8 sm:p-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16"
          style={{ border: '1px solid var(--bc-border)', backgroundColor: '#FFFFFF' }}
        >
          <div className="flex flex-col gap-7">
            <h2
              className="font-[family:var(--font-playfair)] text-2xl"
              style={{ fontWeight: 400, color: 'var(--bc-text-primary)' }}
            >
              Visit the boutique
            </h2>

            <Detail icon={MapPin} label="Address">
              {STORE.streetAddress}
              <br />
              {STORE.locality}, {STORE.region} {STORE.postalCode}
              <br />
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block underline underline-offset-4"
                style={{ color: 'var(--bc-gold-dark)' }}
              >
                Get directions
              </a>
            </Detail>

            <Detail icon={Clock} label="Opening hours">
              {STORE.hours}
            </Detail>

            <Detail icon={Phone} label="Phone">
              <a href={`tel:${STORE.phoneHref}`} style={{ color: 'var(--bc-text-primary)' }}>
                {STORE.phone}
              </a>
            </Detail>

            <Detail icon={MessageCircle} label="WhatsApp">
              <a
                href={`https://wa.me/${STORE.phoneHref.replace('+', '')}?text=${encodeURIComponent(
                  'Hi, I would like to visit the Vadodara boutique.'
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--bc-text-primary)' }}
              >
                Message us on WhatsApp
              </a>
            </Detail>

            <Detail icon={Mail} label="Email">
              <a href={`mailto:${STORE.email}`} style={{ color: 'var(--bc-text-primary)' }}>
                {STORE.email}
              </a>
            </Detail>
          </div>

          {/* Ordering — every line below restates a published policy. */}
          <div className="flex flex-col gap-7">
            <h2
              className="font-[family:var(--font-playfair)] text-2xl"
              style={{ fontWeight: 400, color: 'var(--bc-text-primary)' }}
            >
              Or order online
            </h2>

            <ul className="flex flex-col gap-4 text-[15px] leading-relaxed" style={{ color: 'var(--bc-text-secondary)' }}>
              <li>
                <strong style={{ color: 'var(--bc-text-primary)' }}>Delivery across India.</strong>{' '}
                Dispatched in 1&ndash;2 business days, with tracking emailed once it leaves us.
              </li>
              <li>
                <strong style={{ color: 'var(--bc-text-primary)' }}>
                  Free shipping over &#x20B9;{SHIPPING_THRESHOLD_LABEL}.
                </strong>{' '}
                A flat &#x20B9;99 below that.
              </li>
              <li>
                <strong style={{ color: 'var(--bc-text-primary)' }}>Free returns.</strong> Seven days
                from delivery, and we pay the return shipping either way.
              </li>
              <li>
                <strong style={{ color: 'var(--bc-text-primary)' }}>Also on marketplaces.</strong>{' '}
                Our pieces are listed on Myntra, Amazon and Flipkart if you would rather buy there.
              </li>
            </ul>

            <div className="mt-2 flex flex-wrap gap-3">
              <Link href="/shop" className="bc-cta-primary">
                Shop the collection
              </Link>
              <Link href="/contact" className="bc-cta-ghost self-center">
                Contact us
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Real products ── */}
      {products.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span aria-hidden className="block h-px w-8" style={{ backgroundColor: 'var(--bc-gold)' }} />
                <p
                  className="text-[10px] font-medium uppercase tracking-[0.3em]"
                  style={{ color: 'var(--bc-gold-dark)' }}
                >
                  In stock now
                </p>
              </div>
              <h2
                className="mt-3 font-[family:var(--font-playfair)] text-2xl sm:text-3xl"
                style={{ fontWeight: 400, color: 'var(--bc-text-primary)' }}
              >
                Newest in the <em className="italic">boutique</em>
              </h2>
            </div>
            <Link href="/shop" className="bc-cta-ghost">
              View all {meta.total}
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* ── Crawlable links into the browse landings ── */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <BrowseLandingLinks heading="Browse by category, fabric and occasion" />
      </section>
    </main>
  );
}
