'use client';

import { useState } from 'react';

import type { Product } from '@/types/product';

interface Props {
  product: Product;
}

interface AccordionItem {
  id: string;
  label: string;
  content: React.ReactNode;
}

function AccordionSection({
  item,
  isOpen,
  onToggle,
}: {
  item: AccordionItem;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-slate-100">
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={`accordion-${item.id}`}
        className="flex items-center justify-between w-full py-4 text-left group"
      >
        <span className="text-[11px] tracking-[0.2em] uppercase font-medium text-slate-700 group-hover:text-[#8A5A6A] transition-colors">
          {item.label}
        </span>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform duration-300 flex-shrink-0 ${
            isOpen ? 'rotate-45' : ''
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </button>
      <div
        id={`accordion-${item.id}`}
        role="region"
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-[600px] pb-5' : 'max-h-0'
        }`}
      >
        <div className="text-sm text-slate-600 leading-relaxed space-y-2">
          {item.content}
        </div>
      </div>
    </div>
  );
}

export default function ProductAccordion({ product }: Props) {
  const [openId, setOpenId] = useState<string | null>('description');
  const specs = product.specifications;

  const toggle = (id: string) => setOpenId((prev) => (prev === id ? null : id));

  const items: AccordionItem[] = [
    product.description
      ? {
          id: 'description',
          label: 'Description',
          content: <p>{product.description}</p>,
        }
      : null,
    specs?.fabric || specs?.care
      ? {
          id: 'fabric',
          label: 'Fabric & Care',
          content: (
            <div className="space-y-3">
              {specs?.fabric && (
                <div>
                  <span className="text-[10px] tracking-[0.15em] uppercase text-slate-400 block mb-1">Material</span>
                  <p>{specs.fabric}</p>
                </div>
              )}
              {specs?.care && (
                <div>
                  <span className="text-[10px] tracking-[0.15em] uppercase text-slate-400 block mb-1">Care Instructions</span>
                  <p>{specs.care}</p>
                </div>
              )}
            </div>
          ),
        }
      : null,
    specs?.work_details
      ? {
          id: 'work',
          label: 'Work & Craftsmanship',
          content: <p>{specs.work_details}</p>,
        }
      : null,
    {
      id: 'size',
      label: 'Size Guide',
      content: (
        <div className="space-y-3">
          <p className="text-slate-500">Our pieces are crafted with generous sizing. We recommend checking the measurements below before ordering.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200">
                  {['Size', 'Bust', 'Waist', 'Hip', 'Length'].map((h) => (
                    <th key={h} className="py-2 pr-4 text-left text-[10px] tracking-[0.15em] uppercase text-slate-400 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[['XS', '32"', '26"', '36"', '52"'],['S', '34"', '28"', '38"', '52"'],['M', '36"', '30"', '40"', '53"'],['L', '38"', '32"', '42"', '53"'],['XL', '40"', '34"', '44"', '54"'],['XXL', '42"', '36"', '46"', '54"']].map(([size, ...rest]) => (
                  <tr key={size}>
                    <td className="py-2 pr-4 font-medium text-slate-700">{size}</td>
                    {rest.map((v, i) => <td key={i} className="py-2 pr-4 text-slate-500">{v}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-slate-400">All measurements in inches. Model wears size S.</p>
        </div>
      ),
    },
    {
      id: 'shipping',
      label: 'Shipping & Delivery',
      content: (
        <ul className="space-y-2">
          <li className="flex items-start gap-2"><span className="text-green-600 mt-0.5">✓</span>Free shipping across India on all orders</li>
          <li className="flex items-start gap-2"><span className="text-green-600 mt-0.5">✓</span>Metro cities: 3–5 business days</li>
          <li className="flex items-start gap-2"><span className="text-green-600 mt-0.5">✓</span>Rest of India: 5–7 business days</li>
          <li className="flex items-start gap-2"><span className="text-green-600 mt-0.5">✓</span>Cash on Delivery available nationwide</li>
          <li className="flex items-start gap-2"><span className="text-green-600 mt-0.5">✓</span>Tracking link sent via SMS and email</li>
        </ul>
      ),
    },
    {
      id: 'returns',
      label: 'Returns & Exchanges',
      content: (
        <ul className="space-y-2">
          <li className="flex items-start gap-2"><span className="text-green-600 mt-0.5">✓</span>7-day hassle-free returns from delivery date</li>
          <li className="flex items-start gap-2"><span className="text-green-600 mt-0.5">✓</span>Free return pickup from your doorstep</li>
          <li className="flex items-start gap-2"><span className="text-green-600 mt-0.5">✓</span>Full refund to original payment method</li>
          <li className="flex items-start gap-2"><span className="text-green-600 mt-0.5">✓</span>Items must be unused with tags intact</li>
          <li className="flex items-start gap-2"><span className="text-[#8A5A6A] mt-0.5">✦</span>Custom orders and sale items are non-returnable</li>
        </ul>
      ),
    },
  ].filter(Boolean) as AccordionItem[];

  return (
    <div className="border-t border-slate-200">
      {items.map((item) => (
        <AccordionSection
          key={item.id}
          item={item}
          isOpen={openId === item.id}
          onToggle={() => toggle(item.id)}
        />
      ))}
    </div>
  );
}
