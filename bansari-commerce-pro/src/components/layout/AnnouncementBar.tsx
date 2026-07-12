"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * AnnouncementBar
 *
 * Displays a full-width promotional banner above the site header.
 *
 * Design constraints:
 * - Height is driven entirely by the --bc-announcement-h CSS token (globals.css).
 *   No JavaScript writes to :root or any inline style property.
 * - Dismissal is persisted via localStorage using an explicit versioned key
 *   (e.g. "announcement:v1"). Increment the key to re-show the bar after
 *   content changes without touching any hashing logic.
 */

export interface AnnouncementBarProps {
  /** Promotional message — supports React nodes for inline formatting. */
  message: React.ReactNode;
  /**
   * Explicit versioned localStorage key, e.g. "announcement:v1".
   * Increment the version to re-surface the bar after a content change.
   */
  storageKey: string;
  /** Optional callback fired after the user dismisses the bar. */
  onDismiss?: () => void;
  className?: string;
}

export default function AnnouncementBar({
  message,
  storageKey,
  onDismiss,
  className = "",
}: AnnouncementBarProps) {
  const [visible, setVisible] = useState(false);

  // Hydrate visibility from localStorage on the client only.
  useEffect(() => {
    try {
      if (localStorage.getItem(storageKey) !== "dismissed") {
        setVisible(true);
      }
    } catch {
      // localStorage unavailable (SSR guard, private browsing) — show bar.
      setVisible(true);
    }
  }, [storageKey]);

  function handleDismiss() {
    setVisible(false);
    try {
      localStorage.setItem(storageKey, "dismissed");
    } catch {
      // Silently ignore storage errors.
    }
    onDismiss?.();
  }

  if (!visible) return null;

  return (
    <div
      role="banner"
      aria-label="Promotional announcement"
      className={[
        // Height from design token — no inline style, no JS :root mutation.
        "h-[var(--bc-announcement-h)]",
        // Brand: deep plum background, cream text.
        "flex items-center justify-center",
        "bg-[var(--bc-brand-plum)] text-[var(--bc-text-inverse)]",
        "relative px-10",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Centring spacer — mirrors the dismiss button width so the message is truly centred. */}
      <span className="invisible w-7 shrink-0" aria-hidden="true" />

      <p className="text-center text-[var(--bc-text-xs)] tracking-wide">
        {message}
      </p>

      <button
        onClick={handleDismiss}
        aria-label="Dismiss announcement"
        className="ml-3 shrink-0 rounded-full p-1 transition-colors duration-[var(--bc-transition-fast)] hover:bg-[var(--bc-brand-plum-light)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--bc-gold-warm)]"
      >
        <X size={14} strokeWidth={2} className="text-[var(--bc-gold-warm)]" />
      </button>
    </div>
  );
}
