import Link from "next/link";
import { MapPin, Phone, Mail } from "lucide-react";
import {
  FaInstagram,
  FaFacebookF,
  FaLinkedinIn,
} from "react-icons/fa";

export default function Footer() {
  return (
    <footer className="bg-[#2F2A28] text-white">
      <div className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <h2 className="font-[family:var(--font-playfair)] text-4xl font-bold text-[#C9A96E]">
              Bansari Collections
            </h2>

            <p className="mt-6 max-w-md leading-8 text-gray-300">
              Discover thoughtfully curated ethnic wear designed for weddings,
              celebrations, festive occasions and timeless elegance.
            </p>

            <div className="mt-8 flex gap-4">
              <a
                href="https://instagram.com/bansaricollections"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-white/10 p-3 transition hover:bg-[#8A5A6A]"
              >
                <FaInstagram size={18} />
              </a>

              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-white/10 p-3 transition hover:bg-[#8A5A6A]"
              >
                <FaFacebookF size={18} />
              </a>

              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-white/10 p-3 transition hover:bg-[#8A5A6A]"
              >
                <FaLinkedinIn size={18} />
              </a>
            </div>
          </div>

          <div>
            <h3 className="mb-6 text-xl font-semibold">
              Shop
            </h3>

            <ul className="space-y-3 text-gray-300">
              <li><Link href="/shop">All Products</Link></li>
              <li><Link href="/collections">Collections</Link></li>
              <li><Link href="/new-arrivals">New Arrivals</Link></li>
              <li><Link href="/wishlist">Wishlist</Link></li>
              <li><Link href="/cart">Shopping Cart</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-6 text-xl font-semibold">
              Customer Care
            </h3>

            <ul className="space-y-3 text-gray-300">
              <li><Link href="/about">About Us</Link></li>
              <li><Link href="/contact">Contact Us</Link></li>
              <li><Link href="/faq">FAQ</Link></li>
              <li><Link href="/shipping-policy">Shipping Policy</Link></li>
              <li><Link href="/return-refund-policy">Return & Refund Policy</Link></li>
              <li><Link href="/cancellation-policy">Cancellation Policy</Link></li>
              <li><Link href="/privacy-policy">Privacy Policy</Link></li>
              <li><Link href="/terms-and-conditions">Terms & Conditions</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-6 text-xl font-semibold">
              Contact
            </h3>

            <div className="space-y-5 text-gray-300">
              <div className="flex items-start gap-3">
                <MapPin size={18} className="mt-1" />
                <span>
                  GF-4, Aruma Park,
                  <br />
                  Near Shilchar,
                  <br />
                  Bil, Vadodara,
                  <br />
                  Gujarat - 391410
                </span>
              </div>

              <div className="flex items-center gap-3">
                <Phone size={18} />
                <span>+91 84601 92745</span>
              </div>

              <div className="flex items-center gap-3">
                <Mail size={18} />
                <span>support@bansaricollections.com</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-6 text-sm text-gray-400 md:flex-row">
          <p>
            © {new Date().getFullYear()} Bansari Collections. All Rights Reserved.
          </p>

          <div className="flex flex-wrap gap-6">
            <span>🔒 Secure Payments</span>
            <span>🚚 PAN India Delivery</span>
            <span>↩ Easy Returns</span>
            <span>✔ Quality Checked</span>
          </div>
        </div>
      </div>
    </footer>
  );
}