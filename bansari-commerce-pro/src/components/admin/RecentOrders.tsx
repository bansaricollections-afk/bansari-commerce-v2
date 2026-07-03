import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type RecentOrder = {
  id: string;
  orderNumber: string;
  customer: string;
  total: string;
  status: string;
};

type RecentOrdersProps = {
  orders?: RecentOrder[];
};

export function RecentOrders({ orders = [] }: RecentOrdersProps) {
  return (
    <Card className="bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-slate-950">
          Recent Orders
        </CardTitle>
      </CardHeader>

      <CardContent>
        {orders.length > 0 ? (
          <div className="space-y-3">
            {orders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between gap-4 rounded-md border border-slate-200 p-4"
              >
                <div>
                  <p className="font-medium text-slate-950">
                    {order.orderNumber}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {order.customer}
                  </p>
                </div>

                <div className="text-right">
                  <p className="font-semibold text-slate-950">{order.total}</p>
                  <Badge variant="outline" className="mt-1">
                    {order.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
            No orders available.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
