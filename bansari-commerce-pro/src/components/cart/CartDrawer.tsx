"use client";

import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";
import { useCart } from "@/store/cart";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function CartDrawer({
  open,
  onClose,
}: Props) {
  const { items } = useCart();

  const total = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return (
    <>
      {/* Overlay */}

      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/40 transition ${
          open
            ? "visible opacity-100"
            : "invisible opacity-0"
        }`}
      />

      {/* Drawer */}

      <aside
        className={`fixed right-0 top-0 z-50 flex h-screen w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ${
          open
            ? "translate-x-0"
            : "translate-x-full"
        }`}
      >
        {/* Header */}

        <div className="flex items-center justify-between border-b p-6">

          <h2 className="text-2xl font-bold">
            Shopping Bag
          </h2>

          <button onClick={onClose}>
            <X />
          </button>

        </div>

        {/* Empty */}

        {items.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center px-10 text-center">

            <p className="text-xl font-semibold">
              Your bag is empty
            </p>

            <p className="mt-3 text-gray-500">
              Discover beautiful collections.
            </p>

          </div>
        )}

        {/* Items */}

        <div className="flex-1 overflow-y-auto">

          {items.map((item) => (

            <div
              key={item.id}
              className="flex gap-4 border-b p-5"
            >

              <Image
                src={item.image}
                alt={item.name}
                width={90}
                height={110}
                className="rounded-xl"
              />

              <div className="flex-1">

                <h3 className="font-semibold">
                  {item.name}
                </h3>

                <p className="mt-2 text-[#8A5A6A] font-bold">
                  ₹{item.price}
                </p>

                <p className="text-sm text-gray-500">
                  Qty : {item.quantity}
                </p>

              </div>

            </div>

          ))}

        </div>

        {/* Footer */}

        {items.length > 0 && (

          <div className="border-t p-6">

            <div className="mb-5 flex justify-between text-xl font-bold">

              <span>Total</span>

              <span>₹{total}</span>

            </div>

            <Link
              href="/cart"
              onClick={onClose}
              className="mb-3 block rounded-full bg-[#8A5A6A] py-4 text-center font-semibold text-white"
            >
              View Cart
            </Link>

            <Link
              href="/checkout"
              onClick={onClose}
              className="block rounded-full border border-[#8A5A6A] py-4 text-center font-semibold text-[#8A5A6A]"
            >
              Checkout
            </Link>

          </div>

        )}

      </aside>
    </>
  );
}