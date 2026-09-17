import type { Metadata } from 'next';
import ReviewModeration from '@/components/admin/reviews/ReviewModeration';

export const metadata: Metadata = {
  title: 'Reviews | Bansari Commerce Pro',
  description: 'Approve or reject customer reviews before they appear on the storefront.',
};

export default function AdminReviewsPage() {
  return (
    <div>
      <div className="mb-8">
        <nav className="mb-2 flex items-center gap-1.5 text-xs text-slate-500">
          <a href="/admin" className="hover:text-slate-700">Dashboard</a>
          <span>/</span>
          <span className="font-medium text-slate-800">Reviews</span>
        </nav>
        <h1 className="text-2xl font-bold text-slate-950">Reviews</h1>
        <p className="mt-1 text-sm text-slate-600">
          Every review here comes from a verified purchase. Nothing appears on the
          storefront until you approve it.
        </p>
      </div>
      <ReviewModeration />
    </div>
  );
}
