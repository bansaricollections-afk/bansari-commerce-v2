"use client";

import { useState } from "react";

type Props = {
  initial?: number;
};

export default function QuantitySelector({
  initial = 1,
}: Props) {
  const [quantity, setQuantity] = useState(initial);

  return (
    <div>
      <h3 className="mb-4 text-lg font-semibold">
        Quantity
      </h3>

      <div className="flex items-center gap-4">

        <button
          onClick={() =>
            setQuantity(Math.max(1, quantity - 1))
          }
          className="flex h-12 w-12 items-center justify-center rounded-xl border text-2xl hover:bg-[#8A5A6A] hover:text-white"
        >
          −
        </button>

        <span className="w-10 text-center text-xl font-semibold">
          {quantity}
        </span>

        <button
          onClick={() =>
            setQuantity(quantity + 1)
          }
          className="flex h-12 w-12 items-center justify-center rounded-xl border text-2xl hover:bg-[#8A5A6A] hover:text-white"
        >
          +
        </button>

      </div>
    </div>
  );
}