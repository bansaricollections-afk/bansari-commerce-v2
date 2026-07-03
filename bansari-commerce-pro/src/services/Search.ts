import { searchProducts } from "./products";

export async function globalSearch(query: string) {
  if (!query.trim()) {
    return [];
  }

  return searchProducts(query);
}