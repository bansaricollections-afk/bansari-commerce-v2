"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Pagination() {
  return (
    <div className="mt-14 flex flex-col items-center justify-between gap-6 border-t border-gray-200 pt-8 md:flex-row">

      <p className="text-sm text-gray-500">
        Showing <span className="font-semibold">1–24</span> of{" "}
        <span className="font-semibold">248</span> products
      </p>

      <div className="flex items-center gap-2">

        <button className="flex h-10 w-10 items-center justify-center rounded-full border hover:bg-gray-100">
          <ChevronLeft size={18} />
        </button>

        <button className="h-10 w-10 rounded-full bg-[#8A5A6A] text-white">
          1
        </button>

        <button className="h-10 w-10 rounded-full border hover:bg-gray-100">
          2
        </button>

        <button className="h-10 w-10 rounded-full border hover:bg-gray-100">
          3
        </button>

        <button className="h-10 w-10 rounded-full border hover:bg-gray-100">
          4
        </button>

        <button className="h-10 w-10 rounded-full border hover:bg-gray-100">
          5
        </button>

        <button className="flex h-10 w-10 items-center justify-center rounded-full border hover:bg-gray-100">
          <ChevronRight size={18} />
        </button>

      </div>

    </div>
  );
}