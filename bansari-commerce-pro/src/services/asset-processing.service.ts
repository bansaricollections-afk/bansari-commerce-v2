// Sprint 13 — AssetProcessingService
// Job orchestration: thumbnails, WebP/AVIF, compression, background jobs
import { createClient } from '@/lib/supabase/server';
import type { DAMProcessingJob } from '@/types/dam';

type JobType = DAMProcessingJob['job_type'];

export class AssetProcessingService {
  private static async db() {
    return createClient();
  }

  static async enqueueJob(
    tenantId: string,
    assetId: string,
    jobType: JobType,
    priority = 5
  ): Promise<DAMProcessingJob> {
    const supabase = await this.db();
    const { data, error } = await supabase
      .from('dam_processing_jobs')
      .insert({ tenant_id: tenantId, asset_id: assetId, job_type: jobType, priority, status: 'queued' })
      .select()
      .single();
    if (error) throw new Error(`AssetProcessingService.enqueueJob: ${error.message}`);
    return data as DAMProcessingJob;
  }

  static async enqueueDefaultPipeline(tenantId: string, assetId: string, mimeType: string): Promise<void> {
    const baseJobs: JobType[] = ['virus_scan', 'thumbnail', 'ai_analysis', 'duplicate_detection'];
    const imageJobs: JobType[] = ['webp_convert', 'avif_convert', 'compression', 'background_removal', 'watermark_detection', 'nsfw_detection', 'similarity_embedding'];
    const isImage = mimeType.startsWith('image/');
    const jobs = isImage ? [...baseJobs, ...imageJobs] : baseJobs;
    for (const job of jobs) {
      await this.enqueueJob(tenantId, assetId, job);
    }
  }

  static async getNextJob(tenantId: string): Promise<DAMProcessingJob | null> {
    const supabase = await this.db();
    const { data } = await supabase
      .from('dam_processing_jobs')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'queued')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(1)
      .single();
    return (data as DAMProcessingJob) ?? null;
  }

  static async markJobStarted(jobId: string): Promise<void> {
    const supabase = await this.db();
    await supabase
      .from('dam_processing_jobs')
      .update({ status: 'processing', started_at: new Date().toISOString(), attempts: supabase.rpc('coalesce_increment', { id: jobId }) })
      .eq('id', jobId);
  }

  static async markJobCompleted(jobId: string, result: Record<string, unknown>): Promise<void> {
    const supabase = await this.db();
    await supabase
      .from('dam_processing_jobs')
      .update({ status: 'completed', completed_at: new Date().toISOString(), result })
      .eq('id', jobId);
  }

  static async markJobFailed(jobId: string, errorMessage: string): Promise<void> {
    const supabase = await this.db();
    const { data: job } = await supabase
      .from('dam_processing_jobs')
      .select('attempts, max_attempts')
      .eq('id', jobId)
      .single();
    const j = job as { attempts: number; max_attempts: number } | null;
    const newAttempts = (j?.attempts ?? 0) + 1;
    const newStatus = newAttempts >= (j?.max_attempts ?? 3) ? 'failed' : 'queued';
    await supabase
      .from('dam_processing_jobs')
      .update({ status: newStatus, attempts: newAttempts, error_message: errorMessage })
      .eq('id', jobId);
  }

  static async listJobs(
    tenantId: string,
    status?: DAMProcessingJob['status']
  ): Promise<DAMProcessingJob[]> {
    const supabase = await this.db();
    let q = supabase.from('dam_processing_jobs').select('*').eq('tenant_id', tenantId);
    if (status) q = q.eq('status', status);
    const { data } = await q.order('created_at', { ascending: false }).limit(100);
    return (data ?? []) as DAMProcessingJob[];
  }

  static async saveDerivative(
    tenantId: string,
    assetId: string,
    derivativeType: string,
    storagePath: string,
    fileSize: number,
    format: string,
    width?: number,
    height?: number,
    cdnUrl?: string,
    transformParams?: Record<string, unknown>
  ): Promise<void> {
    const supabase = await this.db();
    await supabase.from('dam_derivatives').upsert(
      { asset_id: assetId, tenant_id: tenantId, derivative_type: derivativeType, storage_path: storagePath, file_size: fileSize, format, width: width ?? null, height: height ?? null, cdn_url: cdnUrl ?? null, transform_params: transformParams ?? null },
      { onConflict: 'asset_id,derivative_type' }
    );
  }
}
