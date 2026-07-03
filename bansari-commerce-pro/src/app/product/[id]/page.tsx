import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { products } from "@/data/products";

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

  const product = products.find(
    (item) => item.id === Number(id)
  );

  if (!product) {
    return {
      title: "Product Not Found | Bansari Collections",
    };
  }

  return {
    title: `${product.name} | Bansari Collections`,
    description:
      product.description ??
      `Buy ${product.name} online from Bansari Collections.`,
    openGraph: {
      title: product.name,
      description:
        product.description ??
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

  const product = products.find(
    (item) => item.id === Number(id)
  );

  if (!product) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#FFFDF9]">
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