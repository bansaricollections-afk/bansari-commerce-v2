"use client";

type Props = {
  selectedOccasion: string;
  setSelectedOccasion: (value: string) => void;

  selectedFabric: string;
  setSelectedFabric: (value: string) => void;

  selectedPrice: string;
  setSelectedPrice: (value: string) => void;
};

const occasions = [
  "All",
  "Wedding",
  "Festive",
  "Office",
  "Party",
  "Travel",
];

const fabrics = [
  "All",
  "Cotton",
  "Silk",
  "Rayon",
  "Georgette",
  "Organza",
];

const prices = [
  "All",
  "Under ₹1500",
  "₹1500-3000",
  "₹3000-5000",
  "Above ₹5000",
];

export default function ShopFilters({
  selectedOccasion,
  setSelectedOccasion,
  selectedFabric,
  setSelectedFabric,
  selectedPrice,
  setSelectedPrice,
}: Props) {
  return (
    <div className="mb-12 grid gap-6 rounded-3xl border border-[#ECE7E2] bg-white p-6 lg:grid-cols-3">

      <div>
        <label className="mb-2 block text-sm font-semibold">
          Occasion
        </label>

        <select
          value={selectedOccasion}
          onChange={(e) => setSelectedOccasion(e.target.value)}
          className="w-full rounded-xl border p-3"
        >
          {occasions.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold">
          Fabric
        </label>

        <select
          value={selectedFabric}
          onChange={(e) => setSelectedFabric(e.target.value)}
          className="w-full rounded-xl border p-3"
        >
          {fabrics.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold">
          Price
        </label>

        <select
          value={selectedPrice}
          onChange={(e) => setSelectedPrice(e.target.value)}
          className="w-full rounded-xl border p-3"
        >
          {prices.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </div>

    </div>
  );
}