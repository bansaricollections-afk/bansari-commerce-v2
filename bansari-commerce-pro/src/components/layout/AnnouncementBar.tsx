"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";

export interface AnnouncementBarProps {
  /** Versioned localStorage key — increment to re-surface after content changes */
  storageKey: string;
  onDismiss?: () => void;
  className?: string;
}

// Every line must be supported by a published policy or an observable fact.
// Removed: the ₹999 free-shipping threshold (no such commitment exists in the
// shipping policy), "Trusted by 10,000+ customers" (no sales data supports it),
// and "The Festive Edit is now live" (no such collection exists).
const MESSAGES = [
  "Shipping across India · Dispatched in 1–2 business days",
  "Secure online payments · UPI, cards & net banking accepted",
  "Tracking details sent by SMS and email once your order ships",
  "Easy 7-day returns as per our Return & Refund Policy",
];

export default function AnnouncementBar({
  storageKey,
  onDismiss,
  className = "",
}: AnnouncementBarProps) {
  const [visible, setVisible] = useState(false);
  const [msgIndex, setMsgIndex] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(storageKey) !== "dismissed") setVisible(true);
    } catch {
      setVisible(true);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!visible) return;
    const id = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setMsgIndex((i) => (i + 1) % MESSAGES.length);
        setFading(false);
      }, 350);
    }, 4500);
    return () => clearInterval(id);
  }, [visible]);

  function handleDismiss() {
    setVisible(false);
    try { localStorage.setItem(storageKey, "dismissed"); } catch { /* noop */ }
    onDismiss?.();
  }

  if (!visible) return null;

  return (
    <div
      role="banner"
      aria-label="Promotional announcement"
      className={[
        "h-[var(--bc-announcement-h)]",
        "flex items-center justify-center",
        "bg-[var(--bc-brand-plum)] text-[var(--bc-text-inverse)]",
        "relative px-10 overflow-hidden",
        className,
      ].filter(Boolean).join(" ")}
    >
      <span className="invisible w-7 shrink-0" aria-hidden="true" />

      <p
        className="text-center tracking-[0.12em] uppercase"
        style={{
          fontSize: "var(--bc-text-xs)",
          opacity: fading ? 0 : 1,
          transform: fading ? "translateY(-4px)" : "translateY(0)",
          transition: "opacity 350ms ease, transform 350ms ease",
        }}
      >
        {MESSAGES[msgIndex]}
      </p>

      <button
        onClick={handleDismiss}
        aria-label="Dismiss announcement"
        className="ml-3 shrink-0 rounded-full p-1 transition-colors hover:bg-[var(--bc-brand-plum-light)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--bc-gold-warm)]"
      >
        <X size={14} strokeWidth={2} className="text-[var(--bc-gold-warm)]" />
      </button>
    </div>
  );
}
