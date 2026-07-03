"use client";

import { useState } from "react";
import Image from "next/image";

import { Product } from "@/types";

type Props = {
  product: Product;
};

export default function ProductGallery({ product }: Props) {
  const images =
    product.images.length > 0
      ? product.images
      : [
          {
            id: 0,
            url: "/placeholder.png",
            alt: product.name,
          },
        ];

  const [selectedImage, setSelectedImage] = useState(images[0].url);

  return (
    <div className="space-y-5">
      {/* Main Image */}

      <div className="overflow-hidden rounded-3xl border border-[#ECE7E2] bg-white">
        <Image
          src={selectedImage}
          alt={product.name}
          width={700}
          height={900}
          priority
          sizes="(max-width:768px) 100vw, 50vw"
          className="h-auto w-full object-cover transition duration-500 hover:scale-105"
        />
      </div>

      {/* Thumbnail Gallery */}

      <div className="flex gap-3 overflow-x-auto pb-2">
        {images.map((image) => (
          <button
            key={image.id}
            type="button"
            aria-label={`View ${product.name} image`}
            onClick={() => setSelectedImage(image.url)}
            className={`overflow-hidden rounded-xl border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#8A5A6A] ${
              selectedImage === image.url
                ? "border-[#8A5A6A]"
                : "border-transparent"
            }`}
          >
            <Image
              src={image.url}
              alt={image.alt}
              width={90}
              height={110}
              loading="lazy"
              sizes="90px"
              className="h-24 w-20 object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  );
}