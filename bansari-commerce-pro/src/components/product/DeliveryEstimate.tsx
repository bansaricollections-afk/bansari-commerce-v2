'use client';

/**
 * DeliveryEstimate
 * ─────────────────
 * Renders an inline delivery date estimate directly below the price block.
 * Uses a deterministic offset from today so it is always accurate without
 * an API call.  Metro pincodes get 3 business days; all others get 5.
 *
 * The pincode checker (PincodeChecker.tsx) remains below for the user to
 * verify their specific pincode — this strip is a quick visual reassurance.
 */

import { useMemo } from 'react';
import { SHIPPING_THRESHOLD } from '@/lib/shipping';

function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return result;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function fmt(d: Date): string {
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export default function DeliveryEstimate() {
  const { metro, rest } = useMemo(() => {
    const today = new Date();
    return {
      metro: fmt(addBusinessDays(today, 3)),
      rest: fmt(addBusinessDays(today, 5)),
    };
  }, []);

  return (
    <div className="flex items-start gap-2.5 text-[12px] text-slate-600">
      {/* Truck icon */}
      <svg
        className="w-4 h-4 text-[#8A5A6A] flex-shrink-0 mt-px"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"
        />
      </svg>
      <span>
        <span className="font-medium text-slate-800">Free delivery over &#8377;{SHIPPING_THRESHOLD.toLocaleString('en-IN')}</span>
        {' · '}
        Metro by <span className="font-medium">{metro}</span>
        {' · '}
        Rest of India by <span className="font-medium">{rest}</span>
      </span>
    </div>
  );
}
