'use client';

/**
 * NotifyMe
 * ─────────
 * Shown instead of the Add to Cart button when a product is out of stock.
 * Accepts an email address and stores the intent (mock — replace with API).
 * Keeps the same button height (h-12) and uppercase tracking as ProductActions
 * so the layout does not shift when stock status changes.
 */

import { useState } from 'react';

interface Props {
  productId: number;
  productName: string;
}

export default function NotifyMe({ productId, productName }: Props) {
  const [email, setEmail] = useState('');
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
    setError('');
    setLoading(true);
    try {
      // TODO: replace with real back-in-stock notification API
      await new Promise((r) => setTimeout(r, 600));
      console.info('[NotifyMe] registered', { productId, productName, email });
      setSubmitted(true);
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
          We\'ll notify you at <span className="font-medium">{email}</span> when it\'s back.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[10px] tracking-[0.18em] uppercase text-slate-500 font-medium">
        Out of Stock · Notify Me When Available
      </p>
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
