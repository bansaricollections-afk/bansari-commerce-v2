export default function ShopTrustStrip() {
  const items = [
    { icon: "🚚", label: "Free Shipping", sub: "Orders above ₹1,999" },
    { icon: "↩️", label: "Easy Returns", sub: "7-day return policy" },
    { icon: "🔒", label: "Secure Payments", sub: "100% safe checkout" },
    { icon: "📦", label: "COD Available", sub: "Pay on delivery" },
  ];
  return (
    <div className="hidden gap-6 lg:flex" aria-label="Store promises">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <span className="text-base" aria-hidden="true">{item.icon}</span>
          <div>
            <p className="text-xs font-semibold text-slate-900">{item.label}</p>
            <p className="text-[10px] text-slate-400">{item.sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
