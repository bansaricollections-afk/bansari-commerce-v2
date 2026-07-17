import { MapPin, Phone, Mail, MessageCircle } from "lucide-react";
import { FaInstagram, FaFacebookF, FaPinterestP } from "react-icons/fa6";

export const metadata = {
  title: "Contact Us",
  description:
    "Get in touch with Bansari Collections. Visit us at GF-4, Aruma Park, Vadodara, or reach us on WhatsApp and Instagram.",
  openGraph: {
    title: "Contact Bansari Collections",
    description: "Reach out for product enquiries, order support or wholesale information.",
  },
};

const WHATSAPP_NUMBER = "918460192745";
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=Hi%2C%20I%20have%20a%20query%20about%20Bansari%20Collections`;

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      {/* Header */}
      <div className="mb-10">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#8A5A6A]">
          Get In Touch
        </p>
        <h1 className="mb-3 font-[family:var(--font-playfair)] text-4xl font-normal text-slate-900">
          Contact Us
        </h1>
        <p className="max-w-xl text-slate-600 leading-relaxed">
          We&apos;d love to hear from you. Reach out using any of the options below —
          we typically respond within a few hours.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Contact Details */}
        <div className="rounded-2xl border border-[#ECE7E2] bg-white p-8 shadow-sm">
          <h2 className="mb-6 text-lg font-semibold text-slate-900">Contact Information</h2>

          <ul className="space-y-5">
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#F6F0EB] text-[#8A5A6A]">
                <MapPin size={16} />
              </span>
              <div>
                <p className="mb-0.5 text-xs font-semibold uppercase tracking-widest text-slate-500">Address</p>
                <address className="not-italic text-slate-700 leading-relaxed">
                  GF-4, Aruma Park,<br />
                  Near Shilchar Company, BIL,<br />
                  Vadodara, Gujarat – 391410
                </address>
              </div>
            </li>

            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#F6F0EB] text-[#8A5A6A]">
                <Phone size={16} />
              </span>
              <div>
                <p className="mb-0.5 text-xs font-semibold uppercase tracking-widest text-slate-500">Phone</p>
                <a href="tel:+918460192745" className="text-slate-700 hover:text-[#8A5A6A] transition-colors">
                  +91 84601 92745
                </a>
              </div>
            </li>

            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#F6F0EB] text-[#8A5A6A]">
                <Mail size={16} />
              </span>
              <div>
                <p className="mb-0.5 text-xs font-semibold uppercase tracking-widest text-slate-500">Email</p>
                <a href="mailto:support@bansaricollections.com" className="text-slate-700 hover:text-[#8A5A6A] transition-colors">
                  support@bansaricollections.com
                </a>
              </div>
            </li>

            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#f0fdf4] text-[#16a34a]">
                <MessageCircle size={16} />
              </span>
              <div>
                <p className="mb-0.5 text-xs font-semibold uppercase tracking-widest text-slate-500">WhatsApp</p>
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-700 hover:text-[#16a34a] transition-colors"
                >
                  +91 84601 92745
                </a>
              </div>
            </li>
          </ul>

          {/* Social links */}
          <div className="mt-7 border-t border-[#ECE7E2] pt-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Follow Us</p>
            <div className="flex items-center gap-4">
              <a
                href="https://instagram.com/bansari_collections"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Bansari Collections on Instagram"
                className="flex items-center gap-2 text-sm text-slate-600 hover:text-[#8A5A6A] transition-colors"
              >
                <FaInstagram size={18} />
                @bansari_collections
              </a>
            </div>
            <div className="mt-2 flex items-center gap-4">
              <a
                href="https://facebook.com/BansariCollection"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Bansari Collections on Facebook"
                className="flex items-center gap-2 text-sm text-slate-600 hover:text-[#8A5A6A] transition-colors"
              >
                <FaFacebookF size={16} />
                Bansari Collection
              </a>
            </div>
            <div className="mt-2 flex items-center gap-4">
              <a
                href="https://pinterest.com/BansariCollections"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Bansari Collections on Pinterest"
                className="flex items-center gap-2 text-sm text-slate-600 hover:text-[#8A5A6A] transition-colors"
              >
                <FaPinterestP size={16} />
                Bansari Collections
              </a>
            </div>
          </div>
        </div>

        {/* Support info */}
        <div className="space-y-5">
          <div className="rounded-2xl bg-[#F9F6F3] p-8">
            <h2 className="mb-3 text-lg font-semibold text-slate-900">Customer Support</h2>
            <p className="leading-relaxed text-slate-600">
              For product enquiries, order support, sizing assistance or wholesale
              information, please reach out via WhatsApp or phone. Our team responds
              promptly during business hours.
            </p>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#8A5A6A] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[#7A4A5A]"
            >
              <MessageCircle size={16} />
              Chat on WhatsApp
            </a>
          </div>

          <div className="rounded-2xl border border-[#ECE7E2] bg-white p-8">
            <h2 className="mb-3 text-lg font-semibold text-slate-900">Store Location</h2>
            <p className="text-slate-600 leading-relaxed">
              GF-4, Aruma Park,<br />
              Near Shilchar Company, BIL,<br />
              Vadodara, Gujarat – 391410
            </p>
            <p className="mt-3 text-sm text-slate-500">
              Monday – Saturday: 10:00 AM – 8:00 PM
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
