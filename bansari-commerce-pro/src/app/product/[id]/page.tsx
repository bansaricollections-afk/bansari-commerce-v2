import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getProductById } from '@/services/product.service';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

import CompleteLook from '@/components/product/CompleteLook';
import ProductAccordion from '@/components/product/ProductAccordion';
import ProductGallery from '@/components/product/ProductGallery';
import ProductInfo from '@/components/product/ProductInfo';
import RecentlyViewed from '@/components/product/RecentlyViewed';
import TrustBadges from '@/components/product/TrustBadges';

export const dynamic = 'force-dynamic';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.bansaricollection.in';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductById(Number(id));
  if (!product) return { title: 'Product Not Found | Bansari Collections' };
  const canonicalUrl = `${SITE_URL}/product/${id}`;
  return {
    title: `${product.seo_title || product.name} | Bansari Collections`,
    description:
      product.seo_description ||
      product.description ||
      `Buy ${product.name} online from Bansari Collections.`,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: product.seo_title || product.name,
      description: product.seo_description || product.description || `Buy ${product.name} online.`,
      url: canonicalUrl,
      images: product.images?.[0]?.url ? [{ url: product.images[0].url }] : [],
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;
  const product = await getProductById(Number(id));
  if (!product) notFound();

  const canonicalUrl = `${SITE_URL}/product/${id}`;

  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    ...(product.description && { description: product.description }),
    ...(product.sku && { sku: product.sku }),
    ...(product.category && { category: product.category }),
    ...(product.images?.length && { image: product.images.map((img: any) => img.url) }),
    brand: { '@type': 'Brand', name: 'Bansari Collections' },
    ...(product.specifications?.fabric && { material: product.specifications.fabric }),
    offers: {
      '@type': 'Offer',
      priceCurrency: 'INR',
      price: product.price,
      availability: (product.stock ?? 0) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: canonicalUrl,
      seller: { '@type': 'Organization', name: 'Bansari Collections' },
    },
    ...(product.reviewCount && product.reviewCount > 0 && {
      aggregateRating: { '@type': 'AggregateRating', ratingValue: product.rating, reviewCount: product.reviewCount },
    }),
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Shop', item: `${SITE_URL}/shop` },
      { '@type': 'ListItem', position: 3, name: product.category, item: `${SITE_URL}/collections/${product.category?.toLowerCase().replace(/\s+/g, '-')}` },
      { '@type': 'ListItem', position: 4, name: product.name, item: canonicalUrl },
    ],
  };

  return (
    <>
      <Header />
      {/* mobile sticky bottom bar offset */}
      <div className="pb-[76px] lg:pb-0">
        <main className="min-h-screen bg-[#FFFDF9]">
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} />
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

          {/* ═══════════════════════════════════════════════════════
              HERO: GALLERY + PURCHASE PANEL
          ═══════════════════════════════════════════════════════ */}
          <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 pb-16">
            <div className="grid gap-8 lg:gap-16 lg:grid-cols-[55%_45%]">
              <ProductGallery product={product} />
              <ProductInfo product={product} canonicalUrl={canonicalUrl} />
            </div>
          </section>

          {/* ═══════════════════════════════════════════════════════
              PRODUCT DESCRIPTION — always visible, prominent
          ═══════════════════════════════════════════════════════ */}
          {product.description && (
            <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 border-t border-slate-100">
              <div className="max-w-3xl">
                <p className="text-[10px] tracking-[0.3em] uppercase text-[#8A5A6A] mb-3 font-medium">
                  About this piece
                </p>
                <h2 className="text-xl font-light text-slate-900 tracking-tight mb-6">
                  Product Description
                </h2>
                <p className="text-[15px] text-slate-600 leading-[1.9] font-light">
                  {product.description}
                </p>
              </div>
            </section>
          )}

          {/* ═══════════════════════════════════════════════════════
              ACCORDION: Details / Care / Shipping / Returns / Reviews
          ═══════════════════════════════════════════════════════ */}
          <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-14">
            <ProductAccordion product={product} />
          </section>

          {/* ═══════════════════════════════════════════════════════
              SINGLE TRUST STRIP — appears exactly once
          ═══════════════════════════════════════════════════════ */}
          <section
            aria-label="Trust signals"
            className="border-y border-slate-100 bg-white"
          >
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-7">
              <TrustBadges />
            </div>
          </section>

          {/* ═══════════════════════════════════════════════════════
              RELATED PRODUCTS
          ═══════════════════════════════════════════════════════ */}
          <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <CompleteLook product={product} />
          </section>

          {/* ═══════════════════════════════════════════════════════
              RECENTLY VIEWED
          ═══════════════════════════════════════════════════════ */}
          <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-24">
            <RecentlyViewed />
          </section>
        </main>
      </div>
      <Footer />
    </>
  );
}
