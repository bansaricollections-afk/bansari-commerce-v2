"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, ShoppingBag } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { Product } from "@/types";

type Props = {
  product: Product | null;
  onClose: () => void;
};

export default function QuickViewModal({ product, onClose }: Props) {
  const { addItem } = useCart();
  const dialogRef = useRef<HTMLDivElement>(null);

  /* Close on Escape */
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  /* Trap scroll */
  useEffect(() => {
    if (product) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [product]);

  if (!product) return null;

  const primaryImage = (product.images as { url?: string }[])?.[0]?.url ?? "/placeholder.png";

  function handleAdd() {
    if (!product) return;
    addItem({ productId: product.id, quantity: 1 });
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Quick view: ${product.name}`}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(20, 18, 16, 0.62)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={dialogRef}
        className="relative flex w-full max-w-2xl flex-col overflow-hidden sm:flex-row"
        style={{
          backgroundColor: "var(--bc-surface-cream)",
          maxHeight: "90dvh",
        }}
      >
        {/* Close button */}
        <button
          type="button"
          aria-label="Close quick view"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center"
          style={{ color: "var(--bc-text-muted)" }}
        >
          <X size={16} aria-hidden="true" />
        </button>

        {/* Image */}
        <div className="relative aspect-[3/4] w-full shrink-0 sm:w-52">
          <Image
            src={primaryImage}
            alt={product.name}
            fill
            className="object-cover object-[center_12%]"
            sizes="(max-width:640px) 100vw, 208px"
            priority
          />
        </div>

        {/* Info */}
        <div
          className="flex flex-col gap-4 overflow-y-auto p-6"
          style={{ flex: 1 }}
        >
          {product.collection && (
            <p
              style={{
                fontFamily: "var(--font-inter), sans-serif",
                fontSize: "var(--bc-text-xs)",
                fontWeight: 500,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "var(--bc-brand-mauve)",
              }}
            >
              {product.collection}
            </p>
          )}

          <h2
            style={{
              fontFamily: "var(--font-playfair), serif",
              fontSize: "var(--bc-text-xl)",
              fontWeight: 400,
              color: "var(--bc-text-primary)",
              lineHeight: 1.2,
            }}
          >
            {product.name}
          </h2>

          <p
            style={{
              fontFamily: "var(--font-inter), sans-serif",
              fontSize: "var(--bc-text-base)",
              fontWeight: 600,
              color: "var(--bc-text-primary)",
            }}
          >
            &#x20B9;{product.price.toLocaleString("en-IN")}
          </p>

          {product.stock <= 5 && product.stock > 0 && (
            <p
              style={{
                fontFamily: "var(--font-inter), sans-serif",
                fontSize: "var(--bc-text-xs)",
                color: "var(--bc-brand-mauve)",
                fontWeight: 500,
              }}
            >
              Only {product.stock} left in stock
            </p>
          )}

          <div className="mt-auto flex flex-col gap-3 pt-4">
            <button
              type="button"
              disabled={product.stock === 0}
              onClick={handleAdd}
              className="flex w-full items-center justify-center gap-2 py-3 transition-opacity"
              style={{
                fontFamily: "var(--font-inter), sans-serif",
                fontSize: "var(--bc-text-xs)",
                fontWeight: 600,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                backgroundColor: product.stock === 0 ? "var(--bc-border-soft)" : "var(--bc-text-primary)",
                color: product.stock === 0 ? "var(--bc-text-muted)" : "var(--bc-surface-cream)",
                cursor: product.stock === 0 ? "not-allowed" : "pointer",
              }}
            >
              <ShoppingBag size={13} aria-hidden="true" />
              {product.stock === 0 ? "Out of Stock" : "Add to Cart"}
            </button>

            <Link
              href={`/product/${product.id}`}
              onClick={onClose}
              style={{
                fontFamily: "var(--font-inter), sans-serif",
                fontSize: "var(--bc-text-xs)",
                fontWeight: 500,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--bc-text-secondary)",
                textAlign: "center",
                textDecoration: "underline",
                textUnderlineOffset: "3px",
              }}
            >
              View Full Details
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
