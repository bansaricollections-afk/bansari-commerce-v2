import { Product } from "@/types";

export const kurtaSets: Product[] = [
  {
    id: 1,

    sku: "BC-KS-0001",
    styleCode: "KS0001",
    slug: "pink-embroidered-kurta-set",

    name: "Pink Embroidered Kurta Set",
    shortName: "Pink Kurta Set",

    category: "Kurta Sets",
    subCategory: "Straight Kurta Set",
    collection: "Celebration Edit",

    badge: "New Arrival",

    price: 2499,
    oldPrice: 3499,
    discount: 29,

    currency: "INR",

    rating: 4.8,
    reviewCount: 126,

    stock: 25,

    featured: true,
    newArrival: true,
    bestSeller: false,

    images: [
      {
        id: "1",
        url: "/products/p1.png",
        alt: "Pink Kurta Front",
        type: "front",
      },
    ],

    variants: [
  {
    id: "pink",

    color: "Pink",

    colorCode: "#F6B7C3",

    sizes: [
      {
        size: "S",
        stock: 8,
        sku: "BC-KS-0001-S",
      },
      {
        size: "M",
        stock: 12,
        sku: "BC-KS-0001-M",
      },
      {
        size: "L",
        stock: 10,
        sku: "BC-KS-0001-L",
      },
      {
        size: "XL",
        stock: 6,
        sku: "BC-KS-0001-XL",
      },
      {
        size: "XXL",
        stock: 4,
        sku: "BC-KS-0001-XXL",
      },
    ],

    images: [
      {
        id: "1",
        url: "/products/p1.png",
        alt: "Pink Kurta Front",
        type: "front",
      },
    ],
  },
],

    specifications: {
      fabric: "Cotton Blend",
      work: "Embroidery",
      neckline: "Round Neck",
      sleeve: "3/4 Sleeve",
      fit: "Regular",
      occasion: ["Festive", "Office"],
      care: "Gentle Hand Wash",
    },

    description:
      "Premium embroidered kurta set designed for festive celebrations and elegant occasions.",

    seo: {
      title: "Pink Embroidered Kurta Set",
      description: "Premium women's embroidered kurta set.",
      keywords: ["Kurta", "Pink", "Embroidery"],
    },

    reviews: [],

    relatedProducts: [],

    completeLook: [],

    createdAt: "2026-01-01",

    updatedAt: "2026-01-01",
  },
];