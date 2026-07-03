import { products } from "@/data/products";
import { Product } from "@/types";

export async function getProducts(): Promise<Product[]> {
  return products;
}

export async function getFeaturedProducts(): Promise<Product[]> {
  return products.filter((product) => product.featured);
}

export async function getNewArrivals(): Promise<Product[]> {
  return products.filter((product) => product.newArrival);
}

export async function getBestSellers(): Promise<Product[]> {
  return products.filter((product) => product.bestSeller);
}

export async function getProductById(
  id: number
): Promise<Product | undefined> {
  return products.find((product) => product.id === id);
}

export async function getProductBySlug(
  slug: string
): Promise<Product | undefined> {
  return products.find((product) => product.slug === slug);
}

export async function getProductsByCategory(
  category: string
): Promise<Product[]> {
  return products.filter(
    (product) =>
      product.category.toLowerCase() === category.toLowerCase()
  );
}

export async function searchProducts(
  keyword: string
): Promise<Product[]> {
  const query = keyword.toLowerCase();

  return products.filter((product) =>
    [
      product.name,
      product.category,
      product.subCategory,
      product.styleCode,
      product.specifications.fabric,
      product.specifications.work,
    ]
      .join(" ")
      .toLowerCase()
      .includes(query)
  );
}
