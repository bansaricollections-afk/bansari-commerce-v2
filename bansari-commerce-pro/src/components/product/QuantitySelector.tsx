'use client';

interface Props {
  value: number;
  onChange: (value: number) => void;
  max?: number;
  min?: number;
}

export default function QuantitySelector({
  value,
  onChange,
  max = 99,
  min = 1,
}: Props) {
  const decrement = () => onChange(Math.max(min, value - 1));
  const increment = () => onChange(Math.min(max, value + 1));

  return (
    <div className="inline-flex items-center border border-slate-200 rounded-sm w-fit" role="group" aria-label="Quantity">
      <button
        onClick={decrement}
        disabled={value <= min}
        aria-label="Decrease quantity"
        className="w-11 h-11 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150 rounded-l-sm"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
        </svg>
      </button>
      <span
        aria-live="polite"
        aria-atomic="true"
        className="w-12 text-center text-sm font-medium text-slate-900 select-none border-x border-slate-200 h-11 flex items-center justify-center"
      >
        {value}
      </span>
      <button
        onClick={increment}
        disabled={value >= max}
        aria-label="Increase quantity"
        className="w-11 h-11 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150 rounded-r-sm"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </button>
    </div>
  );
}
