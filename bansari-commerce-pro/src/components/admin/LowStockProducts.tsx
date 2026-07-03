import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
    <Card className="bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-slate-950">
          Low Stock Products
        </CardTitle>
      </CardHeader>

      <CardContent>
        {products.length > 0 ? (
          <div className="space-y-3">
            {products.map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between gap-4 rounded-md border border-slate-200 p-4"
              >
                <div>
                  <p className="font-medium text-slate-950">{product.name}</p>
                  <p className="mt-1 text-xs text-slate-500">{product.sku}</p>
                </div>

                <Badge variant="destructive">{product.stock} left</Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
            No low stock items.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
