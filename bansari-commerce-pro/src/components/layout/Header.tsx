/**
 * Header — server component.
 *
 * Deliberately NOT a client component. All interactivity lives in
 * HeaderClient; this wrapper exists purely so the navigation taxonomy can be
 * read from the live catalog on the server and handed down as props.
 *
 * Why it matters: the header previously hardcoded NAV_CATEGORIES and
 * NAV_COLLECTIONS. When the catalog changed, the nav did not — "Women's
 * Co-Ord Sets" kept rendering on every page after its last product was
 * re-categorised, linking to a filter that returned zero products, while a
 * newly created "Bestsellers" collection never appeared at all. /shop had no
 * such problem because its filters are derived. This makes the header derive
 * too, so an admin catalog change is reflected without a code deployment.
 *
 * Every call site (the storefront layout, the PDP, /search) renders <Header />
 * from a server component, so no call site needed to change.
 */

import { getShopFacets } from "@/services/shop-facets";

import HeaderClient, { type NavEntry } from "./HeaderClient";

export default async function Header() {
  // Only values with at least one active product come back, so a nav entry
  // can never point at an empty result. getShopFacets is React-cached, so the
  // Header, the Footer and the page share one query per request.
  const { categories, collections } = await getShopFacets();

  // Exact stored strings, URL-encoded. Never slugified: /shop matches the
  // stored value verbatim.
  const toCategory = (name: string): NavEntry => ({
    label: name,
    href: `/shop?category=${encodeURIComponent(name)}`,
  });
  const toCollection = (name: string): NavEntry => ({
    label: name,
    href: `/shop?collection=${encodeURIComponent(name)}`,
  });

  return (
    <HeaderClient
      categories={categories.map(toCategory)}
      collections={collections.map(toCollection)}
    />
  );
}
