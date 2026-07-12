"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Heart, ShoppingBag, User } from "lucide-react";

import { useCart } from "@/store/cart";
import { useWishlist } from "@/store/wishlist";

const navItems = [
  { href: "/",        label: "Home",     icon: Home },
  { href: "/shop",    label: "Search",   icon: Search },
  { href: "/wishlist",label: "Wishlist", icon: Heart },
  { href: "/cart",    label: "Cart",     icon: ShoppingBag },
  { href: "/auth/login", label: "Account", icon: User },
] as const;

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { items: cartItems } = useCart();
  const { items: wishlistItems } = useWishlist();

  const cartCount = cartItems.length;
  const wishlistCount = wishlistItems.length;

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#ECE7E2] bg-white/95 backdrop-blur-lg lg:hidden"
    >
      <div className="flex h-16 items-center justify-around px-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          const isWishlist = href === "/wishlist";
          const isCart = href === "/cart";

          const badge =
            isCart && cartCount > 0
              ? cartCount
              : isWishlist && wishlistCount > 0
              ? wishlistCount
              : null;

          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className={`relative flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-[10px] font-medium transition-colors ${
                isActive
                  ? "text-[#8A5A6A]"
                  : "text-gray-500 hover:text-[#8A5A6A]"
              }`}
            >
              <span className="relative">
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.2 : 1.8}
                />

                {badge !== null && (
                  <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-[#8A5A6A] text-[9px] text-white">
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </span>

              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
