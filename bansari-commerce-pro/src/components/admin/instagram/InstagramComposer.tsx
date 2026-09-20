'use client';

import Image from 'next/image';
import { useState } from 'react';
import { AlertTriangle, CheckCircle2, ExternalLink, Image as ImageIcon, Loader2, Send } from 'lucide-react';

/**
 * The Instagram composer.
 *
 * Two rules drive the layout:
 *
 *  1. WHAT WILL BE PUBLISHED IS WHAT IS ON SCREEN. The caption box holds the
 *     exact string sent to Instagram, and the thumbnails are the exact 4:5
 *     renditions Meta will fetch — not the originals with CSS cropping them to
 *     look right. A preview that is a re-rendering rather than the artefact is
 *     not a preview.
 *
 *  2. ALTERATIONS ARE DISCLOSED. Most of this catalogue is 2:3 or 3:4 and has
 *     to be padded to meet Instagram's 4:5 floor. That changes the merchant's
 *     photography, so the page says so per image rather than quietly doing it.
 */

const CAPTION_MAX = 2200;

type Status = {
  connected: boolean;
  username?: string;
  limit: { used: number; cap: number } | null;
  publishedToday: number;
};

type ProductRow = {
  id: number;
  name: string;
  price: number;
  imageCount: number;
  thumb: string | null;
};

type RecentRow = {
  id: number;
  productId: number | null;
  status: string;
  permalink: string | null;
  caption: string;
  error: string | null;
  publishedAt: string | null;
  createdAt: string;
};

type PreparedImage = {
  url: string;
  action: 'padded' | 'resized' | 'unchanged';
  sourceRatio: number;
  width: number;
  height: number;
  bytes: number;
};

type Preview = {
  caption: string;
  hashtags: string[];
  usedAttributes: { label: string; value: string }[];
  productUrl: string;
  images: PreparedImage[];
  skipped: { url: string; reason: string }[];
  product: { id: number; name: string; price: number };
};

