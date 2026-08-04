/**
 * Homepage Campaign CMS — Types & Mapper
 *
 * All DB columns are snake_case (mirrors Supabase).
 * Application layer uses camelCase HomepageCampaign.
 */

export type CampaignStatus = 'draft' | 'published' | 'scheduled' | 'archived';
export type TextAlignment = 'left' | 'center' | 'right';
export type ImagePosition = 'center' | 'top' | 'bottom' | 'left' | 'right';
export type ButtonStyle = 'filled' | 'outline' | 'ghost';

// ─── Raw DB row ───────────────────────────────────────────────────────────────
export interface DbHomepageCampaign {
  id: string;
  title: string;
  headline_line1: string | null;
  headline_highlight: string | null;
  headline_line2: string | null;
  description: string | null;
  cta_primary_text: string | null;
  cta_primary_link: string | null;
  cta_secondary_text: string | null;
  cta_secondary_link: string | null;
  desktop_image: string | null;
  tablet_image: string | null;
  mobile_image: string | null;
  video_url: string | null;
  image_alt: string | null;
  overlay_color: string;
  overlay_opacity: number;
  text_alignment: TextAlignment;
  image_position: ImagePosition;
  button_style: ButtonStyle;
  sort_order: number;
  priority: number;
  status: CampaignStatus;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Application model ────────────────────────────────────────────────────────
export interface HomepageCampaign {
  id: string;
  title: string;
  headlineLine1: string;
  headlineHighlight: string;
  headlineLine2: string;
  description: string;
  ctaPrimaryText: string;
  ctaPrimaryLink: string;
  ctaSecondaryText: string;
  ctaSecondaryLink: string;
  desktopImage: string;
  tabletImage: string;
  mobileImage: string;
  videoUrl: string;
  imageAlt: string;
  overlayColor: string;
  overlayOpacity: number;
  textAlignment: TextAlignment;
  imagePosition: ImagePosition;
  buttonStyle: ButtonStyle;
  sortOrder: number;
  priority: number;
  status: CampaignStatus;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Create/Update payload ────────────────────────────────────────────────────
export interface CampaignWritePayload {
  title: string;
  headline_line1?: string;
  headline_highlight?: string;
  headline_line2?: string;
  description?: string;
  cta_primary_text?: string;
  cta_primary_link?: string;
  cta_secondary_text?: string;
  cta_secondary_link?: string;
  desktop_image?: string;
  tablet_image?: string;
  mobile_image?: string;
  video_url?: string;
  image_alt?: string;
  overlay_color?: string;
  overlay_opacity?: number;
  text_alignment?: TextAlignment;
  image_position?: ImagePosition;
  button_style?: ButtonStyle;
  sort_order?: number;
  priority?: number;
  status?: CampaignStatus;
  start_date?: string | null;
  end_date?: string | null;
}

// ─── Mapper ───────────────────────────────────────────────────────────────────
export function mapCampaign(row: DbHomepageCampaign): HomepageCampaign {
  return {
    id: row.id,
    title: row.title,
    headlineLine1: row.headline_line1 ?? '',
    headlineHighlight: row.headline_highlight ?? '',
    headlineLine2: row.headline_line2 ?? '',
    description: row.description ?? '',
    ctaPrimaryText: row.cta_primary_text ?? '',
    ctaPrimaryLink: row.cta_primary_link ?? '',
    ctaSecondaryText: row.cta_secondary_text ?? '',
    ctaSecondaryLink: row.cta_secondary_link ?? '',
    desktopImage: row.desktop_image ?? '',
    tabletImage: row.tablet_image ?? '',
    mobileImage: row.mobile_image ?? '',
    videoUrl: row.video_url ?? '',
    imageAlt: row.image_alt ?? '',
    overlayColor: row.overlay_color,
    overlayOpacity: row.overlay_opacity,
    textAlignment: row.text_alignment,
    imagePosition: row.image_position,
    buttonStyle: row.button_style,
    sortOrder: row.sort_order,
    priority: row.priority,
    status: row.status,
    startDate: row.start_date,
    endDate: row.end_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
