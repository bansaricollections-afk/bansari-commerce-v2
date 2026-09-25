"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";

export interface AnnouncementBarProps {
  /** Versioned localStorage key — increment to re-surface after content changes */
  storageKey: string;
  /** Live coupon line; shown first and longest when present. */
  offer?: string | null;
  onDismiss?: () => void;
  className?: string;
}

// Every line must be supported by a published policy or an observable fact.
// Removed: the ₹999 free-shipping threshold (no such commitment exists in the
// shipping policy), "Trusted by 10,000+ customers" (no sales data supports it),
// and "The Festive Edit is now live" (no such collection exists).
const MESSAGES = [
  "Dispatched in 1–2 business days",
  "Secure payments · UPI & cards",
  /*
   * Was "Tracking details sent by SMS and email once your order ships".
   *
   * There is no SMS integration in this codebase — no provider, no client, no
   * credentials — so that line promised something that could not happen. A
   * real customer chased a missing SMS that was never going to arrive.
   *
   * Reworded to email only, which IS implemented (email.service.ts sends on
   * ship, out-for-delivery and delivered). Restore the SMS wording only if an
   * SMS provider is actually wired up.
   */
  "Tracking sent by email",
  "Easy 7-day returns",
];

export default function AnnouncementBar({
  storageKey,
  offer = null,
  onDismiss,
  className = "",
}: AnnouncementBarProps) {
  /*
   * Starts VISIBLE, and hides on mount only if the visitor dismissed it.
   *
   * This used to start `false` and flip to `true` in the effect below, so the
   * bar rendered as nothing on the server and on first paint, then appeared
   * after hydration and pushed the whole page down — a layout shift on every
   * first visit. PageSpeed measures precisely that case (fresh session, empty
   * localStorage) and desktop CLS was 0.332 against a 0.1 budget.
   *
   * Inverting it means the common path — a visitor who has not dismissed the
   * bar — has no shift at all. A returning visitor who dismissed it sees the
   * bar disappear once on load instead, which is the rarer case and shifts
   * content upward rather than pushing it down under the cursor.
   */
  const messages = offer ? [offer, ...MESSAGES] : MESSAGES;
  const [visible, setVisible] = useState(true);
  const [msgIndex, setMsgIndex] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(storageKey) === "dismissed") setVisible(false);
    } catch {
      /* localStorage unavailable (private mode) — leave the bar visible. */
    }
  }, [storageKey]);

  useEffect(() => {
    if (!visible) return;
    const id = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setMsgIndex((i) => (i + 1) % messages.length);
        setFading(false);
      }, 350);
    }, 4500);
    return () => clearInterval(id);
  }, [visible, messages.length]);

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
        className="truncate whitespace-nowrap text-center tracking-[0.06em] uppercase sm:tracking-[0.1em]"
        style={{
          fontSize: "var(--bc-text-xs)",
          opacity: fading ? 0 : 1,
          transform: fading ? "translateY(-4px)" : "translateY(0)",
          transition: "opacity 350ms ease, transform 350ms ease",
        }}
      >
        {messages[msgIndex % messages.length]}
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
