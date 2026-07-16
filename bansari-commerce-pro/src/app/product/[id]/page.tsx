import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getProductById } from '@/services/product.service';

import CompleteLook from '@/components/product/CompleteLook';
import DeliveryCard from '@/components/product/DeliveryCard';
import ProductAccordion from '@/components/product/ProductAccordion';
import ProductGallery from '@/components/product/ProductGallery';
import ProductInfo from '@/components/product/ProductInfo';
import RecentlyViewed from '@/components/product/RecentlyViewed';
import TrustBadges from '@/components/product/TrustBadges';
import WhatsAppShare from '@/components/product/WhatsAppShare';

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
    title: `${product.seo?.title || product.name} | Bansari Collections`,
    description:
      product.seo?.description ||
      product.description ||
      `Buy ${product.name} online from Bansari Collections.`,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: product.seo?.title || product.name,
      description:
        product.seo?.description ||
        product.description ||
        `Buy ${product.name} online.`,
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
    ...(product.images.length > 0 && {
      image: product.images.map((img) => img.url),
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
    ...(product.reviewCount > 0 && {
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
    <main className="min-h-screen bg-[#FFFDF9]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <section className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-16 lg:grid-cols-2">
          <ProductGallery product={product} />
          <ProductInfo product={product} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6">
        <TrustBadges />
      </section>

      <section className="mx-auto max-w-7xl px-6">
        <WhatsAppShare
          productName={product.name}
          productUrl={canonicalUrl}
          price={product.price}
        />
      </section>

      <section className="mx-auto max-w-7xl px-6">
        <DeliveryCard />
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <ProductAccordion product={product} />
      </section>

      <section className="mx-auto max-w-7xl px-6">
        <CompleteLook product={product} />
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-24">
        <RecentlyViewed />
      </section>
    </main>
  );
}
