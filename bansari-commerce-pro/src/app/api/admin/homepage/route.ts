/**
 * GET  /api/admin/homepage  — list all campaigns
 * POST /api/admin/homepage  — create a campaign
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth/requireAdmin';
import { listAllCampaigns, createCampaign } from '@/services/homepage-campaign.service';
import { CampaignError } from '@/lib/campaign-errors';

export const dynamic = 'force-dynamic';

/**
 * Validates a CTA URL.
 * Accepts: relative paths starting with /
 *          absolute https:// URLs
 * Rejects:  javascript:, data:, ftp:, mailto:, empty malformed strings.
 * Returns an error string, or null if valid (blank is allowed — means no CTA).
 */
function validateCtaUrl(url: unknown): string | null {
  if (url === null || url === undefined || url === '') return null;
  if (typeof url !== 'string') return 'CTA link must be a string';
  const trimmed = url.trim();
  if (trimmed === '') return null;
  if (trimmed.startsWith('/')) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:') return null;
    return `CTA link protocol "${parsed.protocol}" is not allowed. Use a relative path or https://.`;
  } catch {
    return `Invalid CTA URL "${trimmed}". Use a relative path (e.g. /shop) or https://…`;
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdminSession(request);
    if (auth instanceof NextResponse) return auth;
    const campaigns = await listAllCampaigns();
    return NextResponse.json({ campaigns });
  } catch (err) {
    if (err instanceof CampaignError && err.code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const msg = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdminSession(req);
    if (auth instanceof NextResponse) return auth;
    const payload = await req.json();
    if (!payload?.title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    const primaryErr = validateCtaUrl(payload.cta_primary_link);
    if (primaryErr) return NextResponse.json({ error: `Primary CTA: ${primaryErr}` }, { status: 400 });

    const secondaryErr = validateCtaUrl(payload.cta_secondary_link);
    if (secondaryErr) return NextResponse.json({ error: `Secondary CTA: ${secondaryErr}` }, { status: 400 });

    const campaign = await createCampaign(payload);
    return NextResponse.json({ campaign }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    const status = err instanceof CampaignError && err.code === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
