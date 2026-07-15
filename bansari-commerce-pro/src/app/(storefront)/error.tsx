"use client";

export default function StorefrontError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-2xl font-bold text-slate-900">
        Something went wrong
      </h1>

      <p className="max-w-sm text-slate-600">
        We ran into an unexpected error. Please try again or return to the
        homepage.
      </p>

      <div className="flex gap-3">
        <button
          onClick={reset}
          className="rounded-xl bg-[#8A5A6A] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#734757]"
        >
          Try again
        </button>

        <a
          href="/"
          className="rounded-xl border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Back to home
        </a>
      </div>
    </main>
  );
}
