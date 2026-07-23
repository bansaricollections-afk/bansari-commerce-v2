// Sprint 13 — AssetProcessingService
// REPAIR Step 2 (RC#6): Fix multi-column onConflict strings
// Delta only

import type { SupabaseClient } from '@supabase/supabase-js';
import type { DAMProcessingJob, DAMProcessingOperation } from '@/types/dam';

export class AssetProcessingService {
  constructor(private readonly sb: SupabaseClient) {}

  async enqueueProcessing(
    assetId: string,
    tenantId: string,
    operations: string[],
    priority = 5,
  ): Promise<DAMProcessingJob[]> {
    const jobs = operations.map((op) => ({
      asset_id: assetId,
      tenant_id: tenantId,
      operation: op as DAMProcessingOperation,
      status: 'queued',
      priority,
      attempts: 0,
      max_attempts: 3,
      payload: {},
    }));

    const { data, error } = await this.sb
      .from('dam_processing_jobs')
      .insert(jobs)
      .select();

    if (error) throw new Error(`Enqueue processing failed: ${error.message}`);
    return (data ?? []) as DAMProcessingJob[];
  }

  async listJobs(input: {
    tenantId: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: DAMProcessingJob[]; total: number }> {
    const { tenantId, status, page = 1, limit = 20 } = input;
    const offset = (page - 1) * limit;

    let query = this.sb
      .from('dam_processing_jobs')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq('status', status);

    const { data, error, count } = await query;
    if (error) throw new Error(`List jobs failed: ${error.message}`);

    return { data: (data ?? []) as DAMProcessingJob[], total: count ?? 0 };
  }

  async updateJobStatus(
    jobId: string,
    status: DAMProcessingJob['status'],
    result?: Record<string, unknown>,
    errorMessage?: string,
  ): Promise<void> {
    const update: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (status === 'processing') update.started_at = new Date().toISOString();
    if (status === 'completed' || status === 'failed') update.completed_at = new Date().toISOString();
    if (result) update.result = result;
    if (errorMessage) update.error_message = errorMessage;

    const { error } = await this.sb
      .from('dam_processing_jobs')
      .update(update)
      .eq('id', jobId);

    if (error) throw new Error(`Update job status failed: ${error.message}`);
  }

  async getNextPendingJob(tenantId: string): Promise<DAMProcessingJob | null> {
    const { data, error } = await this.sb
      .from('dam_processing_jobs')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'queued')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (error) return null;
    return data as DAMProcessingJob;
  }

  async saveAIAnalysis(
    assetId: string,
    tenantId: string,
    operation: DAMProcessingOperation,
    result: Record<string, unknown>,
    confidence?: number,
    modelVersion?: string,
  ): Promise<void> {
    // REPAIR RC#6: Use insert with ignoreDuplicates instead of multi-column onConflict string
    // The unique constraint is on (asset_id, operation) — we delete existing and re-insert
    await this.sb
      .from('dam_ai_analysis')
      .delete()
      .eq('asset_id', assetId)
      .eq('operation', operation);

    const { error } = await this.sb.from('dam_ai_analysis').insert({
      asset_id: assetId,
      tenant_id: tenantId,
      operation,
      status: 'completed',
      result,
      confidence: confidence ?? null,
      model_version: modelVersion ?? null,
      processed_at: new Date().toISOString(),
    });

    if (error) throw new Error(`Save AI analysis failed: ${error.message}`);
  }
}