export default function InstagramComposer({
  status,
  products,
  recent,
}: {
  status: Status;
  products: ProductRow[];
  recent: RecentRow[];
}) {
  const [selected, setSelected] = useState<ProductRow | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [caption, setCaption] = useState('');
  const [chosen, setChosen] = useState<string[]>([]);
  const [busy, setBusy] = useState<'preview' | 'publish' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ permalink: string | null } | null>(null);

  async function runPreview(product: ProductRow) {
    setSelected(product);
    setPreview(null);
    setDone(null);
    setError(null);
    setBusy('preview');
    try {
      const res = await fetch('/api/admin/instagram/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message ?? `HTTP ${res.status}`);
      setPreview(json as Preview);
      setCaption(json.caption);
      setChosen((json.images as PreparedImage[]).map((i) => i.url));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Preview failed');
    } finally {
      setBusy(null);
    }
  }

  async function publish() {
    if (!preview || !selected) return;
    setError(null);
    setBusy('publish');
    try {
      const res = await fetch('/api/admin/instagram/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selected.id,
          caption,
          hashtags: preview.hashtags,
          imageUrls: chosen,
          altText: selected.name,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message ?? `HTTP ${res.status}`);
      setDone({ permalink: json.permalink ?? null });
      setPreview(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Publish failed');
    } finally {
      setBusy(null);
    }
  }

  const toggle = (url: string) =>
    setChosen((c) => (c.includes(url) ? c.filter((u) => u !== url) : [...c, url]));

  const paddedCount = preview?.images.filter((i) => i.action === 'padded').length ?? 0;
  const tooMany = chosen.length > 10;
  const tooLong = caption.length > CAPTION_MAX;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-slate-950">Instagram</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Pick a product, check the caption and the images, then publish. Captions are built
          from the attributes already entered against the product, so they can never disagree
          with the product page.
        </p>
      </header>

      <ConnectionBanner status={status} />

      {error && (
        <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div>
            <strong className="font-semibold">Could not complete that.</strong>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      )}

      {done && (
        <div className="flex gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          <div>
            <strong className="font-semibold">Published.</strong>{' '}
            {done.permalink ? (
              <a
                href={done.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 underline underline-offset-2"
              >
                View on Instagram <ExternalLink size={13} />
              </a>
            ) : (
              'The post is live; Instagram did not return a permalink.'
            )}
            <p className="mt-1 text-emerald-700">
              Reload to refresh the queue.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* ── Queue ── */}
        <section>
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-slate-500">
            Never posted
          </h2>
          <p className="mb-4 text-xs text-slate-500">
            {products.length} of your active products have no published post.
          </p>

          <ul className="max-h-[640px] space-y-1 overflow-y-auto pr-1">
            {products.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => runPreview(p)}
                  disabled={busy !== null}
                  className={`flex w-full items-center gap-3 border px-3 py-2 text-left transition-colors disabled:opacity-50 ${
                    selected?.id === p.id
                      ? 'border-slate-900 bg-slate-50'
                      : 'border-slate-200 hover:border-slate-400'
                  }`}
                >
                  {p.thumb ? (
                    <Image
                      src={p.thumb}
                      alt=""
                      width={40}
                      height={50}
                      unoptimized
                      className="h-[50px] w-10 shrink-0 object-cover"
                    />
                  ) : (
                    <span className="flex h-[50px] w-10 shrink-0 items-center justify-center bg-slate-100">
                      <ImageIcon size={14} className="text-slate-400" />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-slate-900">{p.name}</span>
                    <span className="block text-xs text-slate-500">
                      ₹{Math.round(p.price).toLocaleString('en-IN')} · {p.imageCount} photos
                    </span>
                  </span>
                </button>
              </li>
            ))}
            {products.length === 0 && (
              <li className="border border-dashed border-slate-200 px-3 py-6 text-center text-sm text-slate-500">
                Every active product has been posted.
              </li>
            )}
          </ul>
        </section>

        {/* ── Composer ── */}
        <section>
          {busy === 'preview' && (
            <div className="flex items-center gap-3 border border-slate-200 px-4 py-8 text-sm text-slate-600">
              <Loader2 size={18} className="animate-spin" />
              Preparing images — each photo is being padded to Instagram&rsquo;s 4:5 shape and
              uploaded. This takes a few seconds per photo.
            </div>
          )}

          {!preview && busy !== 'preview' && (
            <div className="border border-dashed border-slate-200 px-4 py-16 text-center text-sm text-slate-500">
              Select a product to compose a post.
            </div>
          )}

          {preview && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">{preview.product.name}</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Built from: {preview.usedAttributes.map((a) => a.label).join(', ') || 'name and price only'}
                </p>
              </div>

              {paddedCount > 0 && (
                <div className="flex gap-3 border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                  <p>
                    <strong className="font-semibold">
                      {paddedCount} of {preview.images.length} photos were padded.
                    </strong>{' '}
                    They are taller than Instagram accepts, so cream has been added above and
                    below rather than cropping the garment. Instagram would have refused the
                    originals outright.
                  </p>
                </div>
              )}

              {preview.skipped.length > 0 && (
                <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <strong className="font-semibold">
                    {preview.skipped.length} photo(s) could not be prepared
                  </strong>{' '}
                  and will not be posted: {preview.skipped[0]!.reason}
                </div>
              )}

              {/* Images */}
              <div>
                <div className="mb-2 flex items-baseline justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Images — {chosen.length} selected
                  </h3>
                  <span className={`text-xs ${tooMany ? 'font-semibold text-red-600' : 'text-slate-500'}`}>
                    Instagram allows up to 10
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
                  {preview.images.map((img, i) => {
                    const on = chosen.includes(img.url);
                    return (
                      <button
                        key={img.url}
                        type="button"
                        onClick={() => toggle(img.url)}
                        className={`group relative block border-2 transition-colors ${
                          on ? 'border-slate-900' : 'border-transparent opacity-40 hover:opacity-70'
                        }`}
                      >
                        {/* The actual 4:5 rendition Meta will fetch. */}
                        <Image
                          src={img.url}
                          alt=""
                          width={img.width}
                          height={img.height}
                          unoptimized
                          className="block w-full"
                        />
                        <span className="absolute left-1 top-1 bg-white/90 px-1 text-[10px] font-medium text-slate-700">
                          {on ? i + 1 : '—'}
                        </span>
                        {img.action === 'padded' && (
                          <span className="absolute bottom-1 left-1 bg-amber-100 px-1 text-[10px] text-amber-900">
                            padded {img.sourceRatio}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Caption */}
              <div>
                <div className="mb-2 flex items-baseline justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">Caption</h3>
                  <span
                    className={`text-xs ${tooLong ? 'font-semibold text-red-600' : 'text-slate-500'}`}
                  >
                    {caption.length.toLocaleString()} / {CAPTION_MAX.toLocaleString()}
                  </span>
                </div>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows={16}
                  spellCheck
                  className="w-full border border-slate-300 px-3 py-2 font-mono text-[13px] leading-relaxed text-slate-900 focus:border-slate-900 focus:outline-none"
                />
                <p className="mt-2 text-xs text-slate-500">
                  The link carries UTM tags, so visits from this post show up in Analytics as
                  <code className="mx-1 bg-slate-100 px-1">instagram / social</code>
                  rather than direct traffic.
                </p>
              </div>

              <div className="flex items-center gap-4 border-t border-slate-200 pt-5">
                <button
                  type="button"
                  onClick={publish}
                  disabled={
                    busy !== null || !status.connected || chosen.length === 0 || tooMany || tooLong
                  }
                  className="inline-flex items-center gap-2 bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {busy === 'publish' ? (
                    <>
                      <Loader2 size={15} className="animate-spin" /> Publishing…
                    </>
                  ) : (
                    <>
                      <Send size={15} /> Publish to Instagram
                    </>
                  )}
                </button>

                <p className="text-xs text-slate-500">
                  {!status.connected
                    ? 'Connect Instagram first.'
                    : busy === 'publish'
                      ? 'Meta is fetching and processing each image — this can take a minute. Do not close the tab.'
                      : 'This posts immediately and cannot be undone from here.'}
                </p>
              </div>
            </div>
          )}
        </section>
      </div>

      {recent.length > 0 && <RecentPosts recent={recent} />}
    </div>
  );
}

function ConnectionBanner({ status }: { status: Status }) {
  if (!status.connected) {
    return (
      <div className="border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <strong className="font-semibold">Instagram is not connected.</strong> You can compose
        and preview posts, but Publish stays disabled until{' '}
        <code className="bg-amber-100 px-1">IG_USER_ID</code> and{' '}
        <code className="bg-amber-100 px-1">IG_ACCESS_TOKEN</code> are set. See{' '}
        <code className="bg-amber-100 px-1">docs/instagram-setup.md</code>.
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
      <span>
        Connected as <strong className="font-semibold">@{status.username}</strong>
      </span>
      {status.limit && (
        <span>
          {status.limit.used} of {status.limit.cap} API posts used in the last 24 hours
        </span>
      )}
      <span>{status.publishedToday} published from here today</span>
    </div>
  );
}

function RecentPosts({ recent }: { recent: RecentRow[] }) {
  return (
    <section className="border-t border-slate-200 pt-6">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
        Recent posts
      </h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500">
            <th className="py-2 pr-4 font-medium">When</th>
            <th className="py-2 pr-4 font-medium">Status</th>
            <th className="py-2 pr-4 font-medium">Caption</th>
            <th className="py-2 font-medium">Link</th>
          </tr>
        </thead>
        <tbody>
          {recent.map((r) => (
            <tr key={r.id} className="border-b border-slate-100 align-top">
              <td className="whitespace-nowrap py-2 pr-4 text-slate-600">
                {new Date(r.publishedAt ?? r.createdAt).toLocaleString('en-IN', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </td>
              <td className="py-2 pr-4">
                <span
                  className={
                    r.status === 'published'
                      ? 'text-emerald-700'
                      : r.status === 'failed'
                        ? 'text-red-600'
                        : 'text-amber-700'
                  }
                >
                  {r.status}
                </span>
                {r.error && <p className="mt-0.5 text-xs text-red-500">{r.error}</p>}
              </td>
              <td className="max-w-md truncate py-2 pr-4 text-slate-700">
                {r.caption.split('\n')[0]}
              </td>
              <td className="py-2">
                {r.permalink && (
                  <a
                    href={r.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-slate-600 underline underline-offset-2"
                  >
                    View <ExternalLink size={12} />
                  </a>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
