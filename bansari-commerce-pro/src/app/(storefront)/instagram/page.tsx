import type { Metadata } from 'next';
import Link from 'next/link';

import ProductCard from '@/components/product/ProductCard';
import { getProducts } from '@/services/product.service';
import { createServiceRoleClient } from '@/lib/supabase/service';

/**
 * /instagram — the "link in bio" page.
 *
 * WHY THIS PAGE EXISTS
 * Instagram does not make links in captions tappable, for any account. The
 * ONE tappable link a profile gets is the one in its bio. So a customer who
 * likes a post has exactly one path to the product: profile → bio link →
 * product. This page is the middle step, and it has to show the piece they
 * just saw without making them search for it.
 *
 * It lists every product published from /admin/instagram, newest post first,
 * read from the instagram_posts table. Publishing a post updates this page by
 * itself; nothing here is curated by hand, so it cannot fall out of step with
 * the feed.
 *
 * A product that has since been deactivated is dropped rather than shown —
 * getProducts() returns active products only.
 *
 * NOT INDEXED: it is a second copy of product cards that already live on
 * /shop, reached from one specific place. Letting Google index it would only
 * compete with the real shop page.
 */

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Shop our Instagram',
  description: 'Every piece from the Bansari Collections Instagram, in one place.',
  robots: { index: false, follow: true },
  alternates: { canonical: 'https://www.bansaricollection.in/instagram' },
};

async function postedProductIds(): Promise<number[]> {
  try {
    const sb = createServiceRoleClient();
    const { data } = await sb
      .from('instagram_posts')
      .select('product_id, published_at')
      .eq('status', 'published')
      .not('product_id', 'is', null)
      .order('published_at', { ascending: false });

    // A product posted twice appears once, at its most recent position.
    const seen = new Set<number>();
    const ids: number[] = [];
    for (const row of data ?? []) {
      const id = Number(row.product_id);
      if (!seen.has(id)) {
        seen.add(id);
        ids.push(id);
      }
    }
    return ids;
  } catch {
    // The page must still render if the table is briefly unreachable.
    return [];
  }
}

export default async function InstagramLinkPage() {
  const [ids, all] = await Promise.all([postedProductIds(), getProducts()]);
  const byId = new Map(all.map((p) => [p.id, p]));
  const posted = ids.map((id) => byId.get(id)).filter((p) => p !== undefined);

  // Before anything is posted, or if every posted piece has sold out, show the
  // newest arrivals rather than an empty page — someone arriving from the bio
  // should always find something to look at.
  const showingFallback = posted.length === 0;
  const products = showingFallback
    ? [...all]
        .sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')))
        .slice(0, 8)
    : posted;

  return (
    <main style={{ backgroundColor: 'var(--bc-surface-cream)' }}>
      <section className="mx-auto max-w-7xl px-4 pb-6 pt-12 text-center sm:px-6 lg:px-8">
        <div className="flex items-center justify-center gap-3">
          <span aria-hidden className="block h-px w-8" style={{ backgroundColor: 'var(--bc-gold)' }} />
          <p
            className="text-[10px] font-medium uppercase tracking-[0.3em]"
            style={{ color: 'var(--bc-gold-dark)' }}
          >
            @bansari_collections
          </p>
          <span aria-hidden className="block h-px w-8" style={{ backgroundColor: 'var(--bc-gold)' }} />
        </div>

        <h1
          className="mx-auto mt-4 max-w-2xl font-[family:var(--font-playfair)] text-3xl leading-tight sm:text-4xl"
          style={{ fontWeight: 400, color: 'var(--bc-text-primary)' }}
        >
          {showingFallback ? (
            <>
              New in the <em className="italic">boutique</em>
            </>
          ) : (
            <>
              Shop what you <em className="italic">saw</em>
            </>
          )}
        </h1>

        <p
          className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed"
          style={{ color: 'var(--bc-text-secondary)' }}
        >
          {showingFallback
            ? 'Our latest pieces, in stock now.'
            : 'Every piece from our Instagram, newest first. Tap one to see sizes and order.'}
        </p>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-x-4 gap-y-9 sm:gap-x-5 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* The other things someone arriving from Instagram most often wants. */}
      <section className="mx-auto max-w-md px-4 pb-20">
        <div className="flex flex-col gap-3">
          <Link href="/shop" className="bc-cta-primary text-center">
            Shop the full collection
          </Link>
          <Link href="/guides" className="bc-cta-ghost text-center">
            Styling &amp; care guides
          </Link>
          <a
            href={`https://wa.me/918460192745?text=${encodeURIComponent('Hi, I saw a piece on your Instagram and have a question.')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bc-cta-ghost text-center"
          >
            Ask us on WhatsApp
          </a>
        </div>
      </section>
    </main>
  );
}
