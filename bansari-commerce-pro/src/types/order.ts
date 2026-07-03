export interface OrderItem {
  productId: string;
  productName: string;
  sku: string;
  image: string;
  color: string;
  size: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Order {
  id: string;

  customerId: string;

  orderNumber: string;

  items: OrderItem[];

  subtotal: number;

  discount: number;

  shipping: number;

  tax: number;

  total: number;

  paymentStatus:
    | "Pending"
    | "Paid"
    | "Failed";

  orderStatus:
    | "Placed"
    | "Processing"
    | "Packed"
    | "Shipped"
    | "Delivered"
    | "Cancelled";

  createdAt: string;
}