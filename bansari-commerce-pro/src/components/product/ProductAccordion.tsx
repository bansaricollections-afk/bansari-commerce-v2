'use client';

import { useState } from 'react';
import type { Product } from '@/types/product';

interface Props { product: Product; }

interface Item {
  id: string;
  label: string;
  content: React.ReactNode;
}

function Row({ item, open, toggle }: { item: Item; open: boolean; toggle: () => void }) {
  return (
    <div className="border-b border-slate-100 last:border-b-0">
      <button
        onClick={toggle}
        aria-expanded={open}
        aria-controls={`acc-${item.id}`}
        className="flex items-center justify-between w-full py-4 text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8A5A6A] focus-visible:ring-offset-2 rounded-sm"
      >
        <span className="text-[11px] tracking-[0.2em] uppercase font-medium text-slate-700 group-hover:text-[#8A5A6A] transition-colors">
          {item.label}
        </span>
        <svg
          className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform duration-300 ${open ? 'rotate-45' : ''}`}
          fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </button>
      <div
        id={`acc-${item.id}`}
        role="region"
        className={`overflow-hidden transition-all duration-300 ease-in-out ${open ? 'max-h-[800px] pb-5 opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <div className="text-sm text-slate-600 leading-relaxed space-y-2">
          {item.content}
        </div>
      </div>
    </div>
  );
}

export default function ProductAccordion({ product }: Props) {
  const [openId, setOpenId] = useState<string | null>('specs');
  const specs = product.specifications;
  const toggle = (id: string) => setOpenId(prev => prev === id ? null : id);

  const items: Item[] = [
    // ── Specifications ──────────────────────────────────────────
    {
      id: 'specs',
      label: 'Product Specifications',
      content: specs ? (
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
          {specs.fabric && (<><dt className="text-[10px] tracking-widest uppercase text-slate-400">Fabric</dt><dd className="text-sm text-slate-700">{specs.fabric}</dd></>)}
          {specs.work && (<><dt className="text-[10px] tracking-widest uppercase text-slate-400">Work</dt><dd className="text-sm text-slate-700">{specs.work}</dd></>)}
          {specs.neckline && (<><dt className="text-[10px] tracking-widest uppercase text-slate-400">Neckline</dt><dd className="text-sm text-slate-700">{specs.neckline}</dd></>)}
          {specs.sleeve && (<><dt className="text-[10px] tracking-widest uppercase text-slate-400">Sleeve</dt><dd className="text-sm text-slate-700">{specs.sleeve}</dd></>)}
          {specs.fit && (<><dt className="text-[10px] tracking-widest uppercase text-slate-400">Fit</dt><dd className="text-sm text-slate-700">{specs.fit}</dd></>)}
          {specs.occasion && (
            <><dt className="text-[10px] tracking-widest uppercase text-slate-400">Occasion</dt>
            <dd className="text-sm text-slate-700">{Array.isArray(specs.occasion) ? specs.occasion.join(', ') : specs.occasion}</dd></>
          )}
          {product.sku && (<><dt className="text-[10px] tracking-widest uppercase text-slate-400">Style Code</dt><dd className="text-sm font-mono text-slate-500">{product.sku}</dd></>)}
          {product.category && (<><dt className="text-[10px] tracking-widest uppercase text-slate-400">Category</dt><dd className="text-sm text-slate-700">{product.category}</dd></>)}
        </dl>
      ) : <p className="text-slate-400 italic text-sm">Specifications not available.</p>,
    },

    // ── Fabric & Care ────────────────────────────────────────────
    (specs?.fabric || specs?.care) ? {
      id: 'care',
      label: 'Fabric & Wash Care',
      content: (
        <div className="space-y-3">
          {specs?.fabric && (
            <div>
              <p className="text-[10px] tracking-widest uppercase text-slate-400 mb-1">Material</p>
              <p>{specs.fabric}</p>
            </div>
          )}
          {specs?.care && (
            <div>
              <p className="text-[10px] tracking-widest uppercase text-slate-400 mb-1">Care Instructions</p>
              <p>{specs.care}</p>
            </div>
          )}
          {!specs?.care && (
            <ul className="space-y-1.5">
              {['Dry clean recommended','Do not bleach','Iron on low heat','Store in a cool, dry place'].map(c => (
                <li key={c} className="flex items-start gap-2">
                  <span className="text-[#8A5A6A] mt-0.5 flex-shrink-0">✦</span>{c}
                </li>
              ))}
            </ul>
          )}
        </div>
      ),
    } : null,

    // ── Size Guide ───────────────────────────────────────────────
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
                  {['Size','Bust','Waist','Hip','Length'].map(h => (
                    <th key={h} className="py-2 pr-4 text-left text-[10px] tracking-[0.15em] uppercase text-slate-400 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  ['XS','32"','26"','36"','52"'],
                  ['S','34"','28"','38"','52"'],
                  ['M','36"','30"','40"','53"'],
                  ['L','38"','32"','42"','53"'],
                  ['XL','40"','34"','44"','54"'],
                  ['XXL','42"','36"','46"','54"'],
                  ['3XL','44"','38"','48"','55"'],
                ].map(([sz, ...rest]) => (
                  <tr key={sz}>
                    <td className="py-2 pr-4 font-semibold text-slate-800">{sz}</td>
                    {rest.map((v, i) => <td key={i} className="py-2 pr-4 text-slate-500">{v}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-slate-400">All measurements in inches. Model wears size S. When in doubt, size up.</p>
        </div>
      ),
    },

    // ── Shipping ─────────────────────────────────────────────────
    {
      id: 'shipping',
      label: 'Shipping & Delivery',
      content: (
        <ul className="space-y-2">
          {[
            'Free shipping across India on all orders',
            'Metro cities: 3–5 business days',
            'Rest of India: 5–7 business days',
            'Tracking link sent via SMS and email',
            'Prepaid orders only — online payment at checkout',
          ].map(line => (
            <li key={line} className="flex items-start gap-2">
              <span className="text-green-600 mt-0.5 flex-shrink-0">✓</span>{line}
            </li>
          ))}
        </ul>
      ),
    },

    // ── Returns ──────────────────────────────────────────────────
    {
      id: 'returns',
      label: 'Returns & Exchanges',
      content: (
        <ul className="space-y-2">
          {[
            '7-day hassle-free returns from delivery date',
            'Free return pickup from your doorstep',
            'Full refund to original payment method',
            'Items must be unused with original tags intact',
          ].map(line => (
            <li key={line} className="flex items-start gap-2">
              <span className="text-green-600 mt-0.5 flex-shrink-0">✓</span>{line}
            </li>
          ))}
          <li className="flex items-start gap-2">
            <span className="text-[#8A5A6A] mt-0.5 flex-shrink-0">✦</span>Custom orders and sale items are non-returnable
          </li>
        </ul>
      ),
    },
  ].filter(Boolean) as Item[];

  return (
    <div className="divide-y divide-slate-100 border-t border-slate-100">
      {items.map(item => (
        <Row key={item.id} item={item} open={openId === item.id} toggle={() => toggle(item.id)} />
      ))}
    </div>
  );
}
