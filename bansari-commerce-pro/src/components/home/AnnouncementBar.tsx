"use client";

import { useEffect, useRef, useState } from "react";

const MESSAGES = [
  { text: "Free shipping on orders above ₹999", highlight: "Free shipping" },
  { text: "Handcrafted with love in India — Est. 2018", highlight: "Handcrafted with love" },
  { text: "New arrivals every Friday — Shop the latest edit", highlight: "New arrivals every Friday" },
  { text: "Easy 7-day returns · WhatsApp support 24/7", highlight: "Easy 7-day returns" },
];

export default function AnnouncementBar() {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timer.current = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx(i => (i + 1) % MESSAGES.length);
        setVisible(true);
      }, 320);
    }, 4200);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, []);

  if (dismissed) return null;

  const msg = MESSAGES[idx];

  return (
    <div
      role="banner"
      aria-label="Announcement"
      style={{
        background: "var(--bc-brand-plum)",
        height: "2.5rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        zIndex: "var(--bc-z-sticky)" as string,
      }}
    >
      {/* Gold accent lines */}
      <span style={{
        position: "absolute", left: 0, top: 0, bottom: 0, width: "3px",
        background: "var(--bc-gold)",
      }} />
      <span style={{
        position: "absolute", right: 0, top: 0, bottom: 0, width: "3px",
        background: "var(--bc-gold)",
      }} />

      <p
        aria-live="polite"
        style={{
          margin: 0,
          fontSize: "0.75rem",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "rgba(255,253,249,0.85)",
          fontFamily: "var(--font-inter), sans-serif",
          fontWeight: 400,
          transition: "opacity 320ms ease, transform 320ms ease",
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(-6px)",
          textAlign: "center",
          paddingInline: "2rem",
        }}
      >
        <span
          style={{
            color: "var(--bc-gold-light)",
            fontWeight: 500,
            marginRight: "0.35em",
          }}
        >
          ✦
        </span>
        {msg.text.split(msg.highlight).map((part, i) =>
          i === 0 ? (
            <span key={i}>
              {part}
              {i < msg.text.split(msg.highlight).length - 1 && (
                <span style={{ color: "var(--bc-gold-light)", fontWeight: 500 }}>
                  {msg.highlight}
                </span>
              )}
            </span>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
        <span
          style={{
            color: "var(--bc-gold-light)",
            fontWeight: 500,
            marginLeft: "0.35em",
          }}
        >
          ✦
        </span>
      </p>

      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss announcement"
        style={{
          position: "absolute",
          right: "1rem",
          top: "50%",
          transform: "translateY(-50%)",
          color: "rgba(255,253,249,0.5)",
          fontSize: "1rem",
          lineHeight: 1,
          padding: "0.25rem",
          transition: "color var(--bc-fast)",
        }}
        onMouseEnter={e => (e.currentTarget.style.color = "var(--bc-gold-light)")}
        onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,253,249,0.5)")}
      >
        ×
      </button>
    </div>
  );
}
