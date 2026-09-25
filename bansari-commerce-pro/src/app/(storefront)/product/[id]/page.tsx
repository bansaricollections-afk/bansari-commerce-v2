import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getProductById, incrementProductView, getSizeChartForProduct } from '@/services/product.service';
import { getAttributeIndex, buildSpecRows } from '@/services/product-attributes';
import { getProductReviews, getProductRatingSummary } from '@/services/review.service';

import CompleteLook from '@/components/product/CompleteLook';
import ProductAccordion from '@/components/product/ProductAccordion';
import ProductGallery from '@/components/product/ProductGallery';
import ProductInfo from '@/components/product/ProductInfo';
import ProductReviews from '@/components/reviews/ProductReviews';
import RecentlyViewed from '@/components/product/RecentlyViewed';
import TrustBadges from '@/components/product/TrustBadges';
import { jsonLd } from '@/lib/json-ld';
import { SHIPPING_THRESHOLD, STANDARD_SHIPPING } from '@/lib/shipping';

export const dynamic = 'force-dynamic';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.bansaricollection.in';

/**
 * Trim to `max` characters on a word boundary, collapsing whitespace first.
 * Product descriptions are authored in the admin and contain newlines, which
 * would otherwise land in a meta tag verbatim.
 */
function truncate(value: string, max: number): string {
  const clean = value.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[,;:.\-–—]$/, '') + '…';
}

/*
 * Google warns when an Offer carries no priceValidUntil, and a date in the
 * past suppresses the rich result. Computed once at module load rather than
 * per render: `Date.now()` during render is impure (react-hooks/purity), and
 * the exact day is immaterial — it only has to be comfortably in the future.
 * Refreshes on every deploy.
 */
