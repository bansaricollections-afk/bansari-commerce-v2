/*
 * Shop by occasion — photo tiles linking to the /shop/<occasion> landings.
 *
 * Indian ethnic wear is bought for an occasion ("what do I wear to the
 * puja?"), not by collection name. The occasion landings already existed but
 * were linked only in small text at the foot of /shop, so shoppers never saw
 * them and Google treated them as unimportant. This puts them at the top.
 *
 * Fully derived: landings come from getBrowseLandings (only occasions with at
 * least MIN_PRODUCTS live products), and each tile's photo is that occasion's
 * top bestseller from its own images[]. Renders nothing when fewer than two
 * occasions qualify — a single tile is not a choice.
 */
import Image from "next/image";
import Link from "next/link";

import { getBrowseLandings } from "@/services/browse-landings";
import { getFilteredProducts } from "@/services/product.service";

const MAX_TILES = 4;

export default async function OccasionTiles({
  className = "",
  withHeading = false,
}: {
  className?: string;
  /** Homepage use: renders its own heading so it vanishes with the tiles. */
  withHeading?: boolean;
}) {
  let tiles: { slug: string; label: string; image: string; alt: string }[] = [];

  try {
    const occasions = (await getBrowseLandings())
      .filter((l) => l.kind === "occasion" && l.filter.occasion)
      .sort((a, b) => b.count - a.count)
      .slice(0, MAX_TILES);

    const withImages = await Promise.all(
      occasions.map(async (l) => {
        const { products } = await getFilteredProducts({
          occasion: l.filter.occasion,
          sort: "bestseller",
          perPage: 1,
        });
        const p = products[0];
        const url = p?.images?.[0]?.url;
        return url ? { slug: l.slug, label: l.heading, image: url, alt: p!.name } : null;
      })
    );
    tiles = withImages.filter((t): t is NonNullable<typeof t> => t !== null);
  } catch {
    return null;
  }

  if (tiles.length < 2) return null;

  return (
    <nav aria-label="Shop by occasion" className={className}>
      {withHeading && (
        <>
          <p className="text-center text-[10px] font-semibold uppercase tracking-[0.3em] text-[#8A5A6A]">
            Dressing for something?
          </p>
          <h2 className="mt-2 mb-6 text-center font-[family:var(--font-playfair)] text-[clamp(1.5rem,3vw,2.25rem)] text-slate-900">
            Shop by Occasion
          </h2>
        </>
      )}
      <ul className="flex snap-x gap-3 overflow-x-auto pb-1 scrollbar-none sm:grid sm:grid-cols-4 sm:overflow-visible">
        {tiles.map((t) => (
          <li key={t.slug} className="w-[38%] shrink-0 snap-start sm:w-auto">
            <Link
              href={`/shop/${t.slug}`}
              className="group relative block aspect-[3/4] overflow-hidden bg-[#F7F3EE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A5A6A]"
            >
              <Image
                src={t.image}
                alt={t.alt}
                fill
                sizes="(max-width:640px) 40vw, 25vw"
                className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
              />
              <span
                aria-hidden="true"
                className="absolute inset-0"
                style={{ background: "linear-gradient(to top, rgba(26,15,22,0.78) 0%, rgba(26,15,22,0.15) 45%, transparent 65%)" }}
              />
              <span className="absolute inset-x-0 bottom-0 p-3 text-center">
                <span className="block font-[family:var(--font-playfair)] text-[15px] leading-tight text-[#FFFDF9] sm:text-lg">
                  {t.label}
                </span>
                <span className="mt-1 block text-[9px] font-semibold uppercase tracking-[0.2em] text-[var(--bc-gold-light)]">
                  Shop now
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
