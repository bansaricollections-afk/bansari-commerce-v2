export default function ShopHero() {
  return (
    <div
      className="relative overflow-hidden border-b border-slate-100 bg-[#F9F6F3]"
      aria-hidden="true"
    >
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-8 md:px-10 lg:px-16">
        {/* Decorative rule lines */}
        <div className="hidden gap-3 lg:flex" aria-hidden="true">
          {[40, 60, 24, 48, 32].map((h, i) => (
            <div
              key={i}
              className="w-px bg-slate-200"
              style={{ height: h }}
            />
          ))}
        </div>

        <p className="font-[family:var(--font-playfair)] text-xs italic text-slate-400">
          &ldquo;Wear what makes you feel alive.&rdquo;
        </p>

        <div className="hidden gap-3 lg:flex" aria-hidden="true">
          {[32, 48, 24, 60, 40].map((h, i) => (
            <div
              key={i}
              className="w-px bg-slate-200"
              style={{ height: h }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
