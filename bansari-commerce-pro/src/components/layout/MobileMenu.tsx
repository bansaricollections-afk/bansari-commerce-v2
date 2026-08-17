"use client";

import Link from "next/link";
import { Heart, ShoppingBag, User, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { FaInstagram, FaFacebookF, FaPinterestP } from "react-icons/fa6";
import { NAV_TOP_LINKS, type NavEntry } from "./HeaderClient";

/**
 * MobileMenu
 *
 * Slide-in navigation drawer for viewports below the lg breakpoint.
 * Category and collection entries are passed down from HeaderClient, which
 * receives them from the server-derived catalog. Mobile and desktop therefore
 * render byte-identical taxonomy by construction — no duplicated arrays, and
 * no way for the two to drift apart.
 */

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
  cartCount: number;
  wishlistCount: number;
  /** Live catalog categories — same array the desktop mega-menu renders. */
  categories: NavEntry[];
  /** Live catalog collections — same array the desktop mega-menu renders. */
  collections: NavEntry[];
}

export default function MobileMenu({
  open,
  onClose,
  cartCount,
  wishlistCount,
  categories,
  collections,
}: MobileMenuProps) {
  // Lock body scroll while drawer is open.
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Focus-management refs only — no navigation or menu state is held here.
  const drawerRef      = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  // Dismiss on Escape key.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  /**
   * Focus management, matching the MobileFilterBar pattern — a small local
   * mechanism, no shared abstraction and no dependency.
   *
   * The drawer declared aria-modal="true" but never moved, contained or
   * restored focus, so the keyboard stayed on the page behind it. On open,
   * focus goes to the Close button; Tab and Shift+Tab cycle within the drawer;
   * on close, focus returns to the element that opened it (captured from
   * document.activeElement, which is the header menu button at that moment).
   * Nothing here touches navigation data, links or hrefs.
   */
  useEffect(() => {
    if (!open) return;

    const drawer = drawerRef.current;
    const opener = document.activeElement as HTMLElement | null;
    const raf = requestAnimationFrame(() => closeButtonRef.current?.focus());

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !drawer) return;
      const focusables = drawer.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      const active = document.activeElement;

      if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!drawer.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKeyDown);
      opener?.focus?.();
    };
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={[
          "fixed inset-0 z-[var(--bc-z-overlay)] bg-black/40 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        ].join(" ")}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        /* The drawer stays mounted and is translated off-canvas when closed,
           so every link and button inside it sat in the tab order while
           invisible. `inert` removes the subtree from both the tab order and
           the accessibility tree with no visual change. */
        inert={!open}
        className={[
          "fixed inset-y-0 left-0 z-[var(--bc-z-modal)] flex w-80 max-w-[90vw] flex-col",
          "bg-[var(--bc-surface-cream)] shadow-[var(--bc-shadow-xl)]",
          "transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] lg:hidden",
          open ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between border-b border-[#ECE7E2] px-6 py-5">
          <span className="font-[family:var(--font-playfair)] text-2xl font-bold tracking-wide text-[#8A5A6A]">
            Bansari
          </span>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Close navigation menu"
            className="rounded-full p-2 hover:bg-[#F6F0EB] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable nav body */}
        <nav className="flex-1 overflow-y-auto px-6 py-6 space-y-8">

          {/* Shop — Categories */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[3px] text-[var(--bc-text-muted)]">
              Categories
            </p>
            <ul className="space-y-3">
              {categories.map(({ label, href }) => (
                <li key={label}>
                  <Link
                    href={href}
                    onClick={onClose}
                    className="block text-base text-[var(--bc-text-primary)] hover:text-[#8A5A6A] transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Shop — Collections */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[3px] text-[var(--bc-text-muted)]">
              Collections
            </p>
            <ul className="space-y-3">
              {collections.map(({ label, href }) => (
                <li key={label}>
                  <Link
                    href={href}
                    onClick={onClose}
                    className="block text-base text-[var(--bc-text-primary)] hover:text-[#8A5A6A] transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Top-level links */}
          <div>
            <ul className="space-y-3">
              {NAV_TOP_LINKS.map(({ label, href }) => (
                <li key={label}>
                  <Link
                    href={href}
                    onClick={onClose}
                    className="block text-base font-medium text-[var(--bc-text-primary)] hover:text-[#8A5A6A] transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Social links */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[3px] text-[var(--bc-text-muted)]">
              Follow Us
            </p>
            <div className="flex items-center gap-4">
              <a
                href="https://instagram.com/bansari_collections"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Follow on Instagram"
                className="flex items-center gap-2 text-sm text-[var(--bc-text-secondary)] hover:text-[#8A5A6A] transition-colors"
              >
                <FaInstagram size={18} />
                Instagram
              </a>
              <a
                href="https://facebook.com/BansariCollection"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Bansari Collections on Facebook"
                className="flex items-center gap-2 text-sm text-[var(--bc-text-secondary)] hover:text-[#8A5A6A] transition-colors"
              >
                <FaFacebookF size={18} />
              </a>
              <a
                href="https://pinterest.com/BansariCollections"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Bansari Collections on Pinterest"
                className="flex items-center gap-2 text-sm text-[var(--bc-text-secondary)] hover:text-[#8A5A6A] transition-colors"
              >
                <FaPinterestP size={18} />
              </a>
            </div>
          </div>

        </nav>

        {/* Drawer footer — utility icons */}
        <div className="border-t border-[#ECE7E2] px-6 py-5 flex items-center gap-4">

          <Link
            href="/wishlist"
            onClick={onClose}
            aria-label={`Wishlist${ wishlistCount > 0 ? `, ${wishlistCount} item${wishlistCount !== 1 ? "s" : ""}` : "" }`}
            className="relative rounded-full p-3 hover:bg-[#F6F0EB] transition-colors"
          >
            <Heart size={22} />
            {wishlistCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#8A5A6A] text-xs text-white">
                {wishlistCount}
              </span>
            )}
          </Link>

          <Link
            href="/cart"
            onClick={onClose}
            aria-label={`Cart${ cartCount > 0 ? `, ${cartCount} item${cartCount !== 1 ? "s" : ""}` : "" }`}
            className="relative rounded-full p-3 hover:bg-[#F6F0EB] transition-colors"
          >
            <ShoppingBag size={22} />
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#8A5A6A] text-xs text-white">
                {cartCount}
              </span>
            )}
          </Link>

          <Link
            href="/auth/login"
            onClick={onClose}
            aria-label="Account"
            className="rounded-full p-3 hover:bg-[#F6F0EB] transition-colors"
          >
            <User size={22} />
          </Link>

        </div>
      </div>
    </>
  );
}
