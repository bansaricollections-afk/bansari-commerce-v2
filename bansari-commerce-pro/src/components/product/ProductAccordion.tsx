"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Product } from "@/types";

type Props = {
  product: Product;
};

export default function ProductAccordion({ product }: Props) {
  const [open, setOpen] = useState("description");

  const sections = [
    {
      id: "description",
      title: "Product Description",
      content: product.description,
    },
    {
      id: "fabric",
      title: "Fabric & Care",
      content: `
Fabric : ${product.specifications.fabric}

Work : ${product.specifications.work}

Neckline : ${product.specifications.neckline}

Sleeve : ${product.specifications.sleeve}

Fit : ${product.specifications.fit}

Care : ${product.specifications.care}
      `,
    },
    {
      id: "shipping",
      title: "Shipping & Returns",
      content:
        "Free shipping on eligible orders. Orders are dispatched within 24–48 hours. Easy return policy where applicable.",
    },
  ];

  return (
    <div className="rounded-3xl border border-[#ECE7E2] bg-white">

      {sections.map((section) => {

        const active = open === section.id;

        return (
          <div
            key={section.id}
            className="border-b last:border-none"
          >

            <button
              onClick={() =>
                setOpen(active ? "" : section.id)
              }
              className="flex w-full items-center justify-between p-6"
            >
              <span className="text-lg font-semibold">
                {section.title}
              </span>

              <ChevronDown
                className={`transition ${
                  active ? "rotate-180" : ""
                }`}
              />
            </button>

            {active && (
              <div className="px-6 pb-6 whitespace-pre-line leading-8 text-gray-600">
                {section.content}
              </div>
            )}

          </div>
        );
      })}
    </div>
  );
}