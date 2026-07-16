import CategoryPills from "@/components/shop/CategoryPills";

type Props = {
  title?: string;
  description?: string;
};

export default function ShopHero({
  title = "The Collection",
  description = "Curated ethnic wear crafted for weddings, celebrations, and every occasion in between.",
}: Props) {
  return (
    <div className="mb-6">
      <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-[#8A5A6A]">
        Bansari Collections
      </p>
      <h1 className="font-[family:var(--font-playfair)] text-3xl font-normal text-slate-900 md:text-4xl">
        {title}
      </h1>
      <p className="mt-3 mb-6 max-w-xl text-sm leading-relaxed text-slate-500">{description}</p>
      <CategoryPills />
    </div>
  );
}
