import ProductCard from "@/components/product/ProductCard";
import { products } from "@/data/products";

type Props = {
  product: {
    id: number;
    completeLook?: number[];
  };
};

export default function CompleteLook({ product }: Props) {
  const related =
    product.completeLook && product.completeLook.length > 0
      ? products.filter((p) => product.completeLook?.includes(p.id))
      : products.filter((p) => p.id !== product.id).slice(0, 4);

  if (related.length === 0) return null;

  return (
    <section className="py-20">

      <div className="mb-10">

        <p className="uppercase tracking-[5px] text-[#8A5A6A]">
          Style Recommendation
        </p>

        <h2 className="mt-3 text-4xl font-bold font-[family:var(--font-playfair)]">
          Complete The Look
        </h2>

      </div>

      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">

        {related.map((item) => (
          <ProductCard
            key={item.id}
            product={item}
          />
        ))}

      </div>

    </section>
  );
}