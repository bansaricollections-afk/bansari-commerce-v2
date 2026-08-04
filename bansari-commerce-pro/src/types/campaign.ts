/**
 * Homepage Campaign Management System — Domain Types
 *
 * Mirrors the ProductManagement type architecture:
 * - DbHomepageCampaign: raw Supabase row shape
 * - HomepageCampaign:   clean domain model used throughout the app
 * - CreateCampaignPayload / UpdateCampaignPayload: mutation inputs
 */

export type CampaignStatus = 'draft' | 'published' | 'scheduled' | 'archived';
export type CampaignTextAlignment = 'left' | 'center' | 'right';
export type CampaignImagePosition = 'left' | 'center' | 'right' | 'top' | 'bottom';
export type CampaignButtonStyle = 'mauve' | 'ivory' | 'dark' | 'outline';

// ── Raw DB row (snake_case, matches Supabase schema) ─────────────────────────
export interface DbHomepageCampaign {
  id: string;
  title: string;
  headline_line1: string;
  headline_highlight: string;
  headline_line2: string;
  description: string;
  cta_primary_text: string;
  cta_primary_link: string;
  cta_secondary_text: string;
  cta_secondary_link: string;
  desktop_image: string;
  tablet_image: string;
  mobile_image: string;
  video_url: string | null;
  image_alt: string;
  overlay_color: string;
  overlay_opacity: number;
  text_alignment: CampaignTextAlignment;
  image_position: CampaignImagePosition;
  button_style: CampaignButtonStyle;
  sort_order: number;
  status: CampaignStatus;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

// ── Clean domain model (camelCase) ──────────────────────────────