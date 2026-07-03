import { Product } from "@/types";
import ProductCard from "./ProductCard";

type Props = {
  title?: string;
  products: Product[];
};

export default function ProductGrid({
  title,
  products,
}: Props) {
  return (
    <section className="py-20">

      <div className="mx-auto max-w-7xl px-6">

        {title && (
          <h2 className="mb-12 text-center font-[family:var(--font-playfair)] text-5xl font-bold">
            {title}
          </h2>
        )}

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">

          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
            />
          ))}

        </div>

      </div>

    </section>
  );
}