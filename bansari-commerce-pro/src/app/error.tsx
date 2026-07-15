'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to error reporting service in production
    console.error('[GlobalError]', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-stone-50 px-6 text-center">
      <p className="text-8xl font-thin text-stone-300 select-none">500</p>
      <h1 className="mt-4 text-2xl font-semibold text-stone-800">
        Something went wrong
      </h1>
      <p className="mt-2 max-w-md text-stone-500">
        An unexpected error occurred. Our team has been notified.
        {error.digest && (
          <span className="mt-1 block text-xs text-stone-400">
            Error ID: {error.digest}
          </span>
        )}
      </p>
      <div className="mt-8 flex gap-4">
        <button
          onClick={reset}
          className="rounded-full bg-stone-800 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-800 focus:ring-offset-2"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-full border border-stone-300 bg-white px-6 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-stone-800 focus:ring-offset-2"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
