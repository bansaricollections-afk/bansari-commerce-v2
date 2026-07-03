"use client";

const categories = [
  "All",
  "Kurta Sets",
  "Anarkali Sets",
  "Ethnic Dresses",
  "Lehenga Sets",
  "Sarees",
  "Co-ord Sets",
  "Gowns",
];

type Props = {
  selected: string;
  onSelect: (category: string) => void;
};

export default function CategoryPills({
  selected,
  onSelect,
}: Props) {
  return (
    <div className="mb-10 flex gap-3 overflow-x-auto pb-2">

      {categories.map((category) => {

        const active = category === selected;

        return (
          <button
            key={category}
            onClick={() => onSelect(category)}
            className={`whitespace-nowrap rounded-full px-6 py-3 text-sm font-medium transition

              ${
                active
                  ? "bg-[#8A5A6A] text-white"
                  : "border border-[#ECE7E2] bg-white hover:border-[#8A5A6A]"
              }

            `}
          >
            {category}
          </button>
        );
      })}
    </div>
  );
}
