import { CheckCircle2 } from "lucide-react";

type LowStockProduct = {
  id: string;
  name: string;
  sku: string;
  stock: number;
};

type LowStockProductsProps = {
  products?: LowStockProduct[];
};

export function LowStockProducts({
  products = [],
}: LowStockProductsProps) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white">
      <div className="flex items-center gap-2 border-b border-neutral-200 px-5 py-4">
        <span className="h-3.5 w-0.5 rounded-full bg-[#C9A96E]" />
        <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-neutral-700">
          Low Stock Products
        </h2>
      </div>

      {products.length > 0 ? (
        <div className="divide-y divide-neutral-100">
          {products.map((product) => (
            <div
              key={product.id}
              className="flex items-center justify-between gap-4 px-5 py-3.5"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-neutral-900">{product.name}</p>
                <p className="mt-0.5 text-xs text-neutral-500">{product.sku}</p>
              </div>
              <span
                className={
                  product.stock === 0
                    ? "flex-shrink-0 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700"
                    : "flex-shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800"
                }
              >
                {product.stock === 0 ? "Out of stock" : `${product.stock} left`}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
          <CheckCircle2 className="size-5 text-neutral-300" strokeWidth={1.5} />
          <p className="text-sm font-medium text-neutral-700">Stock levels are healthy</p>
          <p className="text-xs text-neutral-400">
            Products running low will be flagged here.
          </p>
        </div>
      )}
    </div>
  );
}
