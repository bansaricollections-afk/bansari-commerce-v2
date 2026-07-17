"use client";

import Link from "next/link";
import { MapPin, Phone, Mail, MessageCircle } from "lucide-react";
import { FaInstagram, FaFacebookF, FaPinterestP } from "react-icons/fa6";

const SHOP_LINKS = [
  { label: "All Products",  href: "/shop" },
  { label: "Collections",   href: "/collections" },
  { label: "New Arrivals",  href: "/new-arrivals" },
  { label: "Best Sellers",  href: "/shop" },
  { label: "Wedding Edit",  href: "/shop" },
  { label: "Wishlist",      href: "/wishlist" },
] as const;

const POLICY_LINKS = [
  { label: "About Us",               href: "/about" },
  { label: "Contact Us",             href: "/contact" },
  { label: "FAQ",                    href: "/faq" },
  { label: "Shipping Policy",        href: "/shipping-policy" },
  { label: "Return & Refund",        href: "/return-refund-policy" },
  { label: "Cancellation Policy",    href: "/cancellation-policy" },
  { label: "Privacy Policy",         href: "/privacy-policy" },
  { label: "Terms & Conditions",     href: "/terms-and-conditions" },
] as const;

const TRUST_ITEMS = [
  "Secure Payments",
  "PAN India Delivery",
  "Easy 7-Day Returns",
  "Quality Checked",
] as const;

const PAYMENT_METHODS = [
  "Visa",
  "Mastercard",
  "UPI",
  "Razorpay",
  "Net Banking",
] as const;

