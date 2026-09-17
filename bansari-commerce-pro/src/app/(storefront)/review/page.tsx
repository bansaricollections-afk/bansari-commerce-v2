import type { Metadata } from 'next';
import Link from 'next/link';

import { verifyReviewToken } from '@/lib/review-token';
import { getReviewInvitation } from '@/services/review.service';
import ReviewForm from '@/components/reviews/ReviewForm';

/**
 * /review?t=<signed token>
 *
 * The page a customer reaches from their delivery email. The token is
 * verified and the purchase re-checked here, on the server, so an invalid or
 * stale link shows a plain explanation rather than an empty form that would
 * fail on submit.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Write a review | Bansari Collections',
  // A one-off link to one customer's purchase has no business in search.
  robots: { index: false, follow: false },
};

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen" style={{ backgroundColor: 'var(--bc-surface-cream)' }}>
      <div className="mx-auto max-w-2xl px-6 py-20">
        <h1
          className="font-[family:var(--font-playfair)] text-3xl sm:text-4xl"
          style={{ fontWeight: 400, color: 'var(--bc-text-primary)' }}
        >
          {title}
        </h1>
        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}

function Message({ title, text }: { title: string; text: string }) {
  return (
    <Shell title={title}>
      <p className="text-[15px] leading-relaxed" style={{ color: 'var(--bc-text-secondary)' }}>
        {text}
      </p>
      <Link href="/shop" className="bc-cta-primary mt-8">
        Continue Shopping
      </Link>
    </Shell>
  );
}

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t } = await searchParams;

  const verified = verifyReviewToken(t ?? '');
  if (!verified.valid) {
    return (
      <Message
        title={verified.reason === 'EXPIRED' ? 'This link has expired' : 'This link is not valid'}
        text={
          verified.reason === 'EXPIRED'
            ? 'Review invitations stay open for 90 days. Get in touch and we will happily send you a fresh one.'
            : 'Please open the review link directly from your delivery email — copying part of it can break the link.'
        }
      />
    );
  }

  const result = await getReviewInvitation(
    verified.payload.orderItemId,
    verified.payload.orderId
  );

  if (!result.ok) {
    const title =
      result.code === 'ALREADY_REVIEWED' ? 'You have already reviewed this'
      : result.code === 'NOT_DELIVERED' ? 'Not delivered yet'
      : 'We could not find that purchase';
    return <Message title={title} text={result.message} />;
  }

  const { invitation } = result;

  return (
    <Shell title="How was it?">
      <p className="text-[15px] leading-relaxed" style={{ color: 'var(--bc-text-secondary)' }}>
        You bought the <strong style={{ color: 'var(--bc-text-primary)' }}>{invitation.productName}</strong>
        {invitation.variantSize ? ` in size ${invitation.variantSize}` : ''} on order{' '}
        {invitation.orderNumber}. Tell other shoppers what it is really like — the fit, the
        fabric, the colour in daylight.
      </p>
      <ReviewForm token={t ?? ''} invitation={invitation} />
    </Shell>
  );
}
