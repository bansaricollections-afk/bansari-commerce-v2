'use client';

import { useCallback, useEffect, useState } from 'react';
import { Star, Check, X, BadgeCheck } from 'lucide-react';

type Review = {
  id: string;
  created_at: string;
  product_id: number;
  product_name: string | null;
  order_id: number;
  customer_email: string;
  author_name: string;
  rating: number;
  title: string | null;
  body: string | null;
  status: 'pending' | 'approved' | 'rejected';
  verified_purchase: boolean;
  photos?: string[];
  reward_coupon_code?: string | null;
};

type Counts = { pending: number; approved: number; rejected: number };

const TABS = ['pending', 'approved', 'rejected', 'all'] as const;
type Tab = (typeof TABS)[number];

/**
 * Moderation queue.
 *
 * Approving is the only thing that publishes a review and the only thing that
 * moves a product's rating, so it is a deliberate click rather than a default.
 * Rejection exists for spam and abuse — not for criticism. A review section
 * with no critical reviews in it is one nobody believes.
 */
export default function ReviewModeration() {
  const [tab, setTab] = useState<Tab>('pending');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [counts, setCounts] = useState<Counts>({ pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (which: Tab) => {
    setLoading(true);
    setError(null);
    try {
      // Checks res.ok: an expired admin session must say so, not render empty.
      const res = await fetch(`/api/admin/reviews?status=${which}`, { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(
          res.status === 401 || res.status === 403
            ? 'Your admin session has expired — sign in again.'
            : `Could not load reviews (${res.status}).`
        );
      }
      const json = await res.json();
      setReviews(Array.isArray(json.data) ? json.data : []);
      if (json.counts) setCounts(json.counts);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load reviews.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(tab);
  }, [tab, load]);

  async function moderate(id: string, status: 'approved' | 'rejected') {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message ?? `That did not go through (${res.status}).`);
      }
      await load(tab);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That did not go through.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition-colors ${
              tab === t
                ? 'bg-slate-900 text-white'
                : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {t}
            {t !== 'all' && counts[t] > 0 && (
              <span className={`ml-2 text-xs ${tab === t ? 'text-white/70' : 'text-slate-400'}`}>
                {counts[t]}
              </span>
            )}
          </button>
        ))}
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-3 py-10">
          <div className="size-5 animate-spin rounded-full border-2 border-[#8A5A6A] border-t-transparent" />
          <span className="text-sm text-slate-500">Loading reviews…</span>
        </div>
      ) : reviews.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
          <p className="text-sm text-slate-500">
            {tab === 'pending' ? 'Nothing waiting for you.' : `No ${tab} reviews.`}
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="flex" aria-label={`${r.rating} out of 5`}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          size={14}
                          strokeWidth={0}
                          fill={i < r.rating ? '#C9A96E' : '#E2E8F0'}
                          aria-hidden="true"
                        />
                      ))}
                    </div>
                    {r.verified_purchase && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                        <BadgeCheck size={13} aria-hidden="true" /> Verified purchase
                      </span>
                    )}
                  </div>

                  {r.title && <p className="mt-2 font-semibold text-slate-900">{r.title}</p>}
                  {r.body && (
                    <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{r.body}</p>
                  )}

                  {Array.isArray(r.photos) && r.photos.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {r.photos.map((url) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={url}
                          src={url}
                          alt="Customer review photo"
                          loading="lazy"
                          className="h-24 w-24 rounded-lg border border-slate-200 object-cover"
                        />
                      ))}
                    </div>
                  )}

                  {/* Says out loud that approving this one also sends a coupon. */}
                  {Array.isArray(r.photos) && r.photos.length > 0 && r.status === 'pending' && (
                    <p className="mt-2 text-xs font-medium text-amber-700">
                      Approving this will email a 10% thank-you code.
                    </p>
                  )}
                  {r.reward_coupon_code && (
                    <p className="mt-2 text-xs text-slate-500">
                      Thank-you code issued: <span className="font-mono">{r.reward_coupon_code}</span>
                    </p>
                  )}

                  <p className="mt-3 text-xs text-slate-500">
                    {r.author_name} · {r.customer_email} · order #{r.order_id} ·{' '}
                    {new Date(r.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {r.product_name ?? `Product ${r.product_id}`}
                  </p>
                </div>

                <div className="flex shrink-0 gap-2">
                  {r.status !== 'approved' && (
                    <button
                      onClick={() => void moderate(r.id, 'approved')}
                      disabled={busyId === r.id}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <Check size={14} aria-hidden="true" /> Approve
                    </button>
                  )}
                  {r.status !== 'rejected' && (
                    <button
                      onClick={() => void moderate(r.id, 'rejected')}
                      disabled={busyId === r.id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
                    >
                      <X size={14} aria-hidden="true" /> Reject
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
