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
  const ogTitle = product.seo_title || product.name;
  const ogDescription =
    product.seo_description ||
    product.description ||
    `Buy ${product.name} online from Bansari Collections.`;
  const ogImage = product.images?.[0]?.url
    ? [{ url: product.images[0].url }]
    : [];

  const inStock = (product.stock ?? 0) > 0;

  return {
    title: `${ogTitle} | Bansari Collections`,
    description: ogDescription,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      url: canonicalUrl,
      // Batch 5: og:type=product (was undefined / defaulting to 'website')
      type: 'website', // Next.js Metadata only accepts 'website'|'article'|... for type;
      // og:type product requires openGraph.other
      images: ogImage,
      other: {
        'og:type': 'product',
        'og:availability': inStock ? 'instock' : 'oos',
        'og:price:amount': String(product.price),
        'og:price:currency': 'INR',
      },
    },
    // Batch 5: Twitter Card
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description: ogDescription,
      images: product.images?.[0]?.url ? [product.images[0].url] : [],
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;
  const product = await getProductById(Number(id));
  if (!product) notFound();

  const canonicalUrl = `${SITE_URL}/product/${id}`;

  // ── Existing Product JSON-LD (unchanged) ────────────────────────────────
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

  // ── Existing BreadcrumbList JSON-LD (unchanged) ──────────────────────────
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

  // ── Batch 5: FAQ JSON-LD ─────────────────────────────────────────────────
  // Static entries apply to every product; careInstructions entry is
  // prepended only when the field exists on the product's specifications.
  const staticFaqs = [
    {
      '@type': 'Question',
      name: 'How long does delivery take?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Standard delivery takes 5–7 business days across India. Express delivery (2–3 business days) is available at checkout for select pin codes.',
      },
    },
    {
      '@type': 'Question',
      name: 'What is the return policy?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'We offer a 7-day hassle-free return policy. Items must be unworn, unwashed, and in their original packaging with tags intact. Free pickup is available for returns.',
      },
    },
    {
      '@type': 'Question',
      name: 'Are the products authentic?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. All products sold by Bansari Collections are 100% authentic and sourced directly from verified artisans and manufacturers. We do not stock replicas or grey-market goods.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I get the outfit stitched or customised?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Stitching and customisation services are available on select products. Please reach out via WhatsApp or email before placing your order to confirm availability and pricing.',
      },
    },
  ];

  const careFaq =
    product.specifications?.careInstructions
      ? [
          {
            '@type': 'Question',
            name: `How do I care for this ${product.category ?? 'garment'}?`,
            acceptedAnswer: {
              '@type': 'Answer',
              text: product.specifications.careInstructions,
            },
          },
        ]
      : [];

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [...careFaq, ...staticFaqs],
  };

  return (
    <>
      <Header />
      {/* mobile sticky bottom bar offset */}
      <div className="pb-[76px] lg:pb-0">
        <main className="min-h-screen bg-[#FFFDF9]">
          {/* Batch 5: FAQ JSON-LD (new, before existing scripts) */}
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
          {/* Existing JSON-LD blocks — unchanged */}
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
