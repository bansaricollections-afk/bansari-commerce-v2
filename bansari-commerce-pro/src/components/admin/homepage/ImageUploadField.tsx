/**
 * ImageUploadField — extracted from CampaignFormSheet.
 *
 * Stable component (not defined inside parent render) so useRef
 * is preserved across parent re-renders and uploads work reliably.
 */
'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type ImageVariant = 'desktop' | 'tablet' | 'mobile';

const VARIANT_LABELS: Record<ImageVariant, string> = {
  desktop: 'Desktop (min 3840px)',
  tablet: 'Tablet (min 2048px)',
  mobile: 'Mobile (min 1440px)',
};

interface Props {
  variant: ImageVariant;
  value: string;
  uploading: ImageVariant | null;
  onUpload: (file: File, variant: ImageVariant) => void;
  onClear: (variant: ImageVariant) => void;
  onUrlChange: (url: string, variant: ImageVariant) => void;
}

export function ImageUploadField({
  variant,
  value,
  uploading,
  onUpload,
  onClear,
  onUrlChange,
}: Props) {
  const ref = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-slate-600">{VARIANT_LABELS[variant]}</Label>
      <div className="flex items-center gap-2">
        <div className="relative size-16 shrink-0 overflow-hidden rounded-md bg-slate-100">
          {value ? (
            <Image src={value} alt={variant} fill sizes="64px" className="object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center text-xs text-slate-400">None</div>
          )}
        </div>
        <input
          ref={ref}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp,image/avif"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUpload(f, variant);
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading === variant}
          onClick={() => ref.current?.click()}
        >
          <Upload className="mr-1.5 size-3" />
          {uploading === variant ? 'Uploading…' : 'Upload'}
        </Button>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onClear(variant)}
          >
            <X className="size-3" />
          </Button>
        )}
      </div>
      <Input
        placeholder="Or paste image URL…"
        value={value}
        onChange={(e) => onUrlChange(e.target.value, variant)}
        className="text-xs"
      />
    </div>
  );
}
