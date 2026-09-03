"use client";

import Link from "next/link";
import { Heart, Menu, ShoppingBag, User } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useCart } from "@/store/cart";
import { useWishlist } from "@/store/wishlist";
import AnnouncementBar, { type AnnouncementBarProps } from "./AnnouncementBar";
import MobileMenu from "./MobileMenu";
import HeaderSearchInput from "@/components/search/HeaderSearchInput";

// ── Navigation taxonomy — real catalog values only ─────────────────────────
// Labels are the exact strings stored in products.category / products.collection,
// because /shop filters on the stored value verbatim. Anything not present in
// the catalog is not listed: a menu entry that resolves to zero products is a
// dead commercial destination even though it returns HTTP 200.
/** A navigation entry built from a real, product-backed catalog value. */
export type NavEntry = { label: string; href: string };

/*
 * Shared by the desktop header and MobileMenu.
 *
 * Guides sits after Collections and before the About/Contact tail: it is
 * content people browse, not company information. It was previously only in
 * the footer's policy column, between Contact Us and Shipping Policy, which
 * framed it as fine print rather than something worth reading.
 */
export const NAV_TOP_LINKS = [
  { label: "New Arrivals", href: "/new-arrivals" },
  { label: "Collections",  href: "/collections" },
  { label: "Guides",       href: "/guides" },
  { label: "About",        href: "/about" },
  { label: "Contact",      href: "/contact" },
] as const;

const ANNOUNCEMENT: AnnouncementBarProps = {
  storageKey: "announcement:v3",
};

