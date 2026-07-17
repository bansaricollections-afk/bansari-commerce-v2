export default function ShopCROStrip() {
  return (
    <section
      className="border-t border-slate-100 bg-white"
      aria-label="Shopping assistance"
    >
      <div className="mx-auto max-w-[1440px] px-5 py-12 md:px-10 lg:px-16">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">

          {/* WhatsApp Stylist */}
          <div className="flex items-start gap-5 rounded-none border border-slate-100 bg-slate-50 p-7">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center bg-green-500">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="white" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.118.554 4.102 1.523 5.825L.057 23.428a.5.5 0 0 0 .625.61l5.765-1.511A11.941 11.941 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.82 9.82 0 0 1-5.012-1.37l-.36-.215-3.72.975.994-3.634-.235-.374A9.817 9.817 0 0 1 2.182 12C2.182 6.574 6.574 2.182 12 2.182S21.818 6.574 21.818 12 17.426 21.818 12 21.818z"/>
              </svg>
            </div>
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-900">
                Personal Styling on WhatsApp
              </h3>
              <p className="mt-1.5 text-[12px] leading-relaxed text-slate-500">
                Not sure what to wear? Our stylists will help you find the perfect outfit for your occasion, size, and budget.
              </p>
              <a
                href="https://wa.me/919876543210?text=Hi%2C%20I%20need%20help%20choosing%20an%20outfit"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 bg-green-500 px-5 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-white transition-all duration-200 hover:bg-green-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
              >
                Chat with a Stylist
              </a>
            </div>
          </div>

          {/* Free Shipping Reminder */}
          <div className="flex items-start gap-5 rounded-none border border-slate-100 bg-slate-50 p-7">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center bg-[#8A5A6A]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7V8z"/>
                <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
              </svg>
            </div>
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-900">
                Free Shipping on Orders Above ₹1,999
              </h3>
              <p className="mt-1.5 text-[12px] leading-relaxed text-slate-500">
                Add ₹499 more to your bag to unlock free delivery. Plus — easy 7-day returns on all orders, no questions asked.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                {[
                  { label: "COD Available", color: "bg-slate-100 text-slate-700" },
                  { label: "7-Day Returns", color: "bg-slate-100 text-slate-700" },
                  { label: "Secure Payment", color: "bg-slate-100 text-slate-700" },
                ].map((b) => (
                  <span key={b.label} className={`px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${b.color}`}>
                    {b.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}