import WishlistGrid from "@/components/wishlist/WishlistGrid";
import { getProducts } from "@/services/product.service";

export default async function WishlistPage() {
  const products = await getProducts();

  return <WishlistGrid products={products} />;
}
