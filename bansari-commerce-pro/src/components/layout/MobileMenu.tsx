"use client";

import Link from "next/link";
import { Heart, ShoppingBag, User, X } from "lucide-react";
import { useEffect } from "react";
import {
  NAV_CATEGORIES,
  NAV_COLLECTIONS,
  NAV_TOP_LINKS,
} from "./Header";

/**
 * MobileMenu
 *
 * Slide-in navigation drawer for viewports below the lg breakpoint.
 * Reuses NAV_CATEGORIES, NAV_COLLECTIONS, and NAV_TOP_LINKS from Header.tsx
 * as the single source of truth — no duplicated navigation definitions.
 */

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
  cartCount: number;
  wishlistCount: number;
}

export default function MobileMenu({
  open,
  onClose,
  cartCount,
  wishlistCount,
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

  // Dismiss on Escape key.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

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
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
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
              {NAV_CATEGORIES.map((item) => (
                <li key={item}>
                  <Link
                    href="/shop"
                    onClick={onClose}
                    className="block text-base text-[var(--bc-text-primary)] hover:text-[#8A5A6A] transition-colors"
                  >
                    {item}
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
              {NAV_COLLECTIONS.map((item) => (
                <li key={item}>
                  <Link
                    href="/shop"
                    onClick={onClose}
                    className="block text-base text-[var(--bc-text-primary)] hover:text-[#8A5A6A] transition-colors"
                  >
                    {item}
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