const PRICE_VALID_UNTIL = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10);

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductById(Number(id));
  /*
   * A missing product must be explicitly noindex.
   *
   * Returning only a title meant this branch inherited the root layout's
   * `robots: { index: true, follow: true }`, so the page emitted BOTH
   * `index, follow` (from the layout) and `noindex` (from not-found.tsx) —
   * contradictory directives on a page that should never be indexed at all.
   *
   * The title also carried the brand suffix while the layout template appends
   * it again, producing "Product Not Found | Bansari Collections | Bansari
   * Collections". `absolute` opts out of the template.
   */
  if (!product) {
    return {
      title: { absolute: 'Product Not Found | Bansari Collections' },
      robots: { index: false, follow: false },
    };
  }

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
    /*
     * `absolute` opts out of the root layout's "%s | Bansari Collections"
     * template. This line previously appended the brand itself, so the
     * template appended it a second time — titles read
     * "... | Bansari Collections | Bansari Collections" and ran to 146
     * characters against the ~60 Google renders.
     *
     * Truncated on a word boundary so the brand always survives; a title cut
     * mid-word in the SERP reads as broken.
     */
    title: { absolute: `${truncate(ogTitle, 37)} | Bansari Collections` },
    // Google renders ~155 characters. Several products were emitting their
    // entire description — up to 1296 characters — which is simply discarded.
    description: truncate(ogDescription, 155),
    alternates: { canonical: canonicalUrl },

    openGraph: {
      // Only fields that exist on OpenGraphWebsite / OpenGraphMetadata.
      // og:type='product' is not in Next.js's union; 'website' is the
      // closest valid value. The actual og:type=product meta tag is
      // emitted via top-level Metadata.other below.
      title: ogTitle,
      description: ogDescription,
      url: canonicalUrl,
      siteName: 'Bansari Collections',
      locale: 'en_IN',
      type: 'website',
      images: ogImage,
    },

    // Metadata.other is the officially supported escape hatch for arbitrary
    // <meta property="..."> tags not expressible through the structured API.
    // These override the og:type Next.js would otherwise emit from openGraph.
    other: {
      'og:type': 'product',
      'product:availability': inStock ? 'in stock' : 'out of stock',
      'product:price:amount': String(product.price),
      'product:price:currency': 'INR',
    },

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

  // Real view tracking for the homepage "Best Sellers" section — fire-and-forget,
  // never blocks or fails the page render.
  void incrementProductView(Number(id));

  const canonicalUrl = `${SITE_URL}/product/${id}`;

  // ── Derived schema inputs ───────────────────────────────────────────────
  const spec = product.specifications;

  /*
   * Specification rows, resolved from the attr_*_id lookups the admin writes.
   * One cached read of the ten small attribute tables serves this, the
   * metadata and the JSON-LD.
   */
  /*
   * Approved reviews only. Both return empty/zero when there are none, and
   * every consumer below guards on that, so a product with no reviews renders
   * exactly as it does today.
   */
  const [reviews, ratingSummary, sizeChart] = await Promise.all([
    getProductReviews(product.id),
    getProductRatingSummary(product.id),
    getSizeChartForProduct(product.sizeChartId),
  ]);

  const attributeIndex = await getAttributeIndex();
  const specRows = buildSpecRows(
    {
      attrFabricId:   product.attrFabricId,
      attrColorId:    product.attrColorId,
      attrOccasionId: product.attrOccasionId,
      attrPatternId:  product.attrPatternId,
      attrFitId:      product.attrFitId,
      attrSleeveId:   product.attrSleeveId,
      attrNeckId:     product.attrNeckId,
      attrBottomId:   product.attrBottomId,
      attrWorkId:     product.attrWorkId,
      attrLengthId:   product.attrLengthId,
      sku:            product.sku,
      fabric:         product.fabric,
      color:          product.color,
      category:       product.category,
      careInstructions: product.careInstructions,
      packageContents:  product.packageContents,
      countryOfOrigin:  product.countryOfOrigin,
    },
    attributeIndex
  );

  // Size-managed products carry live variant rows; legacy ones do not.
  const sizeLabels = (product.sizeAvailability ?? [])
    .map((s) => s.label)
    .filter(Boolean);

  /*
   * Colour and fabric: prefer the top-level columns, which are populated on
   * every product, and fall back to variants / the specifications JSONB.
   *
   * The schema previously read only `specifications.fabric`. That JSONB is set
   * on 1 of 34 products, while the `fabric` column is set on all 34 — so
   * `material` was absent from the structured data of 33 products.
   */
  const schemaColor = product.color || product.variants?.find((v) => v.color)?.color;
  const schemaMaterial = product.fabric || spec?.fabric;

  // Garment attributes Google shows in Shopping listings. Only emitted when
  // the product actually has the value.
  const additionalProps = (
    [
      ['Fabric', schemaMaterial],
      ['Work', spec?.work],
      ['Neckline', spec?.neckline],
      ['Sleeve', spec?.sleeve],
      ['Fit', spec?.fit],
      ['Care', spec?.care],
      ['Occasion', spec?.occasion?.join(', ')],
    ] as const
  )
    .filter(([, value]) => Boolean(value))
    .map(([name, value]) => ({ '@type': 'PropertyValue', name, value }));

  // ── Product JSON-LD ─────────────────────────────────────────────────────
  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    ...(product.description && { description: product.description }),
    ...(product.sku && { sku: product.sku }),
    ...(product.category && { category: product.category }),
    ...(product.images?.length && { image: product.images.map((img: any) => img.url) }),
    brand: { '@type': 'Brand', name: 'Bansari Collections' },
    ...(schemaMaterial && { material: schemaMaterial }),

    /*
     * Fields below are drawn from data already stored on the product. Google
     * uses them for Shopping / rich results eligibility, and every one is
     * verifiable — nothing here is asserted that the record does not contain.
     *
     * Deliberately ABSENT: aggregateRating and review. There are no real
     * reviews yet, and inventing them breaks Google's structured data policy
     * and risks a manual action. They are added conditionally above, from real
     * review counts only.
     */
    ...(product.sku && { mpn: product.sku }),
    ...(sizeLabels.length && { size: sizeLabels }),
    ...(schemaColor && { color: schemaColor }),
    audience: { '@type': 'PeopleAudience', suggestedGender: 'female' },
    ...(additionalProps.length && { additionalProperty: additionalProps }),

    offers: {
      '@type': 'Offer',
      priceCurrency: 'INR',
      price: product.price,
      availability: (product.stock ?? 0) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: canonicalUrl,
      seller: { '@type': 'Organization', name: 'Bansari Collections' },
      itemCondition: 'https://schema.org/NewCondition',
      // Google warns when an Offer has no priceValidUntil. Rolling one year:
      // a date in the past makes the offer look stale and suppresses the rich
      // result entirely.
      priceValidUntil: PRICE_VALID_UNTIL,

      /*
       * validFrom — the date this product was listed. The offer has been
       * valid since the product existed, and created_at is the only honest
       * answer available; anything else would be a number chosen to satisfy a
       * validator.
       */
      ...(product.createdAt && { validFrom: product.createdAt.slice(0, 10) }),

      /*
       * Shipping, stated per product because the rate genuinely depends on
       * this product's price: free at or above the threshold, ₹99 below it.
       * A single blanket rate would be wrong for half the catalogue.
       *
       * Both times are what the site already promises a shopper: the shipping
       * policy says dispatch in 1–2 business days, and DeliveryEstimate on
       * this very page tells them metro 3 / rest of India 5. Structured data
       * that contradicted the page it sits on would be the worst of both.
       */
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingRate: {
          '@type': 'MonetaryAmount',
          value: product.price >= SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING,
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
            maxValue: 5,
            unitCode: 'DAY',
          },
        },
      },

      /*
       * Return policy. merchantReturnDays matches /return-refund-policy:
       * "returned within 7 days of delivery".
       *
       * returnFees and returnMethod were previously omitted rather than
       * guessed, because the policy only said who pays when the fault is
       * ours. The owner has since confirmed returns are free in every case,
       * and the policy page has been updated to say so — these two statements
       * must never disagree, because both are public promises.
       */
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy',
        applicableCountry: 'IN',
        returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
        merchantReturnDays: 7,
        returnMethod: 'https://schema.org/ReturnByMail',
        returnFees: 'https://schema.org/FreeReturn',
      },
    },
    /*
     * aggregateRating from APPROVED REVIEWS ONLY, and omitted entirely when
     * there are none.
     *
     * This used to read product.rating / product.reviewCount — seeded
     * placeholder values (every row carried 5, one carried 4.8 / 126) that the
     * product mapper deliberately withholds precisely so they could never
     * reach structured data. Publishing an invented rating breaks Google's
     * structured-data policy and risks a manual action. These numbers are now
     * computed from reviews tied to delivered order lines.
     */
    ...(ratingSummary.count > 0 && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: ratingSummary.average,
        reviewCount: ratingSummary.count,
        bestRating: 5,
        worstRating: 1,
      },
    }),
  };

  // ── Existing BreadcrumbList JSON-LD (unchanged) ──────────────────────────
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Shop', item: `${SITE_URL}/shop` },
      // Same correction as the visible breadcrumb: /collections/{slug} is not a
      // real route, so this published a 404 into structured data on every
      // product. The category must stay raw (exact, case-sensitive match in
      // getFilteredProducts) and be encoded, never slugified.
      { '@type': 'ListItem', position: 3, name: product.category, item: `${SITE_URL}/shop?category=${encodeURIComponent(product.category ?? '')}` },
      { '@type': 'ListItem', position: 4, name: product.name, item: canonicalUrl },
    ],
  };

  // ── FAQ JSON-LD (unchanged) ──────────────────────────────────────────────
  const staticFaqs = [
    {
      '@type': 'Question',
      name: 'How long does delivery take?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Orders are generally processed and dispatched within 1–2 business days after payment confirmation. Actual delivery time may vary by destination, courier service and circumstances beyond our control.',
      },
    },
    {
      '@type': 'Question',
      name: 'What is the return policy?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Products can be returned within 7 days of delivery. Items must be unworn, unwashed, and in their original packaging with tags intact. See our Return & Refund Policy for full details.',
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
      {/* mobile sticky bottom bar offset */}
      <div className="pb-[76px] lg:pb-0">
        <main className="min-h-screen bg-[#FFFDF9]">
          {/* JSON-LD blocks — unchanged */}
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqSchema) }} />
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(productSchema) }} />
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbSchema) }} />

          {/* HERO: GALLERY + PURCHASE PANEL */}
          <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 pb-16">
            <div className="grid gap-8 lg:gap-16 lg:grid-cols-[55%_45%]">
              <ProductGallery product={product} />
              <ProductInfo product={product} canonicalUrl={canonicalUrl} specRows={specRows} sizeChart={sizeChart} />
            </div>
          </section>

          {/* PRODUCT DESCRIPTION */}
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

          {/* CUSTOMER REVIEWS — renders nothing until one is approved */}
          <ProductReviews reviews={reviews} summary={ratingSummary} />

          {/* ACCORDION: Details / Care / Shipping / Returns / Reviews */}
          <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-14">
            <ProductAccordion product={product} />
          </section>

          {/* TRUST STRIP */}
          <section
            aria-label="Trust signals"
            className="border-y border-slate-100 bg-white"
          >
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-7">
              <TrustBadges />
            </div>
          </section>

          {/* RELATED PRODUCTS */}
          <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <CompleteLook product={product} />
          </section>

          {/* RECENTLY VIEWED */}
          <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-24">
            <RecentlyViewed />
          </section>
        </main>
      </div>
    </>
  );
}
