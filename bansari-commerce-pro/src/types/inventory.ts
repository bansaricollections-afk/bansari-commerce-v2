export interface Inventory {
  id: number;

  productId: number;

  sku: string;

  size: string;

  colour: string;

  stock: number;

  reserved: number;

  lowStockThreshold: number;

  updatedAt: string;
}