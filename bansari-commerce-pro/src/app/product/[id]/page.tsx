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

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductById(Number(id));

  if (!product) {
    return { title: 'Product Not Found | Bansari Collections' };
  }

  const canonicalUrl = `${SITE_URL}/product/${id}`;

  return {
    title: `${product.seo_title || product.name} | Bansari Collections`,
    description:
      product.seo_description ||
      product.description ||
      `Buy ${product.name} online from Bansari Collections.`,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: product.seo_title || product.name,
      description:
        product.seo_description ||
        product.description ||
        `Buy ${product.name} online.`,
      url: canonicalUrl,
      images:
        product.images?.[0]?.url
          ? [{ url: product.images[0].url }]
          : [],
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
    ...(product.images && product.images.length > 0 && {
      image: product.images.map((img: any) => img.url),
    }),
    brand: { '@type': 'Brand', name: 'Bansari Collections' },
    ...(product.variants?.[0]?.color && { color: product.variants[0].color }),
    ...(product.specifications?.fabric && {
      material: product.specifications.fabric,
    }),
    offers: {
      '@type': 'Offer',
      priceCurrency: 'INR',
      price: product.price,
      availability:
        product.stock > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      url: canonicalUrl,
      seller: { '@type': 'Organization', name: 'Bansari Collections' },
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingRate: {
          '@type': 'MonetaryAmount',
          value: '0',
          currency: 'INR',
        },
        shippingDestination: {
          '@type': 'DefinedRegion',
          addressCountry: 'IN',
        },
        deliveryTime: {
          '@type': 'ShippingDeliveryTime',
          handlingTime: {
            '@type': 'QuantitativeValue',
            minValue: 1,
            maxValue: 2,
            unitCode: 'DAY',
          },
          transitTime: {
            '@type': 'QuantitativeValue',
            minValue: 3,
            maxValue: 7,
            unitCode: 'DAY',
          },
        },
      },
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy',
        applicableCountry: 'IN',
        returnPolicyCategory:
          'https://schema.org/MerchantReturnFiniteReturnWindow',
        merchantReturnDays: 7,
        returnMethod: 'https://schema.org/ReturnByMail',
        returnFees: 'https://schema.org/FreeReturn',
        refundType: 'https://schema.org/FullRefund',
      },
    },
    ...(product.reviewCount && product.reviewCount > 0 && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: product.rating,
        reviewCount: product.reviewCount,
      },
    }),
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: SITE_URL,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Shop',
        item: `${SITE_URL}/shop`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: product.category,
        item: `${SITE_URL}/collections/${product.category?.toLowerCase().replace(/\s+/g, '-')}`,
      },
      {
        '@type': 'ListItem',
        position: 4,
        name: product.name,
        item: canonicalUrl,
      },
    ],
  };

  return (
    <>
      <Header />
      <div className="pb-16 lg:pb-0">
        <main className="min-h-screen bg-[#FFFDF9]">
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
          />

          {/* ── Hero: images + purchase panel ── */}
          <section className="mx-auto max-w-7xl px-6 py-14">
            <div className="grid gap-16 lg:grid-cols-2">
              <ProductGallery product={product} />
              <ProductInfo product={product} />
            </div>
          </section>

          {/* ── Product Description ── prominent, full-width */}
          <section
            id="description"
            className="mx-auto max-w-7xl px-6 py-12 border-t border-slate-100"
          >
            <h2 className="text-[11px] tracking-[0.25em] uppercase font-medium text-slate-400 mb-6">
              Product Description
            </h2>
            {product.description ? (
              <p className="text-base text-slate-700 leading-[1.85] max-w-3xl font-light">
                {product.description}
              </p>
            ) : (
              <p className="text-sm text-slate-400 italic">No description available.</p>
            )}
          </section>

          {/* ── Accordion: Product Details, Care, Size Guide, Shipping, Returns ── */}
          <section className="mx-auto max-w-7xl px-6 pb-12">
            <ProductAccordion product={product} />
          </section>

          {/* ── Single trust section ── */}
          <section
            aria-label="Why shop with us"
            className="mx-auto max-w-7xl px-6 py-10 border-t border-slate-100"
          >
            <TrustBadges />
          </section>

          {/* ── Complete the look ── */}
          <section className="mx-auto max-w-7xl px-6">
            <CompleteLook product={product} />
          </section>

          {/* ── Recently viewed ── */}
          <section className="mx-auto max-w-7xl px-6 pb-24">
            <RecentlyViewed />
          </section>
        </main>
      </div>
      <Footer />
    </>
  );
}
