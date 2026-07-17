"use client";

import Link from "next/link";
import { Heart, Menu, Search, ShoppingBag, User } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useCart } from "@/store/cart";
import { useWishlist } from "@/store/wishlist";
import AnnouncementBar, { type AnnouncementBarProps } from "./AnnouncementBar";
import MobileMenu from "./MobileMenu";

export const NAV_CATEGORIES = [
  "Kurta Sets",
  "Ethnic Dresses",
  "Sarees",
  "Lehengas",
  "Co-ord Sets",
  "Gowns",
] as const;

export const NAV_COLLECTIONS = [
  "New Arrivals",
  "Best Sellers",
  "Wedding Edit",
  "Festive Edit",
  "Office Edit",
] as const;

export const NAV_TOP_LINKS = [
  { label: "New Arrivals", href: "/new-arrivals" },
  { label: "Collections",  href: "/collections" },
  { label: "About",        href: "/about" },
  { label: "Contact",      href: "/contact" },
] as const;

const ANNOUNCEMENT: AnnouncementBarProps = {
  storageKey: "announcement:v3",
};

/**
 * SHOP DROPDOWN — hover tolerance fix
 *
 * Problem: React's onMouseLeave fires the instant the pointer leaves the
 * trigger element boundary, even if the pointer is heading straight for the
 * dropdown panel. Any mouse path that travels diagonally from the trigger
 * label into the panel briefly exits the trigger bounding box, causing the
 * panel to vanish before the pointer arrives.
 *
 * Solution: add a 120 ms close-delay via setTimeout. If the pointer enters
 * the dropdown panel (or returns to the trigger) before the timer fires, the
 * timer is cancelled and the panel stays open. This is exactly how Zara,
 * H&M and most premium fashion retailers implement their mega-menus without
 * heavyweight libraries.
 *
 * Implementation details:
 * - closeTimerRef: stores the pending setTimeout id so we can cancel it.
 * - openDropdown(): clears any pending close timer and sets shopOpen = true.
 * - scheduleClose(): starts the 120 ms countdown; called on both trigger and
 *   panel mouse-leave.
 * - The dropdown container wraps both trigger and panel in a single <div>
 *   so we can attach onMouseEnter/Leave to the outer wrapper. The wrapper
 *   also has pointer-events: none gap elimination via a transparent
 *   bridge element (bc-dropdown-bridge) that sits in the ~0.5 rem gap
 *   between the trigger button bottom and the panel top, preventing the
 *   pointer from exiting the hover region while crossing that gap.
 */
export default function Header() {
  const { items }           = useCart();
  const { items: wishlist } = useWishlist();
  const [shopOpen, setShopOpen]     = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled]     = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Clean up timer on unmount
  useEffect(() => () => {
    if (closeTimerRef.current !== null) clearTimeout(closeTimerRef.current);
  }, []);

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
          style={{ maxWidth: "var(--bc-content-wide)", height: "5rem" }}
        >
          {/* ── Logo ── */}
          <Link
            href="/"
            className="font-[family:var(--font-playfair)] tracking-wide"
            style={{
              fontSize: "1.75rem",
              fontWeight: 700,
              color: "var(--bc-brand-mauve)",
              letterSpacing: "0.06em",
            }}
          >
            Bansari
          </Link>

          {/* ── Desktop Nav ── */}
          <nav className="hidden items-center lg:flex" style={{ gap: "2.25rem" }}>

            {/* Shop mega-menu — hover-tolerant wrapper */}
            <div
              className="relative"
              onMouseEnter={openDropdown}
              onMouseLeave={scheduleClose}
            >
              <button
                aria-expanded={shopOpen}
                aria-haspopup="true"
                className="bc-nav-link uppercase tracking-[0.12em] font-medium"
                style={{
                  fontSize: "var(--bc-text-xs)",
                  background: "none",
                  border: "none",
                  borderBottom: shopOpen
                    ? "1px solid var(--bc-brand-mauve)"
                    : "1px solid transparent",
                  paddingBottom: "2px",
                  color: "var(--bc-text-primary)",
                  transition: "color var(--bc-transition-fast), border-color var(--bc-transition-fast)",
                }}
              >
                Shop
              </button>

              {/* Transparent bridge: fills the gap between trigger and panel
                  so moving the cursor downward does not exit the hover zone */}
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
                <div
                  role="menu"
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
                        {NAV_CATEGORIES.map((item) => (
                          <Link
                            key={item}
                            href="/shop"
                            role="menuitem"
                            className="bc-dropdown-link"
                            style={{ fontSize: "var(--bc-text-sm)", color: "var(--bc-text-primary)" }}
                          >
                            {item}
                          </Link>
                        ))}
                      </div>
                    </div>

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
                        {NAV_COLLECTIONS.map((item) => (
                          <Link
                            key={item}
                            href="/shop"
                            role="menuitem"
                            className="bc-dropdown-link"
                            style={{ fontSize: "var(--bc-text-sm)", color: "var(--bc-text-primary)" }}
                          >
                            {item}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      borderTop: "1px solid var(--bc-border-soft)",
                      backgroundColor: "var(--bc-surface-warm)",
                      padding: "1rem 1.25rem",
                      marginTop: "1.25rem",
                    }}
                  >
                    <p
                      className="uppercase tracking-[0.16em]"
                      style={{ fontSize: "var(--bc-text-xs)", fontWeight: 500, color: "var(--bc-brand-mauve)" }}
                    >
                      Featured
                    </p>
                    <p
                      className="font-[family:var(--font-playfair)] mt-1"
                      style={{ fontSize: "var(--bc-text-lg)", fontWeight: 400, color: "var(--bc-text-primary)" }}
                    >
                      Wedding Edit 2026
                    </p>
                  </div>
                </div>
              )}
            </div>

            {NAV_TOP_LINKS.map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                className="bc-nav-link uppercase tracking-[0.12em] font-medium"
                style={{
                  fontSize: "var(--bc-text-xs)",
                  color: "var(--bc-text-primary)",
                  borderBottom: "1px solid transparent",
                  paddingBottom: "2px",
                  transition: "color var(--bc-transition-fast), border-color var(--bc-transition-fast)",
                }}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* ── Icons ── */}
          <div className="flex items-center" style={{ gap: "0.125rem" }}>
            <button
              aria-label="Search"
              className="bc-icon-btn rounded-full p-2.5 transition-colors"
            >
              <Search size={19} />
            </button>

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
        .bc-icon-btn {
          color: var(--bc-text-primary);
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .bc-icon-btn:hover {
          background-color: var(--bc-surface-warm);
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
