"use client";

import { useEffect, useState } from "react";

const NOTIFICATIONS = [
  { city: "Mumbai", action: "just purchased", product: "Ivory Chanderi Kurta Set" },
  { city: "Delhi", action: "added to wishlist", product: "Rose Georgette Lehenga" },
  { city: "Bangalore", action: "just purchased", product: "Sage Green Co-ord Set" },
  { city: "Chennai", action: "just purchased", product: "Ivory Embroidered Saree" },
  { city: "Hyderabad", action: "added to bag", product: "Terracotta Block-Print Kurta" },
  { city: "Pune", action: "just purchased", product: "Royal Blue Anarkali" },
  { city: "Kolkata", action: "is viewing", product: "Blush Pink Organza Lehenga" },
];

export default function ShopSocialProof() {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx((i) => (i + 1) % NOTIFICATIONS.length);
        setVisible(true);
      }, 400);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const note = NOTIFICATIONS[idx];

  return (
    <div
      className="border-b border-slate-100 bg-slate-50 py-2.5"
      aria-live="polite"
      aria-label="Recent customer activity"
    >
      <div className="mx-auto flex max-w-[1440px] items-center justify-center gap-2 px-5 md:px-10 lg:px-16">
        {/* Pulse dot */}
        <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
        </span>

        <p
          className={[
            "text-[11px] text-slate-500 transition-opacity duration-400",
            visible ? "opacity-100" : "opacity-0",
          ].join(" ")}
        >
          <span className="font-semibold text-slate-700">{note.city}</span>{" "}
          {note.action}{" "}
          <span className="text-[#8A5A6A]">{note.product}</span>
        </p>

        <span className="ml-4 hidden text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-300 md:block" aria-hidden="true">
          ·
        </span>
        <span className="hidden text-[10px] text-slate-400 md:block">
          147 people shopping now
        </span>
      </div>
    </div>
  );
}