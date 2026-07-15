import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getProductById } from "@/services/product.service";

import CompleteLook from "@/components/product/CompleteLook";
import DeliveryCard from "@/components/product/DeliveryCard";
import ProductAccordion from "@/components/product/ProductAccordion";
import ProductGallery from "@/components/product/ProductGallery";
import ProductInfo from "@/components/product/ProductInfo";
import RecentlyViewed from "@/components/product/RecentlyViewed";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { id } = await params;

  const product = await getProductById(Number(id));

  if (!product) {
    return {
      title: "Product Not Found | Bansari Collections",
    };
  }

  return {
    title: `${product.seo?.title || product.name} | Bansari Collections`,
    description:
      product.seo?.description ||
      product.description ||
      `Buy ${product.name} online from Bansari Collections.`,
    openGraph: {
      title: product.seo?.title || product.name,
      description:
        product.seo?.description ||
        product.description ||
        `Buy ${product.name} online.`,
      images: product.images?.[0]?.url
        ? [
            {
              url: product.images[0].url,
            },
          ]
        : [],
    },
  };
}

export default async function ProductPage({
  params,
}: Props) {
  const { id } = await params;

  const product = await getProductById(Number(id));

  if (!product) {
    notFound();
  }

  // --- JSON-LD: Product structured data (Sprint 24) ---
  // Domain is read from the NEXT_PUBLIC_SITE_URL environment variable so
  // the schema works across staging and production without hardcoding.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  const productSchema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    ...(product.description && { description: product.description }),
    ...(product.sku && { sku: product.sku }),
    ...(product.category && { category: product.category }),
    ...(product.images.length > 0 && {
      image: product.images.map((img) => img.url),
    }),
    brand: {
      "@type": "Brand",
      name: "Bansari Collections",
    },
    ...(product.variants?.[0]?.color && {
      color: product.variants[0].color,
    }),
    ...(product.specifications?.fabric && {
      material: product.specifications.fabric,
    }),
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      price: product.price,
      availability:
        product.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      ...(siteUrl && {
        url: `${siteUrl}/product/${id}`,
      }),
      seller: {
        "@type": "Organization",
        name: "Bansari Collections",
      },
    },
    ...(product.reviewCount > 0 && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: product.rating,
        reviewCount: product.reviewCount,
      },
    }),
  };

  return (
    <main className="min-h-screen bg-[#FFFDF9]">

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />

      {/* Product */}
      <section className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-16 lg:grid-cols-2">
          <ProductGallery product={product} />

          <ProductInfo product={product} />
        </div>
      </section>

      {/* Delivery */}
      <section className="mx-auto max-w-7xl px-6">
        <DeliveryCard />
      </section>

      {/* Product Details */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <ProductAccordion product={product} />
      </section>

      {/* Complete the Look */}
      <section className="mx-auto max-w-7xl px-6">
        <CompleteLook product={product} />
      </section>

      {/* Recently Viewed */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        <RecentlyViewed />
      </section>

    </main>
  );
}
