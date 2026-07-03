"use client";

const categories = [
  "Kurta Sets",
  "Ethnic Dresses",
  "Sarees",
  "Lehengas",
  "Co-ord Sets",
  "Gowns",
];

const occasions = [
  "Wedding",
  "Festive",
  "Office",
  "Party",
];

const sizes = ["XS", "S", "M", "L", "XL", "XXL"];

const colors = [
  "#FFFFFF",
  "#000000",
  "#E91E63",
  "#F44336",
  "#4CAF50",
  "#3F51B5",
  "#FFC107",
  "#9C27B0",
];

export default function FilterSidebar() {
  return (
    <aside className="sticky top-24 h-fit rounded-3xl bg-white p-6 shadow-sm">

      <div className="mb-8 flex items-center justify-between">
        <h2 className="text-2xl font-semibold">
          Filters
        </h2>

        <button className="text-sm text-[#8A5A6A] hover:underline">
          Clear All
        </button>
      </div>

      {/* Category */}

      <div className="mb-8">

        <h3 className="mb-4 font-semibold">
          Category
        </h3>

        <div className="space-y-3">

          {categories.map((item) => (
            <label key={item} className="flex items-center gap-3">
              <input type="checkbox" />
              {item}
            </label>
          ))}

        </div>

      </div>

      {/* Occasion */}

      <div className="mb-8">

        <h3 className="mb-4 font-semibold">
          Occasion
        </h3>

        <div className="space-y-3">

          {occasions.map((item) => (
            <label key={item} className="flex items-center gap-3">
              <input type="checkbox" />
              {item}
            </label>
          ))}

        </div>

      </div>

      {/* Size */}

      <div className="mb-8">

        <h3 className="mb-4 font-semibold">
          Size
        </h3>

        <div className="flex flex-wrap gap-2">

          {sizes.map((size) => (
            <button
              key={size}
              className="rounded-xl border px-4 py-2 hover:bg-[#8A5A6A] hover:text-white"
            >
              {size}
            </button>
          ))}

        </div>

      </div>

      {/* Colour */}

      <div className="mb-8">

        <h3 className="mb-4 font-semibold">
          Colour
        </h3>

        <div className="flex flex-wrap gap-3">

          {colors.map((color) => (
            <button
              key={color}
              className="h-8 w-8 rounded-full border-2 border-gray-300"
              style={{ backgroundColor: color }}
            />
          ))}

        </div>

      </div>

      {/* Price */}

      <div>

        <h3 className="mb-4 font-semibold">
          Price
        </h3>

        <input
          type="range"
          min="499"
          max="9999"
          className="w-full"
        />

        <div className="mt-2 flex justify-between text-sm text-gray-500">
          <span>₹499</span>
          <span>₹9999</span>
        </div>

      </div>

    </aside>
  );
}