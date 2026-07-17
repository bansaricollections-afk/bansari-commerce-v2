'use client';

import { useState } from 'react';

type DeliveryResult = {
  available: boolean;
  days: string;
  charge: string;
};

// Lightweight mock — replace with real serviceable-pincodes API call.
async function checkPincode(pin: string): Promise<DeliveryResult> {
  await new Promise((r) => setTimeout(r, 700)); // simulate latency
  // All India delivery — treat any 6-digit pin as serviceable.
  const valid = /^[1-9][0-9]{5}$/.test(pin);
  if (!valid) return { available: false, days: '', charge: '' };
  return {
    available: true,
    days: '3–7 business days',
    charge: 'Free shipping',
  };
}

export default function PincodeChecker() {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DeliveryResult | null>(null);
  const [error, setError] = useState('');

  const handleCheck = async () => {
    if (pin.length !== 6) {
      setError('Enter a valid 6-digit pincode.');
      setResult(null);
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await checkPincode(pin);
      setResult(res);
      if (!res.available) setError('Delivery not available at this pincode.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[10px] tracking-[0.18em] uppercase text-slate-500 font-medium">
        Check Delivery
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={pin}
          onChange={(e) => {
            setPin(e.target.value.replace(/\D/g, ''));
            setResult(null);
            setError('');
          }}
          onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
          placeholder="Enter pincode"
          aria-label="Delivery pincode"
          className="flex-1 h-10 px-3 text-sm border border-slate-200 rounded-sm bg-white text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-[#8A5A6A] transition-colors"
        />
        <button
          onClick={handleCheck}
          disabled={loading || pin.length !== 6}
          className="h-10 px-4 text-xs tracking-[0.12em] uppercase font-medium bg-slate-900 text-white rounded-sm hover:bg-[#8A5A6A] disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? '…' : 'Check'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <span aria-hidden>✕</span> {error}
        </p>
      )}

      {/* Success */}
      {result?.available && (
        <div className="text-xs text-slate-600 flex flex-col gap-0.5">
          <span className="flex items-center gap-1.5 text-green-700">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Delivery available · {result.days}
          </span>
          <span className="text-slate-500 pl-5">{result.charge} · Prepaid Orders Only</span>
        </div>
      )}
    </div>
  );
}
