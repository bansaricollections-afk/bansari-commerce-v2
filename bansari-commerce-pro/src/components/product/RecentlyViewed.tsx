'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface RecentItem {
  id: number;
  name: string;
  price: number;
  image: string;
  category?: string;
}

export default function RecentlyViewed() {
  const [items, setItems] = useState<RecentItem[]>([]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('recently_viewed');
      if (raw) setItems(JSON.parse(raw).slice(0, 6));
    } catch {
      // sessionStorage unavailable or invalid JSON — silent fail
    }
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="py-16" aria-labelledby="recently-viewed-heading">
      <div className="mb-8">
        <p className="text-[11px] tracking-[0.25em] uppercase text-[#8A5A6A] mb-2">Your History</p>
        <h2
          id="recently-viewed-heading"
          className="text-xl font-light text-slate-900 tracking-tight"
        >
          Recently Viewed
        </h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/product/${item.id}`}
            className="group block"
            aria-label={`View ${item.name}`}
          >
            <div className="relative aspect-[3/4] overflow-hidden bg-slate-50 rounded-sm mb-2">
              {item.image ? (
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full bg-slate-100" />
              )}
            </div>
            <p className="text-xs font-medium text-slate-700 truncate group-hover:text-[#8A5A6A] transition-colors">
              {item.name}
            </p>
            <p className="text-xs text-slate-500">₹{item.price.toLocaleString('en-IN')}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
