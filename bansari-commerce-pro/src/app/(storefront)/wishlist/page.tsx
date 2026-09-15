import WishlistGrid from "@/components/wishlist/WishlistGrid";
import { getProducts } from "@/services/product.service";

export const dynamic = 'force-dynamic';

export default async function WishlistPage() {
  const products = await getProducts();

  return <WishlistGrid products={products} />;
}
