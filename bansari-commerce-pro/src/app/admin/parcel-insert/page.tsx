import type { Metadata } from 'next';
import QRCode from 'qrcode';

import { createServiceRoleClient } from '@/lib/supabase/service';

/**
 * /admin/parcel-insert — a print-ready card to drop into every parcel.
 *
 * WHY THIS EXISTS
 * The shop sells on Myntra, Amazon and Flipkart, and those are its only real
 * audience today: people who have already paid, already trust the product, and
 * are physically holding it. The website gets almost none of them, because
 * nothing ever tells them it exists.
 *
 * A printed card is the cheapest customer acquisition available here. It costs
 * paper. Every other channel — search, ads, social — costs months or money to
 * reach someone who is merely a stranger; this one reaches a proven buyer at
 * the moment they are pleased with the purchase.
 *
 * WHY THE DISCOUNT CODE MATTERS MORE THAN THE URL
 * A code is the only way to know the card worked. When FIRSTVISIT10 starts
 * appearing on orders, the cards are doing their job; if it never appears,
 * they are not, and that is worth knowing before printing more.
 *
 * The QR is generated here, server-side, rather than through a third-party QR
 * image service — a card printed on 500 parcels must not depend on someone
 * else's API still existing, or on it being reachable the day you press print.
 */

export const metadata: Metadata = {
  title: 'Parcel Insert Card',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

const SITE = 'https://www.bansaricollection.in';
const CODE = 'FIRSTVISIT10';

/** utm tags so the visits these cards produce are distinguishable in analytics. */
const CARD_URL = `${SITE}/?utm_source=parcel_insert&utm_medium=print&utm_campaign=marketplace_to_site`;

export default async function ParcelInsertPage() {
  /*
   * Read the coupon rather than hardcoding the number. A card that promises
   * 10% while the coupon gives 5 is worse than no card — and printed paper
   * cannot be corrected later.
   */
  const sb = createServiceRoleClient();
  const { data: coupon } = await sb
    .from('coupons')
    .select('code, discount_value, discount_type, active, expires_at, max_uses, uses_count')
    .eq('code', CODE)
    .maybeSingle();

  const percent = coupon?.discount_type === 'percentage' ? Number(coupon.discount_value) : null;
  const usable = Boolean(coupon?.active) && percent !== null;

  const qrSvg = await QRCode.toString(CARD_URL, {
    type: 'svg',
    margin: 0,
    errorCorrectionLevel: 'M',
    color: { dark: '#1A0F16', light: '#0000' },
  });

  const Card = ({ n }: { n: number }) => (
    <div className="card" key={n}>
      <div className="card-inner">
        <div className="card-copy">
          <p className="eyebrow">Bansari Collections</p>
          <h2 className="headline">
            Thank you for
            <br />
            your order
          </h2>
          <p className="body">
            You bought this on a marketplace — but our full collection lives on our own
            website, with new pieces first and sizes you will not find listed elsewhere.
          </p>

          {usable && (
            <div className="offer">
              <p className="offer-label">{percent}% off your next order</p>
              <p className="offer-code">{coupon!.code}</p>
              <p className="offer-terms">Enter at checkout · No minimum spend</p>
            </div>
          )}

          <p className="url">bansaricollection.in</p>
        </div>

        <div className="card-qr">
          <div className="qr" dangerouslySetInnerHTML={{ __html: qrSvg }} />
          <p className="qr-caption">Scan to shop</p>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      {/* Screen-only instructions. `no-print` keeps them off the paper. */}
      <div className="no-print" style={{ marginBottom: 24 }}>
        <h1 className="text-2xl font-bold text-slate-950">Parcel insert card</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Four cards per A4 sheet. Print, cut along the guides, and put one in every
          marketplace parcel. Press <strong>Ctrl/Cmd + P</strong> and choose{' '}
          <strong>Background graphics</strong> so the borders print.
        </p>

        {!usable ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <strong>The {CODE} coupon is missing or inactive.</strong> The offer block is
            hidden so the card cannot promise a discount that will not apply at checkout.
            Create or reactivate the coupon, then reload.
          </div>
        ) : (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <strong>
              {coupon!.code} — {percent}% off, no minimum
            </strong>
            , used {coupon!.uses_count ?? 0} of {coupon!.max_uses ?? '∞'} times. That count
            is how you will know whether these cards are working.
          </div>
        )}
      </div>

      <div className="sheet">
        {[1, 2, 3, 4].map((n) => (
          <Card key={n} n={n} />
        ))}
      </div>

      {/*
        Plain CSS rather than Tailwind: this markup is laid out in millimetres
        for paper, and @page/mm sizing has no Tailwind equivalent.
      */}
      <style>{`
        .sheet {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0;
          width: 210mm;
          margin: 0 auto;
          background: #fff;
        }
        .card {
          width: 105mm;
          height: 74mm;
          padding: 6mm;
          box-sizing: border-box;
          border: 1px dashed #d8d2c8;   /* cut guide */
        }
        .card-inner {
          display: flex;
          gap: 5mm;
          height: 100%;
          padding: 5mm;
          box-sizing: border-box;
          border: 1px solid #C9A96E;
          background: #FFFDF9;
        }
        .card-copy { display: flex; flex-direction: column; flex: 1; min-width: 0; }
        .eyebrow {
          margin: 0 0 2mm;
          font: 600 6.5pt/1 Inter, Arial, sans-serif;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #9E7B47;
        }
        .headline {
          margin: 0 0 2.5mm;
          font: 400 15pt/1.15 "Playfair Display", Georgia, serif;
          color: #1A0F16;
        }
        .body {
          margin: 0 0 auto;
          font: 400 7pt/1.45 Inter, Arial, sans-serif;
          color: #4B3A43;
        }
        .offer {
          margin: 2.5mm 0;
          padding: 2.5mm 3mm;
          background: #F9F3E8;
          border: 1px solid #E2C98E;
        }
        .offer-label {
          margin: 0;
          font: 600 7pt/1.2 Inter, Arial, sans-serif;
          color: #9E7B47;
        }
        .offer-code {
          margin: 1mm 0 0;
          font: 700 13pt/1.1 Inter, Arial, sans-serif;
          letter-spacing: 0.12em;
          color: #1A0F16;
        }
        .offer-terms {
          margin: 1mm 0 0;
          font: 400 6pt/1.2 Inter, Arial, sans-serif;
          color: #7A6872;
        }
        .url {
          margin: 0;
          font: 600 8.5pt/1.2 Inter, Arial, sans-serif;
          letter-spacing: 0.04em;
          color: #1A0F16;
        }
        .card-qr {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1.5mm;
          width: 26mm;
          flex-shrink: 0;
        }
        .qr svg { width: 24mm; height: 24mm; display: block; }
        .qr-caption {
          margin: 0;
          font: 500 5.5pt/1 Inter, Arial, sans-serif;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #7A6872;
          text-align: center;
        }

        @media print {
          .no-print { display: none !important; }
          @page { size: A4; margin: 8mm; }
          body { background: #fff !important; }
          .sheet { width: auto; }
          .card { break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}
