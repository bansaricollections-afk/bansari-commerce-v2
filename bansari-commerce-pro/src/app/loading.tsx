export default function GlobalLoading() {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-stone-50"
      role="status"
      aria-label="Loading"
    >
      <div className="flex flex-col items-center gap-4">
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-stone-200 border-t-stone-700"
          aria-hidden="true"
        />
        <p className="text-sm text-stone-400">Loading&hellip;</p>
      </div>
    </div>
  );
}
