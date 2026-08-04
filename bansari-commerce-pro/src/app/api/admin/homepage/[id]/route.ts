/**
 * PUT    /api/admin/homepage/[id]  — update campaign
 * DELETE /api/admin/homepage/[id]  — delete campaign
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { updateCampaign, deleteCampaign } from '@/services/homepage-campaign.service';
import { CampaignError } from '@/lib/campaign-errors';

export const dynamic = 'force-dynamic';

/**
 * Validates a CTA URL.
 * Accepts: relative paths starting with /
 *          absolute https:// URLs
 * Rejects:  javascript:, data:, ftp:, mailto:, empty malformed strings.
 * Returns an error string, or null if valid (blank is allowed — means no CTA).
 * Identical logic to POST /api/admin/homepage — security consistency is mandatory.
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

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const payload = await req.json();

    const primaryErr = validateCtaUrl(payload.cta_primary_link);
    if (primaryErr) return NextResponse.json({ error: `Primary CTA: ${primaryErr}` }, { status: 400 });

    const secondaryErr = validateCtaUrl(payload.cta_secondary_link);
    if (secondaryErr) return NextResponse.json({ error: `Secondary CTA: ${secondaryErr}` }, { status: 400 });

    const campaign = await updateCampaign(id, payload);
    return NextResponse.json({ campaign });
  } catch (err) {
    if (err instanceof CampaignError) {
      const status = err.code === 'NOT_FOUND' ? 404 : err.code === 'UNAUTHORIZED' ? 401 : 500;
      return NextResponse.json({ error: err.message }, { status });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    await deleteCampaign(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof CampaignError) {
      const status = err.code === 'NOT_FOUND' ? 404 : err.code === 'UNAUTHORIZED' ? 401 : 500;
      return NextResponse.json({ error: err.message }, { status });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
