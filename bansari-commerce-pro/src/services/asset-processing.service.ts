// Sprint 13 — AssetProcessingService
// Job queue management for DAM processing pipeline
// DELTA ONLY

import { createClient } from '@supabase/supabase-js';
import type { DAMProcessingJob, DAMJobType, DAMProcessingStatus, ProcessingQueueItem } from '@/types/dam';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export class AssetProcessingService {
  // ── Enqueue ────────────────────────────────────────────────

  static async enqueueJob(
    tenantId: string,
    assetId: string,
    jobType: DAMJobType,
    options: Record<string, unknown> = {},
    priority = 5,
  ): Promise<DAMProcessingJob> {
    const { data, error } = await supabase
      .from('dam_processing_jobs')
      .insert({
        tenant_id: tenantId,
        asset_id: assetId,
        job_type: jobType,
        status: 'queued' as DAMProcessingStatus,
        priority,
        options,
        max_attempts: 3,
        scheduled_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new Error(`AssetProcessingService.enqueueJob: ${error.message}`);
    return data as DAMProcessingJob;
  }

  static async enqueueDefaultJobs(
    tenantId: string,
    assetId: string,
    mimeType: string,
  ): Promise<DAMProcessingJob[]> {
    const jobs: Array<{ jobType: DAMJobType; priority: number; options: Record<string, unknown> }> = [
      { jobType: 'thumbnail', priority: 1, options: { widths: [150, 300, 600] } },
      { jobType: 'webp_convert', priority: 2, options: { quality: 85 } },
      { jobType: 'avif_convert', priority: 3, options: { quality: 80 } },
      { jobType: 'compress', priority: 3, options: {} },
      { jobType: 'auto_tag', priority: 5, options: {} },
      { jobType: 'color_analysis', priority: 5, options: {} },
      { jobType: 'quality_score', priority: 5, options: {} },
      { jobType: 'duplicate_detect', priority: 7, options: {} },
      { jobType: 'nsfw_detect', priority: 4, options: {} },
    ];

    if (mimeType.startsWith('image/')) {
      jobs.push(
        { jobType: 'object_detect', priority: 6, options: {} },
        { jobType: 'caption', priority: 8, options: {} },
        { jobType: 'visual_embedding', priority: 8, options: {} },
      );
    }

    const results: DAMProcessingJob[] = [];
    for (const j of jobs) {
      const job = await this.enqueueJob(tenantId, assetId, j.jobType, j.options, j.priority);
      results.push(job);
    }
    return results;
  }

  // ── Queue Operations ─────────────────────────────────────────

  static async claimNextJob(tenantId: string): Promise<ProcessingQueueItem | null> {
    const { data: jobData, error } = await supabase
      .from('dam_processing_jobs')
      .select('*, dam_assets!inner(id, name, asset_type, storage_path, mime_type)')
      .eq('tenant_id', tenantId)
      .eq('status', 'queued')
      .lt('attempts', 3)
      .lte('scheduled_at', new Date().toISOString())
      .order('priority', { ascending: true })
      .order('scheduled_at', { ascending: true })
      .limit(1)
      .single();

    if (error || !jobData) return null;

    // Mark as running
    await supabase
      .from('dam_processing_jobs')
      .update({ status: 'running', started_at: new Date().toISOString(), attempts: (jobData as unknown as { attempts: number }).attempts + 1 })
      .eq('id', (jobData as unknown as { id: string }).id);

    const row = jobData as unknown as { dam_assets: ProcessingQueueItem['asset'] } & DAMProcessingJob;
    return { job: row, asset: row.dam_assets };
  }

  static async completeJob(
    jobId: string,
    result: Record<string, unknown>,
  ): Promise<void> {
    await supabase
      .from('dam_processing_jobs')
      .update({
        status: 'completed' as DAMProcessingStatus,
        result,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);
  }

  static async failJob(jobId: string, error: string, retryAfterSeconds = 60): Promise<void> {
    const { data } = await supabase
      .from('dam_processing_jobs')
      .select('attempts, max_attempts')
      .eq('id', jobId)
      .single();

    const row = data as { attempts: number; max_attempts: number } | null;
    const finalStatus = row && row.attempts >= row.max_attempts
      ? 'failed'
      : 'queued';

    const scheduledAt = new Date();
    scheduledAt.setSeconds(scheduledAt.getSeconds() + retryAfterSeconds);

    await supabase
      .from('dam_processing_jobs')
      .update({
        status: finalStatus as DAMProcessingStatus,
        error,
        scheduled_at: finalStatus === 'queued' ? scheduledAt.toISOString() : undefined,
        completed_at: finalStatus === 'failed' ? new Date().toISOString() : undefined,
      })
      .eq('id', jobId);
  }

  static async getJobsForAsset(assetId: string): Promise<DAMProcessingJob[]> {
    const { data, error } = await supabase
      .from('dam_processing_jobs')
      .select('*')
      .eq('asset_id', assetId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`AssetProcessingService.getJobsForAsset: ${error.message}`);
    return (data ?? []) as DAMProcessingJob[];
  }

  static async getQueueStats(tenantId: string): Promise<Record<DAMProcessingStatus, number>> {
    const { data } = await supabase
      .from('dam_processing_jobs')
      .select('status')
      .eq('tenant_id', tenantId);

    const stats: Record<string, number> = { queued: 0, running: 0, completed: 0, failed: 0, cancelled: 0 };
    for (const row of (data ?? []) as { status: string }[]) {
      stats[row.status] = (stats[row.status] ?? 0) + 1;
    }
    return stats as Record<DAMProcessingStatus, number>;
  }

  static async cancelJob(jobId: string): Promise<void> {
    await supabase
      .from('dam_processing_jobs')
      .update({ status: 'cancelled' as DAMProcessingStatus, completed_at: new Date().toISOString() })
      .eq('id', jobId);
  }

  static async saveAIAnalysis(
    tenantId: string,
    assetId: string,
    jobType: DAMJobType,
    status: DAMProcessingStatus,
    result?: Record<string, unknown>,
    errorMsg?: string,
    processingMs?: number,
  ): Promise<void> {
    await supabase.from('dam_ai_analysis').upsert(
      {
        tenant_id: tenantId,
        asset_id: assetId,
        job_type: jobType,
        status,
        result: result ?? null,
        error: errorMsg ?? null,
        processing_ms: processingMs ?? null,
        completed_at: status === 'completed' || status === 'failed' ? new Date().toISOString() : null,
      },
      { onConflict: 'asset_id,job_type' },
    );
  }
}
