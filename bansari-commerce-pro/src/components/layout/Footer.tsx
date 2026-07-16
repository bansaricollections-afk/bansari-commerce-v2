"use client";

import Link from "next/link";
import { MapPin, Phone, Mail } from "lucide-react";
import { FaInstagram, FaFacebookF } from "react-icons/fa6";

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
  "Cash on Delivery",
] as const;

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
              marginBottom: "var(--bc-space-5)",
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
              marginBottom: "var(--bc-space-8)",
            }}
          >
            Thoughtfully curated ethnic wear designed for weddings,
            celebrations and timeless elegance.
          </p>

          {/* Social */}
          <div className="flex items-center" style={{ gap: "var(--bc-space-3)" }}>
            <a
              href="https://instagram.com/bansaricollections"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow Bansari Collections on Instagram"
              className="bc-social-link"
            >
              <FaInstagram size={16} />
            </a>
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Bansari Collections on Facebook"
              className="bc-social-link"
            >
              <FaFacebookF size={16} />
            </a>
          </div>
        </div>

        {/* ── Col 2: Shop ── */}
        <div>
          <p
            className="uppercase tracking-[0.16em]"
            style={{
              fontSize: "var(--bc-text-xs)",
              fontWeight: 500,
              color: "var(--bc-text-gold)",
              marginBottom: "var(--bc-space-5)",
            }}
          >
            Shop
          </p>
          <ul className="bc-footer-list">
            {SHOP_LINKS.map(({ label, href }) => (
              <li key={label}>
                <Link href={href} className="bc-footer-link">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* ── Col 3: Customer Care ── */}
        <div>
          <p
            className="uppercase tracking-[0.16em]"
            style={{
              fontSize: "var(--bc-text-xs)",
              fontWeight: 500,
              color: "var(--bc-text-gold)",
              marginBottom: "var(--bc-space-5)",
            }}
          >
            Customer Care
          </p>
          <ul className="bc-footer-list">
            {POLICY_LINKS.map(({ label, href }) => (
              <li key={label}>
                <Link href={href} className="bc-footer-link">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* ── Col 4: Contact ── */}
        <div>
          <p
            className="uppercase tracking-[0.16em]"
            style={{
              fontSize: "var(--bc-text-xs)",
              fontWeight: 500,
              color: "var(--bc-text-gold)",
              marginBottom: "var(--bc-space-5)",
            }}
          >
            Contact
          </p>

          <div className="flex flex-col" style={{ gap: "var(--bc-space-5)" }}>
            <div className="flex items-start" style={{ gap: "var(--bc-space-3)" }}>
              <MapPin
                size={15}
                style={{
                  color: "var(--bc-text-gold)",
                  flexShrink: 0,
                  marginTop: "0.2rem",
                  opacity: 0.7,
                }}
              />
              <address
                className="not-italic"
                style={{
                  fontSize: "var(--bc-text-xs)",
                  lineHeight: 1.75,
                  color: "var(--bc-text-inverse)",
                  opacity: 0.55,
                }}
              >
                GF-4, Aruma Park, Near Shilchar,
                <br />
                Bil, Vadodara, Gujarat — 391410
              </address>
            </div>

            <a
              href="tel:+918460192745"
              className="bc-footer-link flex items-center"
              style={{ gap: "var(--bc-space-3)" }}
            >
              <Phone
                size={15}
                style={{ color: "var(--bc-text-gold)", opacity: 0.7, flexShrink: 0 }}
              />
              <span style={{ fontSize: "var(--bc-text-xs)" }}>+91 84601 92745</span>
            </a>

            <a
              href="mailto:support@bansaricollections.com"
              className="bc-footer-link flex items-center"
              style={{ gap: "var(--bc-space-3)" }}
            >
              <Mail
                size={15}
                style={{ color: "var(--bc-text-gold)", opacity: 0.7, flexShrink: 0 }}
              />
              <span style={{ fontSize: "var(--bc-text-xs)" }}>support@bansaricollections.com</span>
            </a>
          </div>
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div
        style={{
          borderTop: "1px solid var(--bc-border-dark)",
        }}
      >
        <div
          className="mx-auto bc-footer-bottom"
          style={{
            maxWidth: "var(--bc-content-wide)",
            paddingInline: "var(--bc-gutter)",
            paddingBlock: "var(--bc-space-6)",
          }}
        >
          {/* Copyright */}
          <p
            style={{
              fontSize: "var(--bc-text-xs)",
              color: "var(--bc-text-inverse)",
              opacity: 0.4,
            }}
          >
            &copy; {new Date().getFullYear()} Bansari Collections. All rights reserved.
          </p>

          {/* Trust + Payment */}
          <div className="flex flex-wrap items-center" style={{ gap: "var(--bc-space-6)" }}>
            {/* Trust items */}
            <div className="flex flex-wrap items-center" style={{ gap: "var(--bc-space-5)" }}>
              {TRUST_ITEMS.map((item) => (
                <span
                  key={item}
                  className="uppercase tracking-[0.1em]"
                  style={{
                    fontSize: "var(--bc-text-xs)",
                    color: "var(--bc-text-inverse)",
                    opacity: 0.45,
                    fontWeight: 500,
                  }}
                >
                  {item}
                </span>
              ))}
            </div>

            {/* Vertical separator */}
            <span
              aria-hidden="true"
              style={{
                display: "inline-block",
                width: "1px",
                height: "1rem",
                backgroundColor: "var(--bc-border-dark)",
              }}
            />

            {/* Payment methods */}
            <div className="flex flex-wrap items-center" style={{ gap: "var(--bc-space-3)" }}>
              {PAYMENT_METHODS.map((m) => (
                <span
                  key={m}
                  style={{
                    fontSize: "var(--bc-text-xs)",
                    color: "var(--bc-text-inverse)",
                    opacity: 0.35,
                    border: "1px solid var(--bc-border-dark)",
                    padding: "0.2rem 0.5rem",
                    letterSpacing: "0.06em",
                  }}
                >
                  {m}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .bc-footer-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: var(--bc-space-12);
        }
        @media (min-width: 640px) {
          .bc-footer-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (min-width: 1024px) {
          .bc-footer-grid {
            grid-template-columns: 1.6fr 1fr 1.2fr 1.4fr;
            gap: var(--bc-space-16);
          }
          .bc-footer-brand { grid-column: 1; }
        }
        .bc-footer-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: var(--bc-space-3);
        }
        .bc-footer-link {
          font-size: var(--bc-text-xs);
          color: var(--bc-text-inverse);
          opacity: 0.55;
          text-decoration: none;
          transition: opacity var(--bc-transition-fast), color var(--bc-transition-fast);
        }
        .bc-footer-link:hover { opacity: 1; color: var(--bc-text-gold); }
        .bc-social-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 2.25rem;
          height: 2.25rem;
          border: 1px solid var(--bc-border-dark);
          color: var(--bc-text-inverse);
          opacity: 0.6;
          transition: opacity var(--bc-transition-fast), border-color var(--bc-transition-fast);
        }
        .bc-social-link:hover { opacity: 1; border-color: var(--bc-gold-warm); color: var(--bc-text-gold); }
        .bc-footer-bottom {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: var(--bc-space-4);
        }
        @media (min-width: 768px) {
          .bc-footer-bottom {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
          }
        }
      `}</style>
    </footer>
  );
}
