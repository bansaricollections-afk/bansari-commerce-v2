"use client";

type Props = {
  selectedOccasion: string;
  setSelectedOccasion: (value: string) => void;
  selectedFabric: string;
  setSelectedFabric: (value: string) => void;
  selectedPrice: string;
  setSelectedPrice: (value: string) => void;
};

const occasions = ["All", "Wedding", "Festive", "Office", "Party", "Travel"];
const fabrics   = ["All", "Cotton", "Silk", "Rayon", "Georgette", "Organza"];
const prices    = ["All", "Under ₹1,500", "₹1,500–3,000", "₹3,000–5,000", "Above ₹5,000"];

function FilterSelect({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-[#8A5A6A] focus:outline-none"
      >
        {options.map((opt) => (
          <option key={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}

export default function ShopFilters({
  selectedOccasion, setSelectedOccasion,
  selectedFabric,   setSelectedFabric,
  selectedPrice,    setSelectedPrice,
}: Props) {
  return (
    <div className="mb-8 grid gap-4 border-b border-slate-200 pb-6 lg:grid-cols-3">
      <FilterSelect id="filter-occasion" label="Occasion" value={selectedOccasion} options={occasions} onChange={setSelectedOccasion} />
      <FilterSelect id="filter-fabric"   label="Fabric"   value={selectedFabric}   options={fabrics}   onChange={setSelectedFabric}   />
      <FilterSelect id="filter-price"    label="Price"    value={selectedPrice}    options={prices}    onChange={setSelectedPrice}    />
    </div>
  );
}