const WHATSAPP_NUMBER = "918460192745";
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=Hi%2C%20I%20have%20a%20query%20about%20Bansari%20Collections`;

export default function Footer() {
  return (
    <footer
      style={{
        backgroundColor: "var(--bc-surface-dark)",
        color: "var(--bc-text-inverse)",
        borderTop: "1px solid var(--bc-border-dark)",
      }}
    >
      {/* ── Main grid ── */}
      <div
        className="mx-auto bc-footer-grid"
        style={{
          maxWidth: "var(--bc-content-wide)",
          paddingInline: "var(--bc-gutter)",
          paddingTop: "var(--bc-space-20)",
          paddingBottom: "var(--bc-space-16)",
        }}
      >
        {/* ── Col 1: Brand ── */}
        <div className="bc-footer-brand">
          <p
            className="font-[family:var(--font-playfair)]"
            style={{
              fontSize: "var(--bc-text-xl)",
              fontWeight: 400,
              color: "var(--bc-text-gold)",
              letterSpacing: "0.04em",
              marginBottom: "var(--bc-space-3)",
            }}
          >
            Bansari Collections
          </p>

          <p
            style={{
              fontSize: "var(--bc-text-sm)",
              lineHeight: 1.8,
              color: "var(--bc-text-inverse)",
              opacity: 0.55,
              maxWidth: "30ch",
              marginBottom: "var(--bc-space-6)",
            }}
          >
            Thoughtfully curated ethnic wear designed for weddings,
            celebrations and timeless elegance.
          </p>

          {/* Social */}
          <div className="flex items-center" style={{ gap: "var(--bc-space-3)", marginBottom: "var(--bc-space-6)" }}>
            <a
              href="https://instagram.com/bansari_collections"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow Bansari Collections on Instagram"
              className="bc-social-link"
            >
              <FaInstagram size={16} />
            </a>
            <a
              href="https://facebook.com/BansariCollection"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Bansari Collections on Facebook"
              className="bc-social-link"
            >
              <FaFacebookF size={16} />
            </a>
            <a
              href="https://pinterest.com/BansariCollections"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Bansari Collections on Pinterest"
              className="bc-social-link"
            >
              <FaPinterestP size={16} />
            </a>
          </div>

          {/* WhatsApp CTA */}
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Chat with us on WhatsApp"
            className="bc-whatsapp-btn"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "var(--bc-text-xs)",
              fontWeight: 500,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#25D366",
              border: "1px solid rgba(37,211,102,0.35)",
              padding: "0.5rem 1rem",
              borderRadius: "var(--bc-radius-full)",
              transition: "border-color 0.2s, background-color 0.2s",
            }}
          >
            <MessageCircle size={14} />
            WhatsApp Us
          </a>
        </div>

        {/* ── Col 2: Shop ── */}
        <div>
          <p
            className="bc-footer-heading"
            style={{
              fontSize: "var(--bc-text-xs)",
              fontWeight: 600,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "var(--bc-text-inverse)",
              opacity: 0.4,
              marginBottom: "var(--bc-space-5)",
            }}
          >
            Shop
          </p>
          <ul style={{ display: "flex", flexDirection: "column", gap: "var(--bc-space-3)" }}>
            {SHOP_LINKS.map((l) => (
              <li key={l.label}>
                <Link
                  href={l.href}
                  style={{
                    fontSize: "var(--bc-text-sm)",
                    color: "var(--bc-text-inverse)",
                    opacity: 0.65,
                    textDecoration: "none",
                    transition: "opacity var(--bc-transition-base)",
                  }}
                  className="bc-footer-link"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* ── Col 3: Policies ── */}
        <div>
          <p
            className="bc-footer-heading"
            style={{
              fontSize: "var(--bc-text-xs)",
              fontWeight: 600,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "var(--bc-text-inverse)",
              opacity: 0.4,
              marginBottom: "var(--bc-space-5)",
            }}
          >
            Support
          </p>
          <ul style={{ display: "flex", flexDirection: "column", gap: "var(--bc-space-3)" }}>
            {POLICY_LINKS.map((l) => (
              <li key={l.label}>
                <Link
                  href={l.href}
                  style={{
                    fontSize: "var(--bc-text-sm)",
                    color: "var(--bc-text-inverse)",
                    opacity: 0.65,
                    textDecoration: "none",
                    transition: "opacity var(--bc-transition-base)",
                  }}
                  className="bc-footer-link"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* ── Col 4: Contact + Trust ── */}
        <div>
          <p
            className="bc-footer-heading"
            style={{
              fontSize: "var(--bc-text-xs)",
              fontWeight: 600,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "var(--bc-text-inverse)",
              opacity: 0.4,
              marginBottom: "var(--bc-space-5)",
            }}
          >
            Contact
          </p>
          <ul style={{ display: "flex", flexDirection: "column", gap: "var(--bc-space-4)" }}>
            <li className="flex items-start gap-2" style={{ fontSize: "var(--bc-text-sm)", opacity: 0.65 }}>
              <MapPin size={14} className="mt-0.5 flex-shrink-0" />
              <span>
                GF-4, Aruma Park,<br />
                Near Shilchar Company, BIL,<br />
                Vadodara, Gujarat – 391410
              </span>
            </li>
            <li style={{ fontSize: "var(--bc-text-sm)", opacity: 0.65 }}>
              <a href="tel:+918460192745" className="flex items-center gap-2 hover:opacity-100 transition-opacity">
                <Phone size={14} className="flex-shrink-0" />
                +91 84601 92745
              </a>
            </li>
            <li style={{ fontSize: "var(--bc-text-sm)", opacity: 0.65 }}>
              <a href="mailto:support@bansaricollections.com" className="flex items-center gap-2 hover:opacity-100 transition-opacity">
                <Mail size={14} className="flex-shrink-0" />
                support@bansaricollections.com
              </a>
            </li>
            <li style={{ fontSize: "var(--bc-text-sm)", opacity: 0.65 }}>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:opacity-100 transition-opacity"
                aria-label="Chat on WhatsApp"
              >
                <MessageCircle size={14} className="flex-shrink-0" />
                WhatsApp: +91 84601 92745
              </a>
            </li>
          </ul>

          {/* Trust strip */}
          <div
            style={{
              marginTop: "var(--bc-space-8)",
              paddingTop: "var(--bc-space-6)",
              borderTop: "1px solid rgba(255,255,255,0.08)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--bc-space-2)",
            }}
          >
            {TRUST_ITEMS.map((t) => (
              <span
                key={t}
                style={{ fontSize: "var(--bc-text-xs)", color: "var(--bc-text-inverse)", opacity: 0.45 }}
              >
                ✓ {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div
        style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          paddingInline: "var(--bc-gutter)",
          paddingBlock: "var(--bc-space-5)",
        }}
      >
        <div
          className="mx-auto flex flex-col sm:flex-row items-center justify-between gap-3"
          style={{ maxWidth: "var(--bc-content-wide)" }}
        >
          <p style={{ fontSize: "var(--bc-text-xs)", opacity: 0.35 }}>
            © {new Date().getFullYear()} Bansari Collections. All rights reserved.
          </p>
          <p style={{ fontSize: "var(--bc-text-xs)", opacity: 0.35 }}>
            We accept: {PAYMENT_METHODS.join(" · ")} &nbsp;|&nbsp; Online Payment Only
          </p>
        </div>
      </div>
    </footer>
  );
}
