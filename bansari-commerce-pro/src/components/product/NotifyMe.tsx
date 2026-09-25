'use client';

/**
 * NotifyMe
 * ─────────
 * Shown instead of the Add to Cart button when a product is out of stock.
 * Also used for a single sold-out size on an otherwise available product.
 * Saves to /api/stock-alerts. (It was a mock until 26 Sep 2026: it showed
 * "we'll notify you" and stored nothing.)
 * Keeps the same button height (h-12) and uppercase tracking as ProductActions
 * so the layout does not shift when stock status changes.
 */

import { useState } from 'react';

interface Props {
  productId: number;
  productName: string;
  /** Sold-out sizes to choose from; omit for a product without sizes. */
  sizes?: { variantId: number; label: string }[];
  /** Heading override — the default reads for a fully sold-out product. */
  title?: string;
}

export default function NotifyMe({ productId, sizes = [], title }: Props) {
  const [email, setEmail] = useState('');
  const [variantId, setVariantId] = useState<number | null>(
    sizes.length === 1 ? sizes[0]!.variantId : null
  );
  const chosenLabel = sizes.find((s) => s.variantId === variantId)?.label ?? null;
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!valid) {
      setError('Please enter a valid email address.');
      return;
    }
    if (sizes.length > 0 && variantId == null) {
      setError('Please choose your size.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/stock-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, variantId, email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error?.message ?? 'Could not save your request. Please try again.');
        return;
      }
      setSubmitted(true);
    } catch {
      setError('Could not save your request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex items-center gap-2.5 h-12 px-4 bg-green-50 border border-green-200 rounded-sm">
        <svg
          className="w-4 h-4 text-green-600 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        <p className="text-xs text-green-700">
          We&apos;ll email <span className="font-medium">{email}</span> when{' '}
          {chosenLabel ? `size ${chosenLabel}` : 'it'} is back.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[10px] tracking-[0.18em] uppercase text-slate-500 font-medium">
        {title ?? 'Out of Stock · Notify Me When Available'}
      </p>
      {sizes.length > 1 && (
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Size to be notified about">
          {sizes.map((s) => (
            <button
              key={s.variantId}
              type="button"
              role="radio"
              aria-checked={variantId === s.variantId}
              onClick={() => { setVariantId(s.variantId); setError(''); }}
              className={[
                'h-9 min-w-9 px-2.5 border text-xs font-medium transition-colors',
                variantId === s.variantId
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 text-slate-700 hover:border-slate-900',
              ].join(' ')}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex gap-2" noValidate>
        <input
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(''); }}
          placeholder="your@email.com"
          aria-label="Email address for back-in-stock notification"
          required
          /* focus:outline-none removed the only keyboard indicator, leaving a
             1px border-colour change as the sole focus cue. Adds the standard
             Bansari mauve focus-visible ring used elsewhere on the PDP.
             Styling only — no notify/submit logic touched. */
          className="flex-1 h-12 px-3 text-sm border border-slate-200 rounded-sm bg-white text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-[#8A5A6A] focus-visible:ring-2 focus-visible:ring-[#8A5A6A] focus-visible:ring-offset-1 transition-colors"
        />
        <button
          type="submit"
          disabled={loading}
          className="h-12 px-4 text-xs tracking-[0.12em] uppercase font-medium bg-slate-900 text-white rounded-sm hover:bg-[#8A5A6A] disabled:bg-slate-300 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors flex-shrink-0"
        >
          {loading ? '…' : 'Notify Me'}
        </button>
      </form>
      {error && (
        <p role="alert" className="text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}
