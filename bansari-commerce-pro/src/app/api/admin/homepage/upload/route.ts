/**
 * POST /api/admin/homepage/upload
 * Multipart form: field=file, field=variant (desktop|tablet|mobile)
 *
 * Stores in Supabase Storage bucket `homepage-campaigns`.
 * Returns { url } — the public CDN URL.
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth/requireAdmin';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { CampaignError } from '@/lib/campaign-errors';
import { detectImageTypeFromFile } from '@/lib/image-signature';

export const dynamic = 'force-dynamic';

const BUCKET = 'homepage-campaigns';

// Minimum dimensions by variant (informational — enforced client-side)
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif'];

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdminSession(req);
    if (auth instanceof NextResponse) return auth;

    const form = await req.formData();
    const file = form.get('file') as File | null;
    const variant = (form.get('variant') as string | null) ?? 'desktop';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Allowed: JPEG, PNG, WebP, AVIF' }, { status: 400 });
    }
    // 50 MB cap
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'File exceeds 50 MB limit' }, { status: 400 });
    }

    /*
     * Verify the bytes match the claim. `file.type` above is whatever the
     * client chose to send, so on its own it proves nothing — this is the check
     * that actually establishes the upload is an image.
     */
    const detected = await detectImageTypeFromFile(file);
    if (!detected || !ALLOWED_TYPES.includes(detected.mime)) {
      return NextResponse.json(
        { error: 'File contents are not a supported image (JPEG, PNG, WebP, AVIF).' },
        { status: 400 }
      );
    }

    /*
     * Extension comes from the DETECTED type, never from `file.name`. The
     * previous `file.name.split('.').pop()` built the storage key out of an
     * attacker-influenced string, which is how uploads end up with surprising
     * extensions and nested paths.
     */
    const timestamp = Date.now();
    const path = `campaigns/${variant}/${timestamp}.${detected.ext}`;

    const sb = createServiceRoleClient();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await sb.storage
      .from(BUCKET)
      // Detected type, not the declared one — the stored Content-Type is what
      // browsers act on, so it must reflect the actual bytes.
      .upload(path, buffer, { contentType: detected.mime, upsert: false });

    if (uploadError) throw new CampaignError(uploadError.message, 'INTERNAL');

    const { data: urlData } = sb.storage.from(BUCKET).getPublicUrl(path);

    return NextResponse.json({ url: urlData.publicUrl, path }, { status: 201 });
  } catch (err) {
    if (err instanceof CampaignError) {
      const status = err.code === 'UNAUTHORIZED' ? 401 : 500;
      return NextResponse.json({ error: err.message }, { status });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
