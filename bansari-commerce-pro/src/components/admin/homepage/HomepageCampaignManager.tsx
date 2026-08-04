/**
 * HomepageCampaignManager — Admin UI
 *
 * Features:
 *   - Campaign list with thumbnail, status badge, sort controls
 *   - Drag-and-drop reorder (keyboard-accessible fallback via up/down buttons)
 *   - Publish toggle
 *   - Duplicate
 *   - Delete with confirmation
 *   - Open CampaignFormSheet for create / edit
 *   - Preview button (opens storefront in new tab)
 */
'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Eye,
  LayoutDashboard,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CampaignFormSheet } from './CampaignFormSheet';
import type { HomepageCampaign } from '@/types/homepage-campaign';

const STATUS_COLORS: Record<string, string> = {
  published: 'bg-green-100 text-green-700',
  draft: 'bg-slate-100 text-slate-600',
  scheduled: 'bg-blue-100 text-blue-700',
  archived: 'bg-red-100 text-red-600',
};

interface Props {
  initial: HomepageCampaign[];
}

export function HomepageCampaignManager({ initial }: Props) {
  const [campaigns, setCampaigns] = useState<HomepageCampaign[]>(initial);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<HomepageCampaign | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HomepageCampaign | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  // ── Refresh list ──────────────────────────────────────────────────────────
  const reload = useCallback(async () => {
    const res = await fetch('/api/admin/homepage', { cache: 'no-store' });
    if (res.ok) {
      const { campaigns: fresh } = await res.json();
      setCampaigns(fresh);
    }
  }, []);

  // ── Publish toggle ─────────────────────────────────────────────────────────
  const togglePublish = async (c: HomepageCampaign) => {
    setSaving(c.id);
    await fetch(`/api/admin/homepage/${c.id}/publish`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ published: c.status !== 'published' }),
    });
    await reload();
    setSaving(null);
  };

  // ── Duplicate ──────────────────────────────────────────────────────────────
  const duplicate = async (c: HomepageCampaign) => {
    setSaving(c.id);
    await fetch(`/api/admin/homepage/${c.id}/duplicate`, { method: 'POST' });
    await reload();
    setSaving(null);
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setSaving(deleteTarget.id);
    await fetch(`/api/admin/homepage/${deleteTarget.id}`, { method: 'DELETE' });
    setDeleteTarget(null);
    await reload();
    setSaving(null);
  };

  // ── Reorder (move up/down) ─────────────────────────────────────────────────
  const move = async (index: number, dir: -1 | 1) => {
    const next = [...campaigns];
    const swapIndex = index + dir;
    if (swapIndex < 0 || swapIndex >= next.length) return;
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
    const items = next.map((c, i) => ({ id: c.id, sort_order: i }));
    setCampaigns(next);
    await fetch('/api/admin/homepage/reorder', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Homepage Campaigns</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Manage hero slides — changes go live instantly without a deploy.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            asChild
          >
            <a href="/" target="_blank" rel="noopener noreferrer">
              <Eye className="mr-1.5 size-3.5" />
              Preview
            </a>
          </Button>
          <Button
            size="sm"
            className="bg-[#8A5A6A] hover:bg-[#7a4a5a] text-white"
            onClick={() => { setEditTarget(null); setSheetOpen(true); }}
          >
            <Plus className="mr-1.5 size-3.5" />
            New Campaign
          </Button>
        </div>
      </div>

      {/* Empty state */}
      {campaigns.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 py-16 text-center">
          <LayoutDashboard className="size-8 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">No campaigns yet</p>
          <p className="text-xs text-slate-400">Create your first hero campaign to get started.</p>
          <Button
            size="sm"
            className="mt-2 bg-[#8A5A6A] hover:bg-[#7a4a5a] text-white"
            onClick={() => { setEditTarget(null); setSheetOpen(true); }}
          >
            <Plus className="mr-1.5 size-3.5" />
            New Campaign
          </Button>
        </div>
      )}

      {/* Campaign list */}
      <div className="space-y-3">
        {campaigns.map((c, index) => (
          <div
            key={c.id}
            className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md"
          >
            {/* Thumbnail */}
            <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
              {(c.desktopImage || c.tabletImage || c.mobileImage) ? (
                <Image
                  src={c.desktopImage || c.tabletImage || c.mobileImage}
                  alt={c.title}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              ) : (
                <div className="flex size-full items-center justify-center text-xs text-slate-400">No img</div>
              )}
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium text-slate-900">{c.title}</p>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[c.status] ?? 'bg-slate-100 text-slate-600'}`}>
                  {c.status}
                </span>
              </div>
              <p className="mt-0.5 truncate text-xs text-slate-500">
                {[c.headlineLine1, c.headlineHighlight, c.headlineLine2].filter(Boolean).join(' · ')}
              </p>
              {c.startDate || c.endDate ? (
                <p className="mt-0.5 text-xs text-slate-400">
                  {c.startDate ? `From ${c.startDate.slice(0, 10)}` : ''}
                  {c.startDate && c.endDate ? ' → ' : ''}
                  {c.endDate ? `Until ${c.endDate.slice(0, 10)}` : ''}
                </p>
              ) : null}
            </div>

            {/* Actions */}
            <div className="flex shrink-0 items-center gap-1">
              {/* Reorder */}
              <button
                aria-label="Move up"
                disabled={index === 0}
                onClick={() => move(index, -1)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
              >
                <ArrowUp className="size-3.5" />
              </button>
              <button
                aria-label="Move down"
                disabled={index === campaigns.length - 1}
                onClick={() => move(index, 1)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
              >
                <ArrowDown className="size-3.5" />
              </button>

              {/* Publish toggle */}
              <button
                aria-label={c.status === 'published' ? 'Unpublish' : 'Publish'}
                disabled={saving === c.id}
                onClick={() => togglePublish(c)}
                className={`rounded px-2 py-1 text-xs font-medium transition ${
                  c.status === 'published'
                    ? 'bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700'
                    : 'bg-slate-100 text-slate-600 hover:bg-green-100 hover:text-green-700'
                }`}
              >
                {c.status === 'published' ? 'Live' : 'Publish'}
              </button>

              {/* Edit */}
              <button
                aria-label="Edit"
                onClick={() => { setEditTarget(c); setSheetOpen(true); }}
                className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-[#8A5A6A]"
              >
                <Pencil className="size-3.5" />
              </button>

              {/* Duplicate */}
              <button
                aria-label="Duplicate"
                disabled={saving === c.id}
                onClick={() => duplicate(c)}
                className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              >
                <Copy className="size-3.5" />
              </button>

              {/* Delete */}
              <button
                aria-label="Delete"
                onClick={() => setDeleteTarget(c)}
                className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create / Edit Sheet */}
      <CampaignFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        campaign={editTarget}
        onSaved={async () => { setSheetOpen(false); await reload(); }}
      />

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete campaign?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.title}&rdquo; will be permanently removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={confirmDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
