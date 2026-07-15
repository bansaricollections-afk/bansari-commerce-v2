import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '404 — Page Not Found | Bansari Collections',
  description: 'The page you are looking for does not exist.',
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-stone-50 px-6 text-center">
      <p className="text-8xl font-thin text-stone-300 select-none">404</p>
      <h1 className="mt-4 text-2xl font-semibold text-stone-800">
        Page not found
      </h1>
      <p className="mt-2 max-w-md text-stone-500">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <div className="mt-8 flex gap-4">
        <Link
          href="/"
          className="rounded-full bg-stone-800 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-800 focus:ring-offset-2"
        >
          Go home
        </Link>
        <Link
          href="/shop"
          className="rounded-full border border-stone-300 bg-white px-6 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-stone-800 focus:ring-offset-2"
        >
          Browse shop
        </Link>
      </div>
    </div>
  );
}
