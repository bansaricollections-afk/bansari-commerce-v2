const TRUST_ITEMS = [
  {
    label: "Free Shipping",
    sub: "Orders above ₹1,999",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M1 3h15v13H1z" /><path d="M16 8h4l3 3v5h-7V8z" />
        <circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    ),
  },
  {
    label: "Easy Returns",
    sub: "7-day return policy",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />
      </svg>
    ),
  },
  {
    label: "Secure Payments",
    sub: "100% safe checkout",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    label: "COD Available",
    sub: "Pay on delivery",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" />
      </svg>
    ),
  },
  {
    label: "WhatsApp Styling",
    sub: "Personal consultation",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      </svg>
    ),
  },
];

export default function ShopTrustStrip() {
  return (
    <div
      className="hidden gap-6 xl:flex"
      aria-label="Store promises"
    >
      {TRUST_ITEMS.map((item, i) => (
        <div key={item.label} className={["flex items-center gap-2.5", i > 0 ? "pl-6 border-l border-slate-100" : ""].join(" ")}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center text-[#8A5A6A]">
            {item.icon}
          </div>
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-slate-800">
              {item.label}
            </p>
            <p className="text-[10px] text-slate-400">{item.sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
}