export default function HeaderClient({
  categories,
  collections,
}: {
  /** Live catalog categories — derived server-side, never hardcoded. */
  categories: NavEntry[];
  /** Live catalog collections — derived server-side, never hardcoded. */
  collections: NavEntry[];
}) {
  const { items }           = useCart();
  const { items: wishlist } = useWishlist();
  const [shopOpen, setShopOpen]     = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled]     = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shopButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const openDropdown = useCallback(() => {
    if (closeTimerRef.current !== null) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setShopOpen(true);
  }, []);

  const scheduleClose = useCallback(() => {
    closeTimerRef.current = setTimeout(() => {
      setShopOpen(false);
      closeTimerRef.current = null;
    }, 120);
  }, []);

  /** Immediate close — used by keyboard paths, which need no hover grace period. */
  const closeDropdown = useCallback(() => {
    if (closeTimerRef.current !== null) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setShopOpen(false);
  }, []);

  const toggleDropdown = useCallback(() => {
    if (closeTimerRef.current !== null) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setShopOpen((v) => !v);
  }, []);

  useEffect(() => () => {
    if (closeTimerRef.current !== null) clearTimeout(closeTimerRef.current);
  }, []);

  /**
   * Escape closes the mega-menu and returns focus to its trigger.
   * The listener is mounted only while the menu is open, so there is no
   * always-on global key handler. Hover behaviour is untouched: this only
   * adds a keyboard path to the same `shopOpen` state the pointer already
   * drives, and every href stays exactly as it was.
   */
  useEffect(() => {
    if (!shopOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeDropdown();
        shopButtonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [shopOpen, closeDropdown]);

  return (
    <>
      <AnnouncementBar {...ANNOUNCEMENT} />

      <header
        className="sticky top-0 z-[var(--bc-z-sticky)] backdrop-blur-lg"
        style={{
          backgroundColor: scrolled ? "rgba(255,253,249,0.97)" : "rgba(255,253,249,0.92)",
          borderBottom: scrolled
            ? "1px solid var(--bc-border-default)"
            : "1px solid transparent",
          boxShadow: scrolled ? "var(--bc-shadow-sm)" : "none",
          transition:
            "background-color var(--bc-transition-base), border-color var(--bc-transition-base), box-shadow var(--bc-transition-base)",
        }}
      >
        <div
          className="mx-auto flex items-center justify-between px-6"
          style={{ maxWidth: "var(--bc-content-wide)", height: "5.5rem" }}
        >
          {/*
           * ── Wordmark ──
           * Same "Bansari" mark, given presence rather than redesigned: the
           * weight comes down from 700 to a more editorial 500, the tracking
           * opens up, and the brand's second word is restored as a fine gold
           * underline so the lockup reads as a wordmark instead of a link.
           */}
          <Link href="/" aria-label="Bansari Collections — home" className="flex flex-col leading-none">
            {/* `.bc-serif` (globals.css) rather than
                `font-[family:var(--font-playfair)]`: Tailwind v4's data-type
                hint for a font family is `family-name`, so the `family:` form
                used here generates no CSS rule at all and the mark rendered in
                the inherited sans. `.bc-serif` is the same documented chain. */}
            <span
              className="bc-serif"
              style={{
                fontSize: "1.75rem",
                fontWeight: 500,
                color: "var(--bc-brand-mauve)",
                letterSpacing: "0.1em",
                lineHeight: 1,
              }}
            >
              Bansari
            </span>
            <span
              className="uppercase"
              style={{
                marginTop: "0.375rem",
                fontSize: "0.5625rem",
                fontWeight: 500,
                letterSpacing: "0.42em",
                color: "var(--bc-text-gold)",
                lineHeight: 1,
              }}
            >
              Collections
            </span>
          </Link>

          {/* ── Desktop Nav ── */}
          <nav className="hidden items-center lg:flex" style={{ gap: "2.75rem" }}>

            {/* Shop mega-menu — hover-tolerant wrapper */}
            <div
              className="relative"
              onMouseEnter={openDropdown}
              onMouseLeave={scheduleClose}
              /* Tabbing past the last menu item closes the panel, mirroring
                 what moving the pointer away already does. relatedTarget is
                 the element receiving focus; null (e.g. focus left the
                 document) is treated as leaving. */
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                  closeDropdown();
                }
              }}
            >
              {/* Keyboard parity: the trigger was pointer-only (the wrapper's
                  onMouseEnter/Leave), so Enter/Space did nothing and
                  aria-expanded could never become true for a keyboard or
                  screen-reader user. A native <button> already fires onClick
                  for both Enter and Space, so an onClick toggle is the whole
                  fix — no key handler needed on the trigger itself. Hover is
                  unchanged. */}
              <button
                ref={shopButtonRef}
                type="button"
                onClick={toggleDropdown}
                aria-expanded={shopOpen}
                aria-controls="shop-mega-menu"
                className="bc-nav-link uppercase font-medium"
                style={{
                  fontSize: "0.6875rem",
                  letterSpacing: "0.18em",
                  background: "none",
                  border: "none",
                  borderBottom: shopOpen
                    ? "1px solid var(--bc-brand-mauve)"
                    : "1px solid transparent",
                  paddingBottom: "4px",
                  color: "var(--bc-text-primary)",
                  transition: "color var(--bc-transition-fast), border-color var(--bc-transition-fast)",
                }}
              >
                Shop
              </button>

              {shopOpen && (
                <div
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: "-1.5rem",
                    width: "560px",
                    height: "0.75rem",
                    background: "transparent",
                  }}
                />
              )}

              {shopOpen && (
                <nav
                  /*
                   * Navigation dropdown, not an ARIA application menu.
                   * role="menu"/"menuitem" promise a composite widget with
                   * arrow-key roving focus, typeahead and Home/End — a contract
                   * this panel never implemented, which left screen-reader users
                   * with a menu that announced itself as keyboard-driven and
                   * then ignored the arrow keys. These are ordinary navigation
                   * links, so a <nav> with a plain list is the honest mapping:
                   * Tab moves through the links natively and nothing is
                   * promised that is not delivered. aria-haspopup was dropped
                   * for the same reason (its valid values describe widget
                   * popups; there is no "navigation" value). aria-expanded and
                   * aria-controls are retained — both remain accurate for a
                   * disclosure that shows and hides this panel.
                   */
                  id="shop-mega-menu"
                  aria-label="Shop categories and collections"
                  className="absolute"
                  onMouseEnter={openDropdown}
                  onMouseLeave={scheduleClose}
                  style={{
                    left: "-1.5rem",
                    top: "calc(100% + 0.75rem)",
                    width: "560px",
                    backgroundColor: "#fff",
                    border: "1px solid var(--bc-border-soft)",
                    boxShadow: "var(--bc-shadow-xl)",
                    padding: "1.75rem",
                    zIndex: "var(--bc-z-dropdown)",
                  }}
                >
                  <div className="grid grid-cols-2" style={{ gap: "2rem" }}>
                    {categories.length > 0 && (
                    <div>
                      <p
                        className="uppercase tracking-[0.16em] mb-4"
                        style={{
                          fontSize: "var(--bc-text-xs)",
                          fontWeight: 500,
                          color: "var(--bc-text-gold)",
                        }}
                      >
                        Categories
                      </p>
                      <div className="flex flex-col" style={{ gap: "0.625rem" }}>
                        {categories.map(({ label, href }) => (
                          <Link
                            key={label}
                            href={href}
                            className="bc-dropdown-link"
                            style={{ fontSize: "var(--bc-text-sm)", color: "var(--bc-text-primary)" }}
                          >
                            {label}
                          </Link>
                        ))}
                      </div>
                    </div>
                    )}

                    {collections.length > 0 && (
                    <div>
                      <p
                        className="uppercase tracking-[0.16em] mb-4"
                        style={{
                          fontSize: "var(--bc-text-xs)",
                          fontWeight: 500,
                          color: "var(--bc-text-gold)",
                        }}
                      >
                        Collections
                      </p>
                      <div className="flex flex-col" style={{ gap: "0.625rem" }}>
                        {collections.map(({ label, href }) => (
                          <Link
                            key={label}
                            href={href}
                            className="bc-dropdown-link"
                            style={{ fontSize: "var(--bc-text-sm)", color: "var(--bc-text-primary)" }}
                          >
                            {label}
                          </Link>
                        ))}
                      </div>
                    </div>
                    )}
                  </div>

                  {/* "Featured: Wedding Edit 2026" panel removed — no such
                      collection exists in the catalog. Nothing is promoted
                      here until there is a real collection to promote. */}
                  <div
                    style={{
                      borderTop: "1px solid var(--bc-border-soft)",
                      backgroundColor: "var(--bc-surface-warm)",
                      padding: "1rem 1.25rem",
                      marginTop: "1.25rem",
                    }}
                  >
                    <Link
                      href="/shop"
                      className="bc-dropdown-link uppercase tracking-[0.16em]"
                      style={{ fontSize: "var(--bc-text-xs)", fontWeight: 500, color: "var(--bc-brand-mauve)" }}
                    >
                      Browse the full catalogue
                    </Link>
                  </div>
                </nav>
              )}
            </div>

            {NAV_TOP_LINKS.map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                className="bc-nav-link uppercase font-medium"
                style={{
                  fontSize: "0.6875rem",
                  letterSpacing: "0.18em",
                  color: "var(--bc-text-primary)",
                  borderBottom: "1px solid transparent",
                  paddingBottom: "4px",
                  transition: "color var(--bc-transition-fast), border-color var(--bc-transition-fast)",
                }}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* ── Icons ── */}
          <div className="flex items-center" style={{ gap: "0.375rem" }}>
            {/* ─── Sprint 9C: live search overlay ─── */}
            <HeaderSearchInput categories={categories} collections={collections} />

            <Link
              href="/wishlist"
              aria-label={`Wishlist${wishlist.length > 0 ? `, ${wishlist.length} items` : ""}`}
              className="bc-icon-btn relative rounded-full p-2.5 transition-colors"
            >
              <Heart size={19} />
              {wishlist.length > 0 && <NavBadge n={wishlist.length} />}
            </Link>

            <Link
              href="/cart"
              aria-label={`Cart${items.length > 0 ? `, ${items.length} items` : ""}`}
              className="bc-icon-btn relative rounded-full p-2.5 transition-colors"
            >
              <ShoppingBag size={19} />
              {items.length > 0 && <NavBadge n={items.length} />}
            </Link>

            <Link
              href="/auth/login"
              aria-label="Account"
              className="bc-icon-btn rounded-full p-2.5 transition-colors"
            >
              <User size={19} />
            </Link>

            <button
              aria-label="Open navigation menu"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(true)}
              className="bc-icon-btn rounded-full p-2.5 transition-colors lg:hidden"
            >
              <Menu size={21} />
            </button>
          </div>
        </div>
      </header>

      <MobileMenu
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        cartCount={items.length}
        wishlistCount={wishlist.length}
        categories={categories}
        collections={collections}
      />

      <style>{`
        .bc-nav-link:hover {
          color: var(--bc-brand-mauve) !important;
          border-bottom-color: var(--bc-brand-mauve) !important;
        }
        .bc-dropdown-link {
          display: block;
          transition: color var(--bc-transition-fast);
        }
        .bc-dropdown-link:hover {
          color: var(--bc-brand-mauve) !important;
        }
        /* 44x44 control — the WCAG 2.5.5 target minimum, and the same size the
           product card's wishlist button already uses. The ring is a box-shadow
           rather than a border so the icon never shifts by a pixel when it
           appears, and it follows the existing rounded-full shape. */
        .bc-icon-btn {
          color: var(--bc-text-primary);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 2.75rem;
          height: 2.75rem;
          transition: background-color var(--bc-transition-fast),
                      color var(--bc-transition-fast),
                      box-shadow var(--bc-transition-fast),
                      transform var(--bc-transition-fast);
        }
        .bc-icon-btn:hover {
          background-color: var(--bc-surface-warm);
          color: var(--bc-brand-mauve);
          box-shadow: 0 0 0 1px var(--bc-brand-mauve);
          transform: scale(1.02);
        }
        .bc-icon-btn:active {
          transform: scale(0.98);
        }
        .bc-icon-btn:focus-visible {
          outline: none;
          box-shadow: 0 0 0 2px var(--bc-brand-mauve);
        }
        /* globals.css zeroes --bc-transition-fast under reduced motion, which
           removes the tween but not the scale itself. A scale IS motion, so
           suppress the transform outright and keep the colour/ring feedback. */
        @media (prefers-reduced-motion: reduce) {
          .bc-icon-btn:hover,
          .bc-icon-btn:active {
            transform: none;
          }
        }
      `}</style>
    </>
  );
}

function NavBadge({ n }: { n: number }) {
  return (
    <span
      aria-hidden="true"
      className="absolute flex items-center justify-center rounded-full text-white"
      style={{
        top: "0.15rem",
        right: "0.15rem",
        width: "1.1rem",
        height: "1.1rem",
        fontSize: "0.6rem",
        fontWeight: 700,
        backgroundColor: "var(--bc-brand-mauve)",
        lineHeight: 1,
      }}
    >
      {n}
    </span>
  );
}
