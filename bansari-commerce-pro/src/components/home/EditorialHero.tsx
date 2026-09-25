import { getFeaturedProducts, getProducts } from "@/services/product.service";
import { collectionSlug } from "@/lib/collection-slug";
import EditorialHeroCarousel, { type HeroSlide } from "./EditorialHeroCarousel";

const POSITIONS: HeroSlide["position"][] = ["left", "center", "right"];

/*
 * Festive campaign slide — leads the carousel through Karwa Chauth and
 * Diwali, then disappears on its own after FESTIVE_UNTIL, so nobody has to
 * remember to take it down. Built from the live "Festive Edit" collection:
 * if that collection is empty or renamed, the slide simply does not render.
 */
const FESTIVE_COLLECTION = "Festive Edit";
const FESTIVE_UNTIL = new Date("2026-11-10T00:00:00+05:30");

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

  if (Date.now() < FESTIVE_UNTIL.getTime()) {
    try {
      const festive = (await getProducts()).find(
        (p) => p.collection === FESTIVE_COLLECTION && p.images?.[0]?.url
      );
      if (festive) {
        slides.unshift({
          id: -1,
          campaign: "Karwa Chauth & Diwali",
          headline: "The Festive Edit",
          subheadline: "Mirror work, bandhani and sequin sets for the season.",
          cta: "Shop the Festive Edit",
          ctaHref: `/collections/${collectionSlug(FESTIVE_COLLECTION)}`,
          image: festive.images![0]!.url!,
          imageAlt: festive.name,
          accent: FESTIVE_COLLECTION,
          position: "left",
        });
        slides.splice(3);
      }
    } catch {
      /* The campaign slide is optional; the carousel works without it. */
    }
  }

  if (slides.length === 0) return null;

  return <EditorialHeroCarousel slides={slides} />;
}
