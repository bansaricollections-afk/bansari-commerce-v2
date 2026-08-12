import { getFeaturedProducts } from "@/services/product.service";
import EditorialHeroCarousel, { type HeroSlide } from "./EditorialHeroCarousel";

const POSITIONS: HeroSlide["position"][] = ["left", "center", "right"];

// ── Real, catalog-driven hero ───────────────────────────────────────────────
// Slides are built from active products flagged `featured` in Admin Product
// Management, using their real stored images. The slide count follows the
// real catalog — no stock photography is used to pad the carousel.
export default async function EditorialHero() {
  let products: Awaited<ReturnType<typeof getFeaturedProducts>> = [];
  try {
    products = await getFeaturedProducts();
  } catch {
    return null;
  }

  const slides: HeroSlide[] = products
    .filter((p) => p.images?.[0]?.url)
    .slice(0, 3)
    .map((p, i) => ({
      id: p.id,
      // Short, display-safe headline: the collection reads well at hero scale,
      // where a full product name would not.
      campaign: p.category ?? "Bansari Collections",
      headline: p.collection ?? p.name,
      subheadline: p.name,
      cta: "Shop This Piece",
      ctaHref: `/product/${p.id}`,
      secondaryCta: "All Collections",
      secondaryHref: "/collections",
      image: p.images![0]!.url!,
      imageAlt: p.name,
      accent: [p.category, p.collection].filter(Boolean).join(" · "),
      position: POSITIONS[i % POSITIONS.length],
    }));

  if (slides.length === 0) return null;

  return <EditorialHeroCarousel slides={slides} />;
}
