import type { Metadata } from 'next';
import Link from 'next/link';

import {
  getAttributionReport,
  MIN_MEANINGFUL_ORDERS,
} from '@/services/attribution-report.service';

/**
 * /admin/attribution — which channels produce paid orders.
 *
 * The data behind this page has been collected on every order since
 * attribution shipped and never once read. This page is the reader.
 *
 * It reports counts and rupees, never percentages or conversion rates. With a
 * small number of orders a percentage is noise dressed as insight — one order
 * swings it twenty points — and a dashboard that sounds certain about five
 * orders is training the reader to believe it later.
 */

export const metadata: Metadata = {
  title: 'Where Orders Come From | Bansari Commerce Pro',
  description: 'Paid orders and revenue by marketing channel.',
};

export const dynamic = 'force-dynamic';

const rupees = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

/** Human labels for channels we create ourselves. */
const CHANNEL_LABEL: Record<string, string> = {
  instagram: 'Instagram',
  parcel_insert: 'Parcel insert card',
  facebook: 'Facebook',
  google: 'Google',
  direct: 'Direct / unknown',
  meta: 'Meta',
  whatsapp: 'WhatsApp',
};

export default async function AttributionPage() {
  const report = await getAttributionReport(90);
  const attributed = report.totalOrders - report.beforeCapture;

  return (
    <div className="space-y-8">
      <header>
        <nav className="mb-2 flex items-center gap-1.5 text-xs text-slate-500">
          <Link href="/admin" className="hover:text-slate-700">
            Dashboard
          </Link>
          <span>/</span>
          <span className="font-medium text-slate-800">Where orders come from</span>
        </nav>
        <h1 className="text-2xl font-bold text-slate-950">Where orders come from</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Paid orders in the last 90 days, grouped by how the customer arrived. Cancelled
          orders are excluded — a cancelled order would credit a channel with money that
          never arrived.
        </p>
      </header>

      {/* The honesty gate. Shown first, before any number can be misread. */}
      {report.sampleTooSmall && (
        <div className="border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong className="font-semibold">Too few orders to draw conclusions.</strong> There
          are {attributed} attributed orders; differences between channels only become
          distinguishable from chance somewhere around {MIN_MEANINGFUL_ORDERS}. Read the rows
          below as a record of what happened, not as evidence that one channel beats another.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Paid orders (90 days)" value={String(report.totalOrders)} />
        <Stat label="Revenue" value={rupees(report.totalRevenue)} />
        <Stat
          label="Attributed"
          value={`${attributed} of ${report.totalOrders}`}
          note={
            report.beforeCapture > 0
              ? `${report.beforeCapture} placed before attribution existed`
              : undefined
          }
        />
      </div>

      {/* ── Channels ── */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
          By channel
        </h2>

        {report.rows.length === 0 ? (
          <p className="border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
            No attributed orders yet in this window.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="py-2 pr-4 font-medium">Channel</th>
                <th className="py-2 pr-4 font-medium">Campaign</th>
                <th className="py-2 pr-4 text-right font-medium">Orders</th>
                <th className="py-2 pr-4 text-right font-medium">Revenue</th>
                <th className="py-2 font-medium">Last order</th>
              </tr>
            </thead>
            <tbody>
              {report.rows.map((r) => (
                <tr key={`${r.channel}|${r.medium}|${r.campaign}`} className="border-b border-slate-100">
                  <td className="py-2 pr-4 text-slate-900">
                    {CHANNEL_LABEL[r.channel] ?? r.channel}
                    {r.medium && <span className="ml-1.5 text-xs text-slate-500">/ {r.medium}</span>}
                  </td>
                  <td className="py-2 pr-4 text-slate-600">{r.campaign ?? '—'}</td>
                  <td className="py-2 pr-4 text-right tabular-nums text-slate-900">{r.orders}</td>
                  <td className="py-2 pr-4 text-right tabular-nums text-slate-900">
                    {rupees(r.revenue)}
                  </td>
                  <td className="py-2 text-slate-600">
                    {r.lastOrderAt
                      ? new Date(r.lastOrderAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* ── The two channels we built on purpose ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-900">Instagram</h3>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-950">
            {report.instagram.orders} {report.instagram.orders === 1 ? 'order' : 'orders'}
            <span className="ml-2 text-base font-normal text-slate-500">
              {rupees(report.instagram.revenue)}
            </span>
          </p>

          {report.instagram.products.length > 0 ? (
            <ul className="mt-4 space-y-1 text-sm">
              {report.instagram.products.map((p) => (
                <li key={p.productId} className="flex justify-between">
                  <Link href={`/admin/products`} className="text-slate-700 hover:underline">
                    Product #{p.productId}
                  </Link>
                  <span className="tabular-nums text-slate-600">
                    {p.orders} · {rupees(p.revenue)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-slate-500">
              Nothing yet. Posts published from{' '}
              <Link href="/admin/instagram" className="underline underline-offset-2">
                Instagram
              </Link>{' '}
              carry UTM tags, so the product that sold will appear here by name.
            </p>
          )}
        </section>

        <section className="border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-900">Parcel insert card</h3>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-950">
            {report.parcelInsert.orders} {report.parcelInsert.orders === 1 ? 'order' : 'orders'}
            <span className="ml-2 text-base font-normal text-slate-500">
              {rupees(report.parcelInsert.revenue)}
            </span>
          </p>
          <p className="mt-3 text-sm text-slate-600">
            <strong className="font-semibold">
              FIRSTVISIT10 redeemed {report.parcelInsert.couponUses}{' '}
              {report.parcelInsert.couponUses === 1 ? 'time' : 'times'}.
            </strong>{' '}
            This is the more reliable of the two numbers: the UTM tag only survives if the
            customer scanned the QR, but the coupon is redeemed however they arrived.
          </p>
        </section>
      </div>

      <p className="border-t border-slate-200 pt-4 text-xs text-slate-500">
        &ldquo;Direct / unknown&rdquo; means the browser sent no referrer and the link carried
        no tags — typed URLs, some app links, and most WhatsApp shares land here. It is not a
        channel you can grow; it is the absence of a measurement.
      </p>
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="border border-slate-200 p-4">
      <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-950">{value}</p>
      {note && <p className="mt-1 text-xs text-slate-500">{note}</p>}
    </div>
  );
}
