/**
 * Homepage Campaign CMS — Service Layer
 *
 * Repository pattern matching catalog.service.ts architecture.
 * Uses service-role client (bypasses RLS) — admin-only writes.
 * Public read: getActiveCampaigns uses service client too since Hero
 * is a Server Component with no user session.
 */
import { createServiceRoleClient } from '@/lib/supabase/service';
import { CampaignError } from '@/lib/campaign-errors';
import {
  mapCampaign,
  type HomepageCampaign,
  type CampaignWritePayload,
  type DbHomepageCampaign,
} from '@/types/homepage-campaign';

const TABLE = 'homepage_campaigns';

// ─── SELECT helper ────────────────────────────────────────────────────────────
const COLS = [
  'id', 'title', 'headline_line1', 'headline_highlight', 'headline_line2',
  'description', 'cta_primary_text', 'cta_primary_link',
  'cta_secondary_text', 'cta_secondary_link',
  'desktop_image', 'tablet_image', 'mobile_image', 'video_url', 'image_alt',
  'overlay_color', 'overlay_opacity', 'text_alignment', 'image_position',
  'button_style', 'sort_order', 'priority', 'status',
  'start_date', 'end_date', 'created_at', 'updated_at',
].join(', ');

// ─── Public: active campaigns for Hero renderer ───────────────────────────────
export async function getActiveCampaigns(): Promise<HomepageCampaign[]> {
  const sb = createServiceRoleClient();
  const now = new Date().toISOString();

  const { data, error } = await sb
    .from(TABLE)
    .select(COLS)
    .eq('status', 'published')
    .or(`start_date.is.null,start_date.lte.${now}`)
    .or(`end_date.is.null,end_date.gte.${now}`)
    .order('priority', { ascending: false })
    .order('sort_order', { ascending: true });

  if (error) throw new CampaignError(error.message, 'INTERNAL');
  return ((data ?? []) as unknown as DbHomepageCampaign[]).map(mapCampaign);
}

// ─── Admin: list all ──────────────────────────────────────────────────────────
export async function listAllCampaigns(): Promise<HomepageCampaign[]> {
  const sb = createServiceRoleClient();
  const { data, error } = await sb
    .from(TABLE)
    .select(COLS)
    .order('sort_order', { ascending: true });
  if (error) throw new CampaignError(error.message, 'INTERNAL');
  return ((data ?? []) as unknown as DbHomepageCampaign[]).map(mapCampaign);
}

// ─── Admin: get by id ─────────────────────────────────────────────────────────
export async function getCampaignById(id: string): Promise<HomepageCampaign> {
  const sb = createServiceRoleClient();
  const { data, error } = await sb
    .from(TABLE)
    .select(COLS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new CampaignError(error.message, 'INTERNAL');
  if (!data) throw new CampaignError(`Campaign ${id} not found`, 'NOT_FOUND');
  return mapCampaign(data as unknown as DbHomepageCampaign);
}

// ─── Admin: create ────────────────────────────────────────────────────────────
export async function createCampaign(
  payload: CampaignWritePayload
): Promise<HomepageCampaign> {
  const sb = createServiceRoleClient();
  // Default sort_order = end of list
  if (payload.sort_order === undefined) {
    const { count } = await sb.from(TABLE).select('id', { count: 'exact', head: true });
    payload.sort_order = (count ?? 0) + 1;
  }
  const { data, error } = await sb
    .from(TABLE)
    .insert({ ...payload, status: payload.status ?? 'draft' })
    .select(COLS)
    .single();
  if (error) throw new CampaignError(error.message, 'INTERNAL');
  return mapCampaign(data as unknown as DbHomepageCampaign);
}

// ─── Admin: update ────────────────────────────────────────────────────────────
export async function updateCampaign(
  id: string,
  payload: Partial<CampaignWritePayload>
): Promise<HomepageCampaign> {
  const sb = createServiceRoleClient();
  const { data, error } = await sb
    .from(TABLE)
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(COLS)
    .single<DbHomepageCampaign>();
  if (error) throw new CampaignError(error.message, 'INTERNAL');
  if (!data) throw new CampaignError(`Campaign ${id} not found`, 'NOT_FOUND');
  return mapCampaign(data);
}

// ─── Admin: delete ────────────────────────────────────────────────────────────
export async function deleteCampaign(id: string): Promise<void> {
  const sb = createServiceRoleClient();
  const { error } = await sb.from(TABLE).delete().eq('id', id);
  if (error) throw new CampaignError(error.message, 'INTERNAL');
}

// ─── Admin: toggle publish ───────────────────────────────────────────────────
export async function toggleCampaignPublish(
  id: string,
  published: boolean
): Promise<HomepageCampaign> {
  return updateCampaign(id, { status: published ? 'published' : 'draft' });
}

// ─── Admin: duplicate ─────────────────────────────────────────────────────────
export async function duplicateCampaign(id: string): Promise<HomepageCampaign> {
  const original = await getCampaignById(id);
  return createCampaign({
    title: `${original.title} (Copy)`,
    headline_line1: original.headlineLine1,
    headline_highlight: original.headlineHighlight,
    headline_line2: original.headlineLine2,
    description: original.description,
    cta_primary_text: original.ctaPrimaryText,
    cta_primary_link: original.ctaPrimaryLink,
    cta_secondary_text: original.ctaSecondaryText,
    cta_secondary_link: original.ctaSecondaryLink,
    desktop_image: original.desktopImage,
    tablet_image: original.tabletImage,
    mobile_image: original.mobileImage,
    video_url: original.videoUrl,
    image_alt: original.imageAlt,
    overlay_color: original.overlayColor,
    overlay_opacity: original.overlayOpacity,
    text_alignment: original.textAlignment,
    image_position: original.imagePosition,
    button_style: original.buttonStyle,
    priority: original.priority,
    status: 'draft',
  });
}

// ─── Admin: bulk reorder ──────────────────────────────────────────────────────
export async function reorderCampaigns(
  items: { id: string; sort_order: number }[]
): Promise<void> {
  const sb = createServiceRoleClient();
  const updates = items.map(({ id, sort_order }) =>
    sb.from(TABLE).update({ sort_order, updated_at: new Date().toISOString() }).eq('id', id)
  );
  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) throw new CampaignError(failed.error.message, 'INTERNAL');
}
