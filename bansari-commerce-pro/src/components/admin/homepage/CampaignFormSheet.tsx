/**
 * CampaignFormSheet — Create / Edit campaign
 *
 * Full-featured form sheet matching the admin panel's visual language.
 * Image uploads go to /api/admin/homepage/upload → Supabase Storage.
 */
'use client';

import { useEffect, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ImageUploadField, type ImageVariant } from './ImageUploadField';
import type { HomepageCampaign, CampaignStatus } from '@/types/homepage-campaign';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  campaign: HomepageCampaign | null;
  onSaved: () => void;
}

/**
 * Validates a CTA URL.
 * Accepts: relative paths starting with /
 *          absolute https:// URLs
 * Rejects:  javascript:, data:, ftp:, mailto:, empty, malformed
 * Returns an error string, or null if valid (or blank — blank is allowed).
 */
function validateCtaUrl(url: string): string | null {
  if (!url.trim()) return null; // blank = no CTA, which is fine
  if (url.startsWith('/')) return null; // relative path
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:') return null;
    return `Only relative paths (/) or https:// URLs are allowed.`;
  } catch {
    return 'Invalid URL. Use a relative path (e.g. /shop) or https://…';
  }
}

export function CampaignFormSheet({ open, onOpenChange, campaign, onSaved }: Props) {
  const isEdit = !!campaign;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState<ImageVariant | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [headlineLine1, setHeadlineLine1] = useState('');
  const [headlineHighlight, setHeadlineHighlight] = useState('');
  const [headlineLine2, setHeadlineLine2] = useState('');
  const [description, setDescription] = useState('');
  const [ctaPrimaryText, setCtaPrimaryText] = useState('');
  const [ctaPrimaryLink, setCtaPrimaryLink] = useState('');
  const [ctaSecondaryText, setCtaSecondaryText] = useState('');
  const [ctaSecondaryLink, setCtaSecondaryLink] = useState('');
  const [desktopImage, setDesktopImage] = useState('');
  const [tabletImage, setTabletImage] = useState('');
  const [mobileImage, setMobileImage] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [overlayColor, setOverlayColor] = useState('#000000');
  const [overlayOpacity, setOverlayOpacity] = useState(0);
  const [textAlignment, setTextAlignment] = useState<'left' | 'center' | 'right'>('left');
  const [imagePosition, setImagePosition] = useState<'center' | 'top' | 'bottom' | 'left' | 'right'>('center');
  const [buttonStyle, setButtonStyle] = useState<'filled' | 'outline' | 'ghost'>('filled');
  const [priority, setPriority] = useState(0);
  const [status, setStatus] = useState<CampaignStatus>('draft');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Field-level CTA validation errors
  const [ctaPrimaryLinkError, setCtaPrimaryLinkError] = useState<string | null>(null);
  const [ctaSecondaryLinkError, setCtaSecondaryLinkError] = useState<string | null>(null);

  // Populate on edit
  useEffect(() => {
    if (campaign) {
      setTitle(campaign.title);
      setHeadlineLine1(campaign.headlineLine1);
      setHeadlineHighlight(campaign.headlineHighlight);
      setHeadlineLine2(campaign.headlineLine2);
      setDescription(campaign.description);
      setCtaPrimaryText(campaign.ctaPrimaryText);
      setCtaPrimaryLink(campaign.ctaPrimaryLink);
      setCtaSecondaryText(campaign.ctaSecondaryText);
      setCtaSecondaryLink(campaign.ctaSecondaryLink);
      setDesktopImage(campaign.desktopImage);
      setTabletImage(campaign.tabletImage);
      setMobileImage(campaign.mobileImage);
      setVideoUrl(campaign.videoUrl);
      setImageAlt(campaign.imageAlt);
      setOverlayColor(campaign.overlayColor);
      setOverlayOpacity(campaign.overlayOpacity);
      setTextAlignment(campaign.textAlignment);
      setImagePosition(campaign.imagePosition);
      setButtonStyle(campaign.buttonStyle);
      setPriority(campaign.priority);
      setStatus(campaign.status);
      setStartDate(campaign.startDate?.slice(0, 16) ?? '');
      setEndDate(campaign.endDate?.slice(0, 16) ?? '');
    } else {
      setTitle(''); setHeadlineLine1(''); setHeadlineHighlight(''); setHeadlineLine2('');
      setDescription(''); setCtaPrimaryText(''); setCtaPrimaryLink('');
      setCtaSecondaryText(''); setCtaSecondaryLink('');
      setDesktopImage(''); setTabletImage(''); setMobileImage('');
      setVideoUrl(''); setImageAlt(''); setOverlayColor('#000000');
      setOverlayOpacity(0); setTextAlignment('left'); setImagePosition('center');
      setButtonStyle('filled'); setPriority(0); setStatus('draft');
      setStartDate(''); setEndDate('');
    }
    setError('');
    setCtaPrimaryLinkError(null);
    setCtaSecondaryLinkError(null);
  }, [campaign, open]);

  // Image upload handler (stable, passed down as prop)
  const handleUpload = async (file: File, variant: ImageVariant) => {
    setUploading(variant);
    const form = new FormData();
    form.append('file', file);
    form.append('variant', variant);
    const res = await fetch('/api/admin/homepage/upload', { method: 'POST', body: form });
    const json = await res.json();
    setUploading(null);
    if (!res.ok) { setError(json.error ?? 'Upload failed'); return; }
    if (variant === 'desktop') setDesktopImage(json.url);
    if (variant === 'tablet') setTabletImage(json.url);
    if (variant === 'mobile') setMobileImage(json.url);
  };

  const handleClear = (variant: ImageVariant) => {
    if (variant === 'desktop') setDesktopImage('');
    if (variant === 'tablet') setTabletImage('');
    if (variant === 'mobile') setMobileImage('');
  };

  const handleUrlChange = (url: string, variant: ImageVariant) => {
    if (variant === 'desktop') setDesktopImage(url);
    if (variant === 'tablet') setTabletImage(url);
    if (variant === 'mobile') setMobileImage(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError('Campaign title is required'); return; }

    // Client-side CTA URL validation
    const primaryErr = validateCtaUrl(ctaPrimaryLink);
    const secondaryErr = validateCtaUrl(ctaSecondaryLink);
    setCtaPrimaryLinkError(primaryErr);
    setCtaSecondaryLinkError(secondaryErr);
    if (primaryErr || secondaryErr) return;

    setSaving(true);
    setError('');
    const payload = {
      title, headline_line1: headlineLine1, headline_highlight: headlineHighlight,
      headline_line2: headlineLine2, description,
      cta_primary_text: ctaPrimaryText, cta_primary_link: ctaPrimaryLink,
      cta_secondary_text: ctaSecondaryText, cta_secondary_link: ctaSecondaryLink,
      desktop_image: desktopImage, tablet_image: tabletImage, mobile_image: mobileImage,
      video_url: videoUrl, image_alt: imageAlt,
      overlay_color: overlayColor, overlay_opacity: overlayOpacity,
      text_alignment: textAlignment, image_position: imagePosition,
      button_style: buttonStyle, priority, status,
      start_date: startDate ? new Date(startDate).toISOString() : null,
      end_date: endDate ? new Date(endDate).toISOString() : null,
    };
    const url = isEdit ? `/api/admin/homepage/${campaign.id}` : '/api/admin/homepage';
    const method = isEdit ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json();
      setError(j.error ?? 'Save failed');
      return;
    }
    onSaved();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Edit Campaign' : 'New Campaign'}</SheetTitle>
          <SheetDescription>
            {isEdit ? 'Update the campaign and save to go live.' : 'Fill in the campaign details and set status to Published to make it live.'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          {/* ── Identity ── */}
          <fieldset className="space-y-4">
            <legend className="text-xs font-semibold uppercase tracking-widest text-slate-400">Campaign Identity</legend>
            <div className="space-y-1.5">
              <Label htmlFor="cf-title">Campaign Name *</Label>
              <Input id="cf-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Diwali 2026" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cf-status">Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as CampaignStatus)}>
                  <SelectTrigger id="cf-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cf-priority">Priority (higher = first)</Label>
                <Input id="cf-priority" type="number" value={priority} onChange={(e) => setPriority(Number(e.target.value))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cf-start">Start Date</Label>
                <Input id="cf-start" type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cf-end">End Date</Label>
                <Input id="cf-end" type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
          </fieldset>

          {/* ── Copy ── */}
          <fieldset className="space-y-4">
            <legend className="text-xs font-semibold uppercase tracking-widest text-slate-400">Headline & Copy</legend>
            <div className="space-y-1.5">
              <Label htmlFor="cf-h1">Eyebrow / Line 1 (shown above headline)</Label>
              <Input id="cf-h1" value={headlineLine1} onChange={(e) => setHeadlineLine1(e.target.value)} placeholder="New Arrivals" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cf-hh">Headline (italic accent)</Label>
              <Input id="cf-hh" value={headlineHighlight} onChange={(e) => setHeadlineHighlight(e.target.value)} placeholder="Becomes" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cf-h2">Headline Line 2</Label>
              <Input id="cf-h2" value={headlineLine2} onChange={(e) => setHeadlineLine2(e.target.value)} placeholder="Your Story" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cf-desc">Short Description</Label>
              <Textarea id="cf-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Couture ethnic wear for…" />
            </div>
          </fieldset>

          {/* ── CTAs ── */}
          <fieldset className="space-y-4">
            <legend className="text-xs font-semibold uppercase tracking-widest text-slate-400">Calls to Action</legend>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cf-cta1t">Primary CTA Text</Label>
                <Input id="cf-cta1t" value={ctaPrimaryText} onChange={(e) => setCtaPrimaryText(e.target.value)} placeholder="Shop The Edit" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cf-cta1l">Primary CTA Link</Label>
                <Input
                  id="cf-cta1l"
                  value={ctaPrimaryLink}
                  onChange={(e) => {
                    setCtaPrimaryLink(e.target.value);
                    setCtaPrimaryLinkError(validateCtaUrl(e.target.value));
                  }}
                  placeholder="/shop or https://…"
                  aria-invalid={!!ctaPrimaryLinkError}
                />
                {ctaPrimaryLinkError && (
                  <p className="text-xs text-red-600">{ctaPrimaryLinkError}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cf-cta2t">Secondary CTA Text</Label>
                <Input id="cf-cta2t" value={ctaSecondaryText} onChange={(e) => setCtaSecondaryText(e.target.value)} placeholder="View Collections" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cf-cta2l">Secondary CTA Link</Label>
                <Input
                  id="cf-cta2l"
                  value={ctaSecondaryLink}
                  onChange={(e) => {
                    setCtaSecondaryLink(e.target.value);
                    setCtaSecondaryLinkError(validateCtaUrl(e.target.value));
                  }}
                  placeholder="/collections or https://…"
                  aria-invalid={!!ctaSecondaryLinkError}
                />
                {ctaSecondaryLinkError && (
                  <p className="text-xs text-red-600">{ctaSecondaryLinkError}</p>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cf-btn">Button Style</Label>
              <Select value={buttonStyle} onValueChange={(v) => setButtonStyle(v as 'filled' | 'outline' | 'ghost')}>
                <SelectTrigger id="cf-btn"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="filled">Filled</SelectItem>
                  <SelectItem value="outline">Outline</SelectItem>
                  <SelectItem value="ghost">Ghost</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </fieldset>

          {/* ── Images ── */}
          <fieldset className="space-y-4">
            <legend className="text-xs font-semibold uppercase tracking-widest text-slate-400">Hero Images</legend>
            <ImageUploadField variant="desktop" value={desktopImage} uploading={uploading} onUpload={handleUpload} onClear={handleClear} onUrlChange={handleUrlChange} />
            <ImageUploadField variant="tablet" value={tabletImage} uploading={uploading} onUpload={handleUpload} onClear={handleClear} onUrlChange={handleUrlChange} />
            <ImageUploadField variant="mobile" value={mobileImage} uploading={uploading} onUpload={handleUpload} onClear={handleClear} onUrlChange={handleUrlChange} />
            <div className="space-y-1.5">
              <Label htmlFor="cf-alt">Image Alt Text</Label>
              <Input id="cf-alt" value={imageAlt} onChange={(e) => setImageAlt(e.target.value)} placeholder="Bansari Collections — heritage editorial" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cf-video">Video Background URL (optional)</Label>
              <Input id="cf-video" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://…/campaign.mp4" />
            </div>
          </fieldset>

          {/* ── Display Options ── */}
          <fieldset className="space-y-4">
            <legend className="text-xs font-semibold uppercase tracking-widest text-slate-400">Display Options</legend>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cf-align">Text Alignment</Label>
                <Select value={textAlignment} onValueChange={(v) => setTextAlignment(v as 'left' | 'center' | 'right')}>
                  <SelectTrigger id="cf-align"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="center">Center</SelectItem>
                    <SelectItem value="right">Right</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cf-imgpos">Image Focus</Label>
                <Select value={imagePosition} onValueChange={(v) => setImagePosition(v as 'center' | 'top' | 'bottom' | 'left' | 'right')}>
                  <SelectTrigger id="cf-imgpos"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="center">Center</SelectItem>
                    <SelectItem value="top">Top</SelectItem>
                    <SelectItem value="bottom">Bottom</SelectItem>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="right">Right</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cf-ocolor">Overlay Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    id="cf-ocolor"
                    type="color"
                    value={overlayColor}
                    onChange={(e) => setOverlayColor(e.target.value)}
                    className="size-8 cursor-pointer rounded border border-slate-200"
                  />
                  <Input value={overlayColor} onChange={(e) => setOverlayColor(e.target.value)} className="text-xs" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cf-oop">Overlay Opacity ({(overlayOpacity * 100).toFixed(0)}%)</Label>
                <input
                  id="cf-oop"
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={overlayOpacity}
                  onChange={(e) => setOverlayOpacity(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          </fieldset>

          {/* ── Submit ── */}
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-[#8A5A6A] hover:bg-[#7a4a5a] text-white"
            >
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Campaign'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
