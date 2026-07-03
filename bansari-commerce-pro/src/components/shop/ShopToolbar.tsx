"use client";

import { Grid2X2, List, Search, SlidersHorizontal } from "lucide-react";

export default function ShopToolbar() {
  return (
    <div className="mb-8 rounded-3xl bg-white p-5 shadow-sm">

      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

        {/* Left */}

        <div>
          <h2 className="text-2xl font-bold">
            Explore Collection
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Showing <span className="font-semibold">24</span> of{" "}
            <span className="font-semibold">248</span> products
          </p>
        </div>

        {/* Right */}

        <div className="flex flex-wrap items-center gap-3">

          {/* Search */}

          <div className="relative">

            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="text"
              placeholder="Search products..."
              className="h-12 w-72 rounded-full border border-gray-200 pl-11 pr-4 outline-none focus:border-[#8A5A6A]"
            />

          </div>

          {/* Sort */}

          <select className="h-12 rounded-full border border-gray-200 px-5 outline-none">

            <option>Newest First</option>

            <option>Best Selling</option>

            <option>Price: Low to High</option>

            <option>Price: High to Low</option>

            <option>Highest Rated</option>

          </select>

          {/* Mobile Filter */}

          <button className="flex h-12 items-center gap-2 rounded-full border border-gray-200 px-5 hover:bg-[#F8F3EF] lg:hidden">

            <SlidersHorizontal size={18} />

            Filters

          </button>

          {/* View */}

          <div className="hidden rounded-full border border-gray-200 p-1 md:flex">

            <button className="rounded-full bg-[#8A5A6A] p-2 text-white">

              <Grid2X2 size={18} />

            </button>

            <button className="rounded-full p-2 hover:bg-gray-100">

              <List size={18} />

            </button>

          </div>

        </div>

      </div>

    </div>
  );
